import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Company } from './company.entity';

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  ACCOUNTANT = 'accountant',
  CLIENT = 'client',
}

export interface UserNotificationPreferences {
  email?: boolean;
  inApp?: boolean;
  marketing?: boolean;
  security?: boolean;
}

export interface UserPreferences {
  language?: string;
  theme?: 'light' | 'dark';
  timezone?: string;
  dateFormat?: string;
  notifications?: UserNotificationPreferences;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'active_company_id', nullable: true })
  activeCompanyId?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'preferences_json', type: 'simple-json', nullable: true })
  preferences?: UserPreferences;

  @Column({ name: 'must_change_password', default: true })
  mustChangePassword: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verified_at', type: 'datetime', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'pending_email', nullable: true })
  pendingEmail?: string;

  @Exclude()
  @Column({ name: 'email_verification_code_hash', nullable: true })
  emailVerificationCodeHash?: string;

  @Column({
    name: 'email_verification_expires_at',
    type: 'datetime',
    nullable: true,
  })
  emailVerificationExpiresAt?: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Exclude()
  @Column({ name: 'two_factor_secret', type: 'text', nullable: true })
  twoFactorSecret?: string;

  @Exclude()
  @Column({ name: 'two_factor_pending_secret', type: 'text', nullable: true })
  twoFactorPendingSecret?: string;

  @Exclude()
  @Column({ name: 'two_factor_pending_secret_expires_at', type: 'datetime', nullable: true })
  twoFactorPendingSecretExpiresAt?: Date;

  @Column({ name: 'two_factor_credential_id', nullable: true })
  twoFactorCredentialId?: string;

  @Exclude()
  @Column({ name: 'two_factor_credential_public_key', type: 'text', nullable: true })
  twoFactorCredentialPublicKey?: string;

  @Column({ name: 'two_factor_credential_counter', default: 0 })
  twoFactorCredentialCounter: number;

  @Column({ name: 'two_factor_credential_transports_json', type: 'simple-json', nullable: true })
  twoFactorCredentialTransports?: string[];

  @Column({ name: 'two_factor_credential_device_type', nullable: true })
  twoFactorCredentialDeviceType?: string;

  @Column({ name: 'two_factor_credential_backed_up', default: false })
  twoFactorCredentialBackedUp: boolean;

  @Column({ name: 'two_factor_enrolled_at', type: 'datetime', nullable: true })
  twoFactorEnrolledAt?: Date;

  @Column({ name: 'two_factor_last_verified_at', type: 'datetime', nullable: true })
  twoFactorLastVerifiedAt?: Date;

  @Exclude()
  @Column({ name: 'two_factor_challenge', nullable: true })
  twoFactorChallenge?: string;

  @Exclude()
  @Column({ name: 'two_factor_challenge_expires_at', type: 'datetime', nullable: true })
  twoFactorChallengeExpiresAt?: Date;

  @Exclude()
  @Column({ name: 'two_factor_challenge_purpose', nullable: true })
  twoFactorChallengePurpose?: 'registration' | 'authentication';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
