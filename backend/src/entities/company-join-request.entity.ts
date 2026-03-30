import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User, UserRole } from './user.entity';
import { Company } from './company.entity';

export enum CompanyJoinRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('company_join_requests')
@Index('idx_join_requests_company_status', ['companyId', 'status'])
export class CompanyJoinRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requester_user_id' })
  requesterUserId: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({
    name: 'desired_role',
    type: 'simple-enum',
    enum: [UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT],
    default: UserRole.EMPLOYEE,
  })
  desiredRole: UserRole.MANAGER | UserRole.EMPLOYEE | UserRole.ACCOUNTANT;

  @Column({ name: 'profile_details', type: 'text', nullable: true })
  profileDetails?: string;

  @Column({
    type: 'simple-enum',
    enum: CompanyJoinRequestStatus,
    default: CompanyJoinRequestStatus.PENDING,
  })
  status: CompanyJoinRequestStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'processed_by_user_id', nullable: true })
  processedByUserId?: string;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_user_id' })
  requesterUser: User;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
