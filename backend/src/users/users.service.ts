import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { createHash } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  User,
  UserPreferences,
  UserRole,
} from '../entities/user.entity';
import { Company } from '../entities/company.entity';
import { UserCompanyMembership } from '../entities/user-company-membership.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { MailService } from '../mail/mail.service';
import { EmailValidatorService } from '../mail/email-validator.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { ActivityHistoryQueryDto } from './dto/activity-history.query.dto';
import { ExportUsersQueryDto } from './dto/export-users.query.dto';
import { LockUserDto } from './dto/lock-user.dto';
import { LOGIN_MAX_ATTEMPTS } from '../common/constants';

type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyRole?: string;
  companyId?: string;
  activeCompanyId?: string;
  avatarUrl?: string;
  mustChangePassword: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  pendingEmail?: string;
  lastLoginAt?: Date;
  locked: boolean;
  lockReason?: 'manual' | 'failed_attempts';
  lockedUntil?: Date;
  preferences: UserPreferences;
  twoFactorEnabled: boolean;
  twoFactorEnrolledAt?: Date;
  twoFactorLastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  company?: {
    id: string;
    name: string;
    category: string;
    currency: string;
  };
};

type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyRole?: string;
  companyId?: string;
  activeCompanyId?: string;
  companyName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  locked: boolean;
  lockReason?: 'manual' | 'failed_attempts';
  lockedUntil?: Date;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  membershipIsDefault: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(UserCompanyMembership)
    private readonly membershipRepo: Repository<UserCompanyMembership>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
    private readonly mailService: MailService,
    private readonly emailValidator: EmailValidatorService,
  ) {}

  async getCurrentUser(id: string): Promise<SafeUser> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }
    return this.toSafeUser(user);
  }

  async getCurrentUserPreferences(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }
    return { preferences: user.preferences || {} };
  }

  async updateCurrentUser(id: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    if (dto.name !== undefined) {
      user.name = dto.name.trim();
    }

    if (dto.avatarUrl !== undefined) {
      const nextAvatar =
        dto.avatarUrl.trim() === '' ? undefined : dto.avatarUrl.trim();
      this.removeManagedAvatarFile(user.avatarUrl);
      user.avatarUrl = nextAvatar;
    }

    await this.userRepo.save(user);
    return this.toSafeUser(user);
  }

  async updatePreferences(
    id: string,
    dto: UpdateUserPreferencesDto,
  ): Promise<{ preferences: UserPreferences; user: SafeUser }> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const current = user.preferences || {};
    user.preferences = {
      ...current,
      ...dto,
      notifications: {
        ...(current.notifications || {}),
        ...(dto.notifications || {}),
      },
    };

    await this.userRepo.save(user);
    return {
      preferences: user.preferences,
      user: this.toSafeUser(user),
    };
  }

  async uploadAvatar(
    id: string,
    fileName: string,
    publicBaseUrl: string,
  ): Promise<SafeUser> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    this.removeManagedAvatarFile(user.avatarUrl);
    user.avatarUrl = `${publicBaseUrl}/uploads/avatars/${fileName}`;
    await this.userRepo.save(user);
    return this.toSafeUser(user);
  }

  async requestEmailVerification(
    userId: string,
    dto: RequestEmailVerificationDto,
  ): Promise<{
    message: string;
    targetEmail: string;
    emailSent: boolean;
    previewUrl?: string;
    provider: 'gmail' | 'smtp' | 'ethereal' | 'console';
    codeForDev?: string;
    expiresAt: string;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    let targetEmail = user.email.toLowerCase();
    let isEmailChange = false;

    if (dto.newEmail && dto.newEmail !== user.email.toLowerCase()) {
      const emailCheck = await this.emailValidator.validateEmail(dto.newEmail);
      if (!emailCheck.valid) {
        throw new BadRequestException(
          emailCheck.reason ||
            "L'adresse email n'est pas valide ou n'existe pas reellement.",
        );
      }

      const existing = await this.userRepo.findOne({
        where: { email: dto.newEmail.toLowerCase() },
      });
      if (existing && existing.id !== user.id) {
        throw new ConflictException(
          `Un utilisateur avec l'email "${dto.newEmail}" existe deja.`,
        );
      }

      targetEmail = dto.newEmail.toLowerCase();
      isEmailChange = true;
      user.pendingEmail = targetEmail;
      user.emailVerified = false;
      user.emailVerifiedAt = undefined;
    } else {
      user.pendingEmail = undefined;
    }

    const verificationCode = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.emailVerificationCodeHash = this.hashVerificationCode(verificationCode);
    user.emailVerificationExpiresAt = expiresAt;
    await this.userRepo.save(user);

    const mailResult = await this.mailService.sendEmailVerification(
      targetEmail,
      user.name,
      verificationCode,
      isEmailChange ? 'change_email' : 'verify_email',
    );

    return {
      message: isEmailChange
        ? 'Un code de verification a ete envoye a votre nouvelle adresse email.'
        : 'Un code de verification a ete envoye a votre adresse email.',
      targetEmail,
      emailSent: mailResult.sent,
      previewUrl: mailResult.previewUrl,
      provider: mailResult.provider,
      codeForDev:
        !mailResult.sent && process.env.NODE_ENV !== 'production'
          ? verificationCode
          : undefined,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async confirmEmailVerification(
    userId: string,
    dto: ConfirmEmailVerificationDto,
  ): Promise<{ message: string; user: SafeUser }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      throw new BadRequestException(
        "Aucun code de verification n'est en attente.",
      );
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      user.emailVerificationCodeHash = undefined;
      user.emailVerificationExpiresAt = undefined;
      await this.userRepo.save(user);
      throw new BadRequestException('Le code de verification a expire.');
    }

    const providedHash = this.hashVerificationCode(dto.code);
    if (providedHash !== user.emailVerificationCodeHash) {
      throw new BadRequestException('Le code de verification est invalide.');
    }

    if (user.pendingEmail) {
      const existing = await this.userRepo.findOne({
        where: { email: user.pendingEmail.toLowerCase() },
      });
      if (existing && existing.id !== user.id) {
        throw new ConflictException(
          `Un utilisateur avec l'email "${user.pendingEmail}" existe deja.`,
        );
      }
      user.email = user.pendingEmail.toLowerCase();
      user.pendingEmail = undefined;
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await this.userRepo.save(user);

    return {
      message: 'Adresse email verifiee avec succes.',
      user: this.toSafeUser(user),
    };
  }

  async listUsers(actor: User, query: ListUsersQueryDto) {
    this.assertListAccess(actor);
    const qb = await this.buildUsersQuery(actor, query);
    const page = query.page || 1;
    const limit = query.limit || 20;

    const total = await qb.getCount();
    const { entities, raw } = await qb
      .clone()
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const items = entities.map((user, index) =>
      this.toUserListItem(user, {
        companyRole: raw[index]?.company_role || undefined,
        membershipIsDefault: this.toBoolean(raw[index]?.membership_is_default),
      }),
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async lockUser(actor: User, userId: string, dto: LockUserDto) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    await this.assertCanManageUserSecurity(actor, user);

    const durationMinutes = dto.durationMinutes || 60;
    const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    user.lockedUntil = lockedUntil;
    await this.userRepo.save(user);

    return {
      message: `Le compte a ete verrouille pour ${durationMinutes} minute(s).`,
      lockedUntil,
      user: this.toSafeUser(user),
    };
  }

  async unlockUser(actor: User, userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    await this.assertCanManageUserSecurity(actor, user);

    user.lockedUntil = null as any;
    user.failedLoginAttempts = 0;
    await this.userRepo.save(user);

    return {
      message:
        'Le verrouillage du compte a ete retire et les tentatives de connexion ont ete reinitialisees.',
      user: this.toSafeUser(user),
    };
  }

  async getUserById(actor: User, userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    await this.assertCanAccessUser(actor, user.id);

    let companyRole: string | undefined;
    if (actor.role === UserRole.PLATFORM_ADMIN) {
      companyRole = await this.findMembershipRole(
        user.id,
        user.activeCompanyId || user.companyId,
      );
    } else {
      const managedCompanyId = await this.resolveManagedCompanyId(actor);
      companyRole = await this.findMembershipRole(user.id, managedCompanyId);
    }

    return this.toSafeUser(user, { companyRole });
  }

  async getMyActivity(
    actor: User,
    userId: string,
    query: ActivityHistoryQueryDto,
  ) {
    await this.assertCanAccessUser(actor, userId);

    const qb = this.activityLogRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor')
      .where('activity.actorUserId = :userId', { userId })
      .orderBy('activity.createdAt', 'DESC');

    if (actor.role !== UserRole.PLATFORM_ADMIN && actor.id !== userId) {
      const managedCompanyId = await this.resolveManagedCompanyId(actor);
      qb.andWhere('activity.companyId = :companyId', {
        companyId: managedCompanyId,
      });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = await qb.getCount();
    const items = await qb
      .clone()
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return this.toActivityHistory(items, page, limit, total);
  }

  async getUserActivity(
    actor: User,
    userId: string,
    query: ActivityHistoryQueryDto,
  ) {
    await this.assertCanAccessUser(actor, userId);

    const qb = this.activityLogRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor')
      .where(
        new Brackets((activityScope) => {
          activityScope
            .where(
              `activity.actorUserId = :userId
               AND activity.entityType IN (:...accountEntityTypes)`,
              {
                userId,
                accountEntityTypes: ['users', 'auth', 'notifications'],
              },
            )
            .orWhere(
              `activity.entityType = :userEntityType
               AND activity.entityId = :userId`,
              {
                userEntityType: 'users',
                userId,
              },
            );
        }),
      )
      .orderBy('activity.createdAt', 'DESC');

    if (actor.role !== UserRole.PLATFORM_ADMIN && actor.id !== userId) {
      const managedCompanyId = await this.resolveManagedCompanyId(actor);
      qb.andWhere('activity.companyId = :companyId', {
        companyId: managedCompanyId,
      });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = await qb.getCount();
    const items = await qb
      .clone()
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return this.toActivityHistory(items, page, limit, total);
  }

  async exportUsers(actor: User, query: ExportUsersQueryDto) {
    if (actor.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur plateforme peut exporter les utilisateurs.',
      );
    }

    const qb = await this.buildUsersQuery(actor, query);
    const { entities, raw } = await qb
      .clone()
      .take(5000)
      .getRawAndEntities();

    const rows = entities.map((user, index) =>
      this.toUserListItem(user, {
        companyRole: raw[index]?.company_role || undefined,
        membershipIsDefault: this.toBoolean(raw[index]?.membership_is_default),
      }),
    );

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    if (query.format === 'excel') {
      return {
        fileName: `users-${timestamp}.xls`,
        contentType: 'application/vnd.ms-excel; charset=utf-8',
        content: this.buildExcelDocument(rows),
      };
    }

    return {
      fileName: `users-${timestamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
      content: this.buildCsv(rows),
    };
  }

  async getUserStats(actor: User) {
    if (actor.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur plateforme peut consulter ces statistiques.',
      );
    }

    const now = new Date();
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, lockedUsers, verifiedUsers, usersByRoleRaw] =
      await Promise.all([
        this.userRepo.count(),
        this.userRepo
          .createQueryBuilder('user')
          .where('user.lastLoginAt IS NOT NULL')
          .andWhere('user.lastLoginAt >= :activeSince', { activeSince })
          .getCount(),
        this.userRepo
          .createQueryBuilder('user')
          .where(
            new Brackets((subQb) => {
              subQb
                .where('user.lockedUntil IS NOT NULL')
                .andWhere('user.lockedUntil > :now', { now })
                .orWhere('user.failedLoginAttempts >= :maxAttempts', {
                  maxAttempts: LOGIN_MAX_ATTEMPTS,
                });
            }),
          )
          .getCount(),
        this.userRepo.count({ where: { emailVerified: true } }),
        this.userRepo
          .createQueryBuilder('user')
          .select('user.role', 'role')
          .addSelect('COUNT(*)', 'count')
          .groupBy('user.role')
          .getRawMany<{ role: string; count: string }>(),
      ]);

    return {
      totalUsers,
      activeUsers,
      lockedUsers,
      verifiedUsers,
      windowDays: 30,
      usersByRole: usersByRoleRaw.map((row) => ({
        role: row.role,
        count: Number(row.count),
      })),
    };
  }

  private async buildUsersQuery(
    actor: User,
    query: ListUsersQueryDto,
  ): Promise<SelectQueryBuilder<User>> {
    const scopedCompanyId = await this.resolveCompanyScopeForListing(
      actor,
      query.companyId,
    );
    const now = new Date();

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .distinct(true);

    if (scopedCompanyId) {
      qb.innerJoin(
        UserCompanyMembership,
        'membership',
        'membership.userId = user.id AND membership.companyId = :scopedCompanyId',
        { scopedCompanyId },
      )
        .innerJoin('membership.role', 'membershipRole')
        .addSelect('membershipRole.code', 'company_role')
        .addSelect('membership.isDefault', 'membership_is_default');

      if (query.role) {
        qb.andWhere('membershipRole.code = :role', { role: query.role });
      }
    } else if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(user.name) LIKE :search', { search })
            .orWhere('LOWER(user.email) LIKE :search', { search })
            .orWhere('LOWER(company.name) LIKE :search', { search });
        }),
      );
    }

    if (query.emailVerified !== undefined) {
      qb.andWhere('user.emailVerified = :emailVerified', {
        emailVerified: query.emailVerified,
      });
    }

    if (query.locked !== undefined) {
      if (query.locked) {
        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('user.lockedUntil IS NOT NULL')
              .andWhere('user.lockedUntil > :now', { now })
              .orWhere('user.failedLoginAttempts >= :maxAttempts', {
                maxAttempts: LOGIN_MAX_ATTEMPTS,
              });
          }),
        );
      } else {
        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('user.lockedUntil IS NULL')
              .orWhere('user.lockedUntil <= :now', { now });
          }),
        ).andWhere('user.failedLoginAttempts < :maxAttempts', {
          maxAttempts: LOGIN_MAX_ATTEMPTS,
        });
      }
    }

    const sortOrder = (query.sortOrder || 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';
    switch (query.sortBy) {
      case 'name':
        qb.orderBy('user.name', sortOrder);
        break;
      case 'email':
        qb.orderBy('user.email', sortOrder);
        break;
      case 'lastLoginAt':
        qb.orderBy('user.lastLoginAt', sortOrder);
        break;
      case 'role':
        qb.orderBy(
          scopedCompanyId ? 'membershipRole.code' : 'user.role',
          sortOrder,
        );
        break;
      case 'createdAt':
      default:
        qb.orderBy('user.createdAt', sortOrder);
        break;
    }

    return qb;
  }

  private async resolveCompanyScopeForListing(
    actor: User,
    requestedCompanyId?: string,
  ): Promise<string | undefined> {
    if (actor.role === UserRole.PLATFORM_ADMIN) {
      return requestedCompanyId?.trim() || undefined;
    }
    return this.resolveManagedCompanyId(actor);
  }

  private async resolveManagedCompanyId(actor: User): Promise<string> {
    const companyId = actor.activeCompanyId || actor.companyId;
    if (!companyId) {
      throw new ForbiddenException(
        "Aucune entreprise active n'est associee a cet utilisateur.",
      );
    }

    if (actor.role === UserRole.OWNER) {
      const ownsCompany = await this.companyRepo.exists({
        where: { id: companyId, ownerId: actor.id },
      });
      if (ownsCompany) {
        return companyId;
      }
    }

    if (actor.role === UserRole.MANAGER && actor.companyId === companyId) {
      return companyId;
    }

    const membershipRole = await this.findMembershipRole(actor.id, companyId);
    if (
      membershipRole === UserRole.OWNER ||
      membershipRole === UserRole.MANAGER
    ) {
      return companyId;
    }

    throw new ForbiddenException(
      "Vous n'avez pas les droits pour consulter cette liste d'utilisateurs.",
    );
  }

  private async assertCanAccessUser(actor: User, targetUserId: string) {
    if (actor.id === targetUserId || actor.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    const managedCompanyId = await this.resolveManagedCompanyId(actor);
    const hasMembership = await this.membershipRepo.exists({
      where: { userId: targetUserId, companyId: managedCompanyId },
    });
    if (hasMembership) {
      return;
    }

    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
      select: ['id', 'companyId'],
    });
    if (targetUser?.companyId === managedCompanyId) {
      return;
    }

    throw new ForbiddenException(
      "Vous n'avez pas acces a cet utilisateur.",
    );
  }

  private toActivityHistory(
    items: ActivityLog[],
    page: number,
    limit: number,
    total: number,
  ) {
    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        companyId: item.companyId,
        ipAddress: item.ipAddress,
        createdAt: item.createdAt,
        metadata: item.metadataJson || {},
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
      },
    };
  }

  private async assertCanManageUserSecurity(
    actor: User,
    targetUser: User,
  ) {
    if (targetUser.role === UserRole.PLATFORM_ADMIN) {
      if (actor.role !== UserRole.PLATFORM_ADMIN) {
        throw new ForbiddenException(
          "Vous ne pouvez pas modifier le verrouillage d'un administrateur plateforme.",
        );
      }
      if (actor.id === targetUser.id) {
        throw new BadRequestException(
          'Vous ne pouvez pas modifier le verrouillage de votre propre compte.',
        );
      }
      return;
    }

    if (actor.id === targetUser.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier le verrouillage de votre propre compte.',
      );
    }

    if (actor.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    if (actor.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        "Seul l'administrateur plateforme ou le proprietaire de l'entreprise peut debloquer ce compte.",
      );
    }

    const managedCompanyId = await this.resolveManagedCompanyId(actor);
    const hasMembership = await this.membershipRepo.exists({
      where: { userId: targetUser.id, companyId: managedCompanyId },
    });
    const isLegacyCompanyUser = targetUser.companyId === managedCompanyId;

    if (!hasMembership && !isLegacyCompanyUser) {
      throw new ForbiddenException(
        "Vous ne pouvez gerer que les utilisateurs de votre entreprise active.",
      );
    }

    const targetScopedRole =
      (await this.findMembershipRole(targetUser.id, managedCompanyId)) ||
      targetUser.role;

    if (targetScopedRole === UserRole.OWNER) {
      throw new ForbiddenException(
        "Seul un administrateur plateforme peut debloquer un business owner.",
      );
    }
  }

  private assertListAccess(actor: User) {
    if (
      actor.role !== UserRole.PLATFORM_ADMIN &&
      actor.role !== UserRole.OWNER &&
      actor.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits pour consulter cette liste d'utilisateurs.",
      );
    }
  }

  private async findMembershipRole(
    userId: string,
    companyId?: string,
  ): Promise<string | undefined> {
    if (!companyId) {
      return undefined;
    }

    const raw = await this.membershipRepo
      .createQueryBuilder('membership')
      .innerJoin('membership.role', 'role')
      .select('role.code', 'roleCode')
      .where('membership.userId = :userId', { userId })
      .andWhere('membership.companyId = :companyId', { companyId })
      .getRawOne<{ roleCode?: string }>();

    return raw?.roleCode;
  }

  private toSafeUser(
    user: User,
    extra: { companyRole?: string } = {},
  ): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyRole: extra.companyRole,
      companyId: user.companyId,
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
        this.isTemporarilyLocked(user)
          ? user.lockedUntil
          : undefined,
      preferences: user.preferences || {},
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorEnrolledAt: user.twoFactorEnrolledAt,
      twoFactorLastVerifiedAt: user.twoFactorLastVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
            category: user.company.category,
            currency: user.company.currency,
          }
        : undefined,
    };
  }

  private toUserListItem(
    user: User,
    extra: { companyRole?: string; membershipIsDefault?: boolean } = {},
  ): UserListItem {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyRole: extra.companyRole,
      companyId: user.companyId,
      activeCompanyId: user.activeCompanyId,
      companyName: user.company?.name,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      locked: this.isUserLocked(user),
      lockReason: this.getUserLockReason(user),
      lockedUntil: this.isTemporarilyLocked(user) ? user.lockedUntil : undefined,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      membershipIsDefault: extra.membershipIsDefault ?? false,
    };
  }

  private isLockedByFailedAttempts(user: User) {
    return (user.failedLoginAttempts || 0) >= LOGIN_MAX_ATTEMPTS;
  }

  private isTemporarilyLocked(user: User) {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  }

  private isUserLocked(user: User) {
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

  private buildCsv(items: UserListItem[]) {
    const headers = [
      'id',
      'name',
      'email',
      'role',
      'companyRole',
      'companyId',
      'activeCompanyId',
      'companyName',
      'emailVerified',
      'locked',
      'mustChangePassword',
      'lastLoginAt',
      'createdAt',
    ];

    const rows = items.map((item) =>
      [
        item.id,
        item.name,
        item.email,
        item.role,
        item.companyRole || '',
        item.companyId || '',
        item.activeCompanyId || '',
        item.companyName || '',
        String(item.emailVerified),
        String(item.locked),
        String(item.mustChangePassword),
        item.lastLoginAt?.toISOString() || '',
        item.createdAt?.toISOString() || '',
      ]
        .map((value) => this.escapeCsv(String(value ?? '')))
        .join(','),
    );

    return `\uFEFF${[headers.join(','), ...rows].join('\n')}`;
  }

  private buildExcelDocument(items: UserListItem[]) {
    const headerCells = [
      'ID',
      'Name',
      'Email',
      'Role',
      'Company Role',
      'Company ID',
      'Active Company ID',
      'Company Name',
      'Email Verified',
      'Locked',
      'Must Change Password',
      'Last Login At',
      'Created At',
    ]
      .map((header) => `<th>${this.escapeHtml(header)}</th>`)
      .join('');

    const bodyRows = items
      .map(
        (item) => `
          <tr>
            <td>${this.escapeHtml(item.id)}</td>
            <td>${this.escapeHtml(item.name)}</td>
            <td>${this.escapeHtml(item.email)}</td>
            <td>${this.escapeHtml(item.role)}</td>
            <td>${this.escapeHtml(item.companyRole || '')}</td>
            <td>${this.escapeHtml(item.companyId || '')}</td>
            <td>${this.escapeHtml(item.activeCompanyId || '')}</td>
            <td>${this.escapeHtml(item.companyName || '')}</td>
            <td>${this.escapeHtml(String(item.emailVerified))}</td>
            <td>${this.escapeHtml(String(item.locked))}</td>
            <td>${this.escapeHtml(String(item.mustChangePassword))}</td>
            <td>${this.escapeHtml(item.lastLoginAt?.toISOString() || '')}</td>
            <td>${this.escapeHtml(item.createdAt?.toISOString() || '')}</td>
          </tr>
        `,
      )
      .join('');

    return `\uFEFF<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  }

  private escapeCsv(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateVerificationCode() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private hashVerificationCode(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  private removeManagedAvatarFile(avatarUrl?: string) {
    if (!avatarUrl) {
      return;
    }

    let pathName = avatarUrl;
    try {
      pathName = new URL(avatarUrl).pathname;
    } catch {
      pathName = avatarUrl;
    }

    const normalized = pathName.replace(/^\/+/, '');
    if (!normalized.startsWith('uploads/avatars/')) {
      return;
    }

    const filePath = join(process.cwd(), normalized);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  private toBoolean(value: unknown) {
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
    return false;
  }
}
