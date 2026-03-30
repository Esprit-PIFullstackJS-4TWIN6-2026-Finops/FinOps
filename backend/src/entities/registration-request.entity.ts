import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { CompanyCategory } from './company.entity';

export enum RegistrationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('registration_requests')
export class RegistrationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({
    name: 'company_category',
    type: 'simple-enum',
    enum: CompanyCategory,
    default: CompanyCategory.OTHER,
  })
  companyCategory: CompanyCategory;

  @Column()
  email: string;

  @Column({ name: 'owner_name' })
  ownerName: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'simple-enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
