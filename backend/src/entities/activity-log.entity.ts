import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('activity_logs')
@Index('idx_activity_company_date', ['companyId', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @Column({ name: 'actor_user_id' })
  actorUserId: string;

  @Column()
  action: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'metadata_json', type: 'simple-json', nullable: true })
  metadataJson?: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;
}
