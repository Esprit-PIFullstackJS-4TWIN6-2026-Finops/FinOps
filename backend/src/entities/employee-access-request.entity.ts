import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user.entity';

export enum EmployeeAccessRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('employee_access_requests')
export class EmployeeAccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  email: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({
    name: 'desired_role',
    type: 'simple-enum',
    enum: [UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT],
    default: UserRole.EMPLOYEE,
  })
  desiredRole: UserRole.MANAGER | UserRole.EMPLOYEE | UserRole.ACCOUNTANT;

  @Column({
    type: 'simple-enum',
    enum: EmployeeAccessRequestStatus,
    default: EmployeeAccessRequestStatus.PENDING,
  })
  status: EmployeeAccessRequestStatus;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
