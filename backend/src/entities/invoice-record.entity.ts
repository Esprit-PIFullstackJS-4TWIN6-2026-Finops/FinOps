import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Company } from './company.entity';

@Entity('invoices')
@Index('idx_invoices_company', ['companyId'])
@Index('idx_invoices_client', ['clientId'])
export class InvoiceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column()
  number: string;

  @Column({ name: 'client_name' })
  clientName: string;

  @Column({ name: 'client_email', nullable: true })
  clientEmail?: string;

  @Column({ name: 'client_id', type: 'char', length: 36, nullable: true })
  clientId?: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 32, default: 'Draft' })
  status: string;

  @Column({ name: 'ninja_invoice_id', nullable: true })
  ninjaInvoiceId?: string;

  /** Ninja client id used for this invoice (ad-hoc invoices may only store this here). */
  @Column({ name: 'ninja_client_id', nullable: true })
  ninjaClientId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_id' })
  linkedClient?: Client;
}
