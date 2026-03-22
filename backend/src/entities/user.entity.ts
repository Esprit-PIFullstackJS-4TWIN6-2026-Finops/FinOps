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

  @Column({ name: 'must_change_password', default: true })
  mustChangePassword: boolean;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
