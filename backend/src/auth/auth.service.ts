import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_SECONDS } from '../common/constants';
import { MailService } from '../mail/mail.service';
import { EmailValidatorService } from '../mail/email-validator.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
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

  async login(dto: LoginDto): Promise<{
    user: Partial<User>;
    token: string;
    mustChangePassword: boolean;
  }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000,
      );
      throw new UnauthorizedException(
        `Compte temporairement bloque. Reessayez dans ${remaining} secondes.`,
      );
    }

    if (user.lockedUntil && new Date() >= user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null as any;
      await this.userRepo.save(user);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!valid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setSeconds(lockUntil.getSeconds() + LOGIN_LOCKOUT_SECONDS);
        user.lockedUntil = lockUntil;
        await this.userRepo.save(user);
        throw new UnauthorizedException(
          `Compte temporairement bloque. Reessayez dans ${LOGIN_LOCKOUT_SECONDS} secondes.`,
        );
      }
      await this.userRepo.save(user);
      throw new UnauthorizedException('Identifiants invalides');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null as any;
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.activeCompanyId || user.companyId,
    };
    const token = this.jwtService.sign(payload);

    return {
      user: this.buildSafeAuthUser(user),
      token,
      mustChangePassword: user.mustChangePassword,
    };
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

  private buildSafeAuthUser(user: User): Partial<User> {
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
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      company: user.company,
    };
  }
}
