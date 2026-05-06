import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { Company } from '../entities/company.entity';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LOGIN_MAX_ATTEMPTS } from '../common/constants';
import { MailService } from '../mail/mail.service';
import { EmailValidatorService } from '../mail/email-validator.service';
import {
  buildTotpOtpauthUrl,
  decryptTotpSecret,
  encryptTotpSecret,
  generateBase32Secret,
  sanitizeTotpCode,
  verifyTotpCode,
} from './totp.util';

const TWO_FACTOR_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TWO_FACTOR_SETUP_TTL_MS = 10 * 60 * 1000;

type SafeAuthUser = Partial<User> & {
  locked: boolean;
  lockReason?: 'manual' | 'failed_attempts';
};

type LoginSuccessResponse = {
  requiresTwoFactor: false;
  user: SafeAuthUser;
  token: string;
  mustChangePassword: boolean;
};

type LoginChallengeResponse = {
  requiresTwoFactor: true;
  twoFactor: {
    userId: string;
    email: string;
    name: string;
    method: 'totp';
    expiresAt: string;
  };
};

type LoginResponse = LoginSuccessResponse | LoginChallengeResponse;

type TwoFactorSetupResponse = {
  qrCodeDataUrl: string;
  manualEntryKey: string;
  otpauthUrl: string;
  issuer: string;
  accountLabel: string;
  expiresAt: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    private jwtService: JwtService,
    private mailService: MailService,
    private emailValidator: EmailValidatorService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
      relations: ['company'],
    });
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException(
        await this.buildLockedAccountMessage(user, 'manual'),
      );
    }

    if (user.lockedUntil && new Date() >= user.lockedUntil) {
      user.lockedUntil = null as any;
      await this.userRepo.save(user);
    }

    if (this.isLockedByFailedAttempts(user)) {
      throw new UnauthorizedException(
        await this.buildLockedAccountMessage(user, 'failed_attempts'),
      );
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!valid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.failedLoginAttempts = LOGIN_MAX_ATTEMPTS;
        await this.userRepo.save(user);
        throw new UnauthorizedException(
          await this.buildLockedAccountMessage(user, 'failed_attempts'),
        );
      }
      await this.userRepo.save(user);
      throw new UnauthorizedException('Identifiants invalides');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null as any;

    if (user.twoFactorEnabled) {
      if (!this.hasConfiguredTwoFactor(user)) {
        throw new BadRequestException(
          'Authenticator app 2FA is incomplete for this account. Disable it from an existing session, then try again.',
        );
      }

      this.storeTwoFactorChallenge(
        user,
        this.generateTwoFactorChallenge(),
        'authentication',
      );
      await this.userRepo.save(user);

      return {
        requiresTwoFactor: true,
        twoFactor: {
          userId: user.id,
          email: user.email,
          name: user.name,
          method: 'totp',
          expiresAt: user.twoFactorChallengeExpiresAt!.toISOString(),
        },
      };
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return this.buildLoginSuccess(user);
  }

  async beginTwoFactorSetup(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.findByIdOrThrow(userId);

    if (user.twoFactorEnabled && this.hasConfiguredTwoFactor(user)) {
      throw new BadRequestException(
        'Authenticator app 2FA is already enabled for this account.',
      );
    }

    const secret = generateBase32Secret();
    user.twoFactorPendingSecret = encryptTotpSecret(
      secret,
      this.getTwoFactorEncryptionKey(),
    );
    user.twoFactorPendingSecretExpiresAt = new Date(
      Date.now() + TWO_FACTOR_SETUP_TTL_MS,
    );
    this.clearTwoFactorChallenge(user);

    await this.userRepo.save(user);

    const issuer = this.getTotpIssuer();
    const otpauthUrl = buildTotpOtpauthUrl({
      issuer,
      accountName: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 220,
    });

    return {
      qrCodeDataUrl,
      manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret,
      otpauthUrl,
      issuer,
      accountLabel: user.email,
      expiresAt: user.twoFactorPendingSecretExpiresAt.toISOString(),
    };
  }

  async completeTwoFactorSetup(
    userId: string,
    code: string,
  ): Promise<{ message: string; user: SafeAuthUser }> {
    const user = await this.findByIdOrThrow(userId);
    const pendingSecret = this.getValidPendingTwoFactorSecret(user);

    if (!verifyTotpCode(pendingSecret, code)) {
      throw new UnauthorizedException(
        'The verification code from your authenticator app is invalid or expired.',
      );
    }

    user.twoFactorEnabled = true;
    user.twoFactorSecret = encryptTotpSecret(
      pendingSecret,
      this.getTwoFactorEncryptionKey(),
    );
    user.twoFactorEnrolledAt = new Date();
    user.twoFactorLastVerifiedAt = undefined;
    this.clearPendingTwoFactorSetup(user);
    this.clearTwoFactorChallenge(user);
    this.clearLegacyTwoFactorCredential(user);

    await this.userRepo.save(user);

    return {
      message: 'Authenticator app 2FA is now enabled for this account.',
      user: this.buildSafeAuthUser(user),
    };
  }

  async disableTwoFactor(
    userId: string,
  ): Promise<{ message: string; user: SafeAuthUser }> {
    const user = await this.findByIdOrThrow(userId);

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null as any;
    user.twoFactorEnrolledAt = null as any;
    user.twoFactorLastVerifiedAt = null as any;
    this.clearPendingTwoFactorSetup(user);
    this.clearTwoFactorChallenge(user);
    this.clearLegacyTwoFactorCredential(user);

    await this.userRepo.save(user);

    return {
      message: 'Authenticator app 2FA has been disabled.',
      user: this.buildSafeAuthUser(user),
    };
  }

  async verifyTwoFactorLogin(
    userId: string,
    code: string,
  ): Promise<LoginSuccessResponse> {
    const user = await this.findByIdOrThrow(userId);

    if (!this.hasConfiguredTwoFactor(user)) {
      throw new UnauthorizedException(
        'No authenticator app is configured for this account.',
      );
    }

    this.getValidTwoFactorChallenge(user, 'authentication');

    const secret = decryptTotpSecret(
      user.twoFactorSecret!,
      this.getTwoFactorEncryptionKey(),
    );

    if (!verifyTotpCode(secret, code)) {
      throw new UnauthorizedException(
        'The verification code from your authenticator app is invalid or expired.',
      );
    }

    user.lastLoginAt = new Date();
    user.twoFactorLastVerifiedAt = user.lastLoginAt;
    this.clearTwoFactorChallenge(user);

    await this.userRepo.save(user);

    return this.buildLoginSuccess(user);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Utilisateur non trouve');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepo.save(user);
    return { success: true };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['company'],
    });
  }

  async createUser(
    email: string,
    password: string,
    name: string,
    role: UserRole,
    companyId: string,
    mustChangePassword = true,
  ): Promise<User> {
    const hash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      email: email.toLowerCase(),
      passwordHash: hash,
      name,
      role,
      companyId,
      activeCompanyId: companyId,
      mustChangePassword,
      emailVerified: false,
      twoFactorEnabled: false,
    });
    return this.userRepo.save(user);
  }

  generateTempPassword(): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    result += chars.charAt(Math.floor(Math.random() * 26));
    result += chars.charAt(26 + Math.floor(Math.random() * 26));
    result += chars.charAt(52 + Math.floor(Math.random() * 8));
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.split('').sort(() => Math.random() - 0.5).join('');
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{
    message: string;
    emailSent: boolean;
    previewUrl?: string;
    provider: 'gmail' | 'smtp' | 'ethereal' | 'console';
    tempPasswordForDev?: string;
  }> {
    const email = dto.email.toLowerCase().trim();

    const emailCheck = await this.emailValidator.validateEmail(email);
    if (!emailCheck.valid) {
      throw new BadRequestException(
        emailCheck.reason ||
          "L'adresse email n'est pas valide ou n'existe pas reellement.",
      );
    }

    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['company'],
    });

    if (!user) {
      throw new BadRequestException(
        "Aucun compte n'est associe a cet email. Verifiez l'adresse ou inscrivez-vous.",
      );
    }

    const tempPassword = this.generateTempPassword();
    user.passwordHash = await bcrypt.hash(tempPassword, 10);
    user.mustChangePassword = true;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null as any;
    this.clearPendingTwoFactorSetup(user);
    this.clearTwoFactorChallenge(user);
    await this.userRepo.save(user);

    const result = await this.mailService.sendPasswordReset(
      email,
      user.name,
      tempPassword,
    );

    console.log('');
    console.log(
      '===============================================',
    );
    console.log('  MOT DE PASSE REINITIALISE');
    console.log('-----------------------------------------------');
    console.log(`  Email : ${email}`);
    console.log(`  Nouveau mot de passe : ${tempPassword}`);
    console.log("  (L'utilisateur devra le changer)");
    console.log(
      '===============================================',
    );
    console.log('');

    return {
      message: result.sent
        ? 'Un email contenant votre nouveau mot de passe temporaire a ete envoye.'
        : 'Le mot de passe a ete reinitialise. Verifiez la console du serveur pour le nouveau mot de passe.',
      emailSent: result.sent,
      previewUrl: result.previewUrl,
      provider: result.provider,
      tempPasswordForDev:
        !result.sent && process.env.NODE_ENV !== 'production'
          ? tempPassword
          : undefined,
    };
  }

  private async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouve');
    }
    return user;
  }

  private buildLoginSuccess(user: User): LoginSuccessResponse {
    return {
      requiresTwoFactor: false,
      user: this.buildSafeAuthUser(user),
      token: this.issueLoginToken(user),
      mustChangePassword: user.mustChangePassword,
    };
  }

  private issueLoginToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.activeCompanyId || user.companyId,
    };
    return this.jwtService.sign(payload);
  }

  private buildSafeAuthUser(user: User): SafeAuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.activeCompanyId || user.companyId,
      activeCompanyId: user.activeCompanyId,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      pendingEmail: user.pendingEmail,
      lastLoginAt: user.lastLoginAt,
      locked: this.isUserLocked(user),
      lockReason: this.getUserLockReason(user),
      lockedUntil:
        user.lockedUntil && user.lockedUntil.getTime() > Date.now()
          ? user.lockedUntil
          : undefined,
      preferences: user.preferences,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorEnrolledAt: user.twoFactorEnrolledAt,
      twoFactorLastVerifiedAt: user.twoFactorLastVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      company: user.company,
    };
  }

  private hasConfiguredTwoFactor(user: User): boolean {
    return !!(user.twoFactorEnabled && user.twoFactorSecret);
  }

  private isLockedByFailedAttempts(user: User): boolean {
    return (user.failedLoginAttempts || 0) >= LOGIN_MAX_ATTEMPTS;
  }

  private isTemporarilyLocked(user: User): boolean {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  }

  private isUserLocked(user: User): boolean {
    return this.isTemporarilyLocked(user) || this.isLockedByFailedAttempts(user);
  }

  private getUserLockReason(
    user: User,
  ): 'manual' | 'failed_attempts' | undefined {
    if (this.isTemporarilyLocked(user)) {
      return 'manual';
    }
    if (this.isLockedByFailedAttempts(user)) {
      return 'failed_attempts';
    }
    return undefined;
  }

  private async buildLockedAccountMessage(
    user: User,
    reason: 'manual' | 'failed_attempts',
  ): Promise<string> {
    const contactText = await this.buildLockContactInstruction(user);

    if (reason === 'manual') {
      return `Compte verrouille.${contactText}`;
    }

    return `Compte bloque apres ${LOGIN_MAX_ATTEMPTS} tentatives incorrectes.${contactText}`;
  }

  private async buildLockContactInstruction(user: User): Promise<string> {
    const adminEmail = await this.getPlatformAdminContactEmail(user.id);

    if (user.role !== UserRole.OWNER && user.role !== UserRole.PLATFORM_ADMIN) {
      const ownerEmail = await this.getCompanyOwnerContactEmail(user);
      if (adminEmail && ownerEmail && adminEmail !== ownerEmail) {
        return ` Contactez l'administrateur a ${adminEmail} ou le proprietaire de l'entreprise a ${ownerEmail} pour faire debloquer le compte.`;
      }
      if (ownerEmail) {
        return ` Contactez le proprietaire de l'entreprise a ${ownerEmail} pour faire debloquer le compte.`;
      }
    }

    if (adminEmail) {
      return ` Contactez l'administrateur a ${adminEmail} pour faire debloquer le compte.`;
    }

    return " Contactez l'administrateur pour faire debloquer le compte.";
  }

  private async getPlatformAdminContactEmail(
    excludedUserId?: string,
  ): Promise<string | undefined> {
    const configuredContact =
      process.env.ACCOUNT_LOCK_CONTACT_EMAIL?.trim() ||
      process.env.SUPPORT_EMAIL?.trim() ||
      process.env.ADMIN_CONTACT_EMAIL?.trim();

    if (configuredContact) {
      return configuredContact;
    }

    return (await this.findPlatformAdminContactEmail(excludedUserId)) || 'admin@finops.com';
  }

  private async getCompanyOwnerContactEmail(
    user: User,
  ): Promise<string | undefined> {
    let ownerId = user.company?.ownerId;
    const companyId = user.activeCompanyId || user.companyId || user.company?.id;

    if (!ownerId && companyId) {
      const company = await this.companyRepo.findOne({
        where: { id: companyId },
        select: ['id', 'ownerId'],
      });
      ownerId = company?.ownerId;
    }

    if (!ownerId || ownerId === user.id) {
      return undefined;
    }

    const owner = await this.userRepo.findOne({
      where: { id: ownerId },
      select: ['id', 'email'],
    });
    return owner?.email;
  }

  private async findPlatformAdminContactEmail(
    excludedUserId?: string,
  ): Promise<string | undefined> {
    const admins = await this.userRepo.find({
      where: { role: UserRole.PLATFORM_ADMIN },
      select: ['id', 'email'],
      order: { createdAt: 'ASC' },
      take: 5,
    });

    const preferred = admins.find((admin) => admin.id !== excludedUserId);
    return preferred?.email;
  }

  private getValidPendingTwoFactorSecret(user: User): string {
    if (!user.twoFactorPendingSecret || !user.twoFactorPendingSecretExpiresAt) {
      throw new BadRequestException(
        'No active authenticator app setup was found. Start setup again to get a new QR code.',
      );
    }

    if (user.twoFactorPendingSecretExpiresAt.getTime() < Date.now()) {
      this.clearPendingTwoFactorSetup(user);
      throw new BadRequestException(
        'The QR code setup window expired. Start the setup again to get a fresh code.',
      );
    }

    return decryptTotpSecret(
      user.twoFactorPendingSecret,
      this.getTwoFactorEncryptionKey(),
    );
  }

  private generateTwoFactorChallenge(): string {
    return randomBytes(24).toString('base64url');
  }

  private storeTwoFactorChallenge(
    user: User,
    challenge: string,
    purpose: 'registration' | 'authentication',
  ) {
    user.twoFactorChallenge = challenge;
    user.twoFactorChallengePurpose = purpose;
    user.twoFactorChallengeExpiresAt = new Date(
      Date.now() + TWO_FACTOR_CHALLENGE_TTL_MS,
    );
  }

  private getValidTwoFactorChallenge(
    user: User,
    purpose: 'registration' | 'authentication',
  ): string {
    if (
      !user.twoFactorChallenge ||
      !user.twoFactorChallengeExpiresAt ||
      !user.twoFactorChallengePurpose
    ) {
      throw new BadRequestException(
        'No active 2FA verification session was found. Sign in again to get a new code prompt.',
      );
    }

    if (user.twoFactorChallengePurpose !== purpose) {
      this.clearTwoFactorChallenge(user);
      throw new BadRequestException(
        'The active 2FA verification session does not match this action. Sign in again and retry.',
      );
    }

    if (user.twoFactorChallengeExpiresAt.getTime() < Date.now()) {
      this.clearTwoFactorChallenge(user);
      throw new BadRequestException(
        'The 2FA verification session expired. Sign in again to continue.',
      );
    }

    return user.twoFactorChallenge;
  }

  private clearPendingTwoFactorSetup(user: User) {
    user.twoFactorPendingSecret = null as any;
    user.twoFactorPendingSecretExpiresAt = null as any;
  }

  private clearTwoFactorChallenge(user: User) {
    user.twoFactorChallenge = null as any;
    user.twoFactorChallengePurpose = null as any;
    user.twoFactorChallengeExpiresAt = null as any;
  }

  private clearLegacyTwoFactorCredential(user: User) {
    user.twoFactorCredentialId = null as any;
    user.twoFactorCredentialPublicKey = null as any;
    user.twoFactorCredentialCounter = 0;
    user.twoFactorCredentialTransports = null as any;
    user.twoFactorCredentialDeviceType = null as any;
    user.twoFactorCredentialBackedUp = false;
  }

  private getTwoFactorEncryptionKey(): string {
    return (
      process.env.TWO_FACTOR_ENCRYPTION_KEY?.trim() ||
      process.env.JWT_SECRET ||
      process.env.JWT_SECRET_KEY ||
      process.env.APP_SECRET ||
      'finops-local-two-factor-development-key'
    );
  }

  private getTotpIssuer(): string {
    return process.env.TOTP_ISSUER?.trim() || 'FinOps SaaS Platform';
  }
}
