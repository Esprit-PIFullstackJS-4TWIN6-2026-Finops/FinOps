import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InvoiceRecord)
    private readonly repo: Repository<InvoiceRecord>,
  ) {}

  private companyId(user: User): string {
    const id = user.activeCompanyId || user.companyId;
    if (!id) throw new ForbiddenException('Aucune entreprise active');
    return id;
  }

  async findAllForUser(user: User): Promise<InvoiceRecord[]> {
    const companyId = this.companyId(user);

    if (user.role === UserRole.CLIENT) {
      const email = user.email.toLowerCase();
      const name = user.name.toLowerCase();
      return this.repo
        .createQueryBuilder('inv')
        .where('inv.companyId = :companyId', { companyId })
        .andWhere(
          '(inv.clientEmail IS NOT NULL AND LOWER(inv.clientEmail) = :email OR LOWER(inv.clientName) = :name)',
          { email, name },
        )
        .orderBy('inv.createdAt', 'DESC')
        .getMany();
    }

    return this.repo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(user: User, dto: CreateInvoiceDto): Promise<InvoiceRecord> {
    const companyId = this.companyId(user);
    const row = this.repo.create({
      companyId,
      number: dto.number,
      clientName: dto.clientName,
      clientEmail: dto.clientEmail?.toLowerCase(),
      date: dto.date.slice(0, 10),
      dueDate: dto.dueDate.slice(0, 10),
      total: dto.total,
      status: dto.status || 'Sent',
    });
    return this.repo.save(row);
  }

  async markPaid(user: User, id: string): Promise<InvoiceRecord> {
    const companyId = this.companyId(user);
    const inv = await this.repo.findOne({ where: { id, companyId } });
    if (!inv) throw new NotFoundException('Facture introuvable');

    if (user.role === UserRole.CLIENT) {
      const email = user.email.toLowerCase();
      const ok =
        (inv.clientEmail && inv.clientEmail.toLowerCase() === email) ||
        inv.clientName.toLowerCase() === user.name.toLowerCase();
      if (!ok) throw new ForbiddenException('Accès refusé');
    }

    inv.status = 'Paid';
    return this.repo.save(inv);
  }
}
