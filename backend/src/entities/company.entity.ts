import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum CompanyCategory {
  TECHNOLOGY = 'technology',
  RETAIL = 'retail',
  SERVICES = 'services',
  MANUFACTURING = 'manufacturing',
  CONSTRUCTION = 'construction',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  OTHER = 'other',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'owner_id', nullable: true })
  ownerId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @Column({
    type: 'simple-enum',
    enum: CompanyCategory,
    default: CompanyCategory.OTHER,
  })
  category: CompanyCategory;

  @Column({ nullable: true })
  logo?: string;

  @Column({ name: 'matricule_fiscal', nullable: true })
  matriculeFiscal?: string;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => User, (user) => user.company)
  users: User[];
}
