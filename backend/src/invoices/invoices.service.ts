import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { Company } from '../entities/company.entity';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  InvoiceNinjaService,
  NINJA_STATUS_DRAFT,
  NINJA_STATUS_PAID,
  NINJA_STATUS_SENT,
} from '../invoice-ninja/invoice-ninja.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicePaymentSuggestionResult } from './dto/payment-suggestion.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicePdfService } from './invoice-pdf.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(InvoiceRecord)
    private readonly repo: Repository<InvoiceRecord>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly ninja: InvoiceNinjaService,
    private readonly invoicePdf: InvoicePdfService,
  ) {}

  /** Entreprise Invoice Ninja choisie pour ce tenant (+ repli env INVOICE_NINJA_COMPANY_ID). */
  private async ninjaHeaderForCompany(companyId: string): Promise<string | undefined> {
    const co = await this.companyRepo.findOne({ where: { id: companyId } });
    return co?.invoiceNinjaCompanyId?.trim() || undefined;
  }

  private companyId(user: User): string {
    const id = user.activeCompanyId || user.companyId;
    if (!id) throw new ForbiddenException('Aucune entreprise active');
    return id;
  }

  private async resolveClientSnapshot(
    companyId: string,
    clientId: string | undefined,
    fallbackName?: string,
    fallbackEmail?: string,
  ): Promise<{ clientName: string; clientEmail?: string; clientId?: string }> {
    if (!clientId) {
      if (!fallbackName?.trim()) {
        throw new BadRequestException('clientName requis si aucun client CRM');
      }
      return {
        clientName: fallbackName.trim(),
        clientEmail: fallbackEmail?.toLowerCase(),
      };
    }
    const c = await this.clientRepo.findOne({
      where: { id: clientId, companyId },
    });
    if (!c) throw new NotFoundException('Client introuvable');
    return {
      clientId: c.id,
      clientName: c.name,
      clientEmail: c.email?.toLowerCase(),
    };
  }

  private mapLocalStatusToNinja(status: string): number {
    switch (status) {
      case 'Draft':
        return NINJA_STATUS_DRAFT;
      case 'Paid':
        return NINJA_STATUS_PAID;
      default:
        return NINJA_STATUS_SENT;
    }
  }

  private async pushInvoiceToNinja(
    user: User,
    inv: InvoiceRecord,
    dto: CreateInvoiceDto,
  ): Promise<void> {
    if (!this.ninja.isConfigured()) return;
    if (inv.ninjaInvoiceId) return;

    const companyId = this.companyId(user);
    const ninjaHeader = await this.ninjaHeaderForCompany(companyId);
    let ninjaClientId: string | undefined;

    if (inv.clientId) {
      const c = await this.clientRepo.findOne({ where: { id: inv.clientId, companyId } });
      if (!c) {
        this.logger.warn(`Invoice Ninja: CRM client ${inv.clientId} not found, skip push`);
        return;
      }
      if (!c.ninjaClientId) {
        try {
          const parts = c.name.trim().split(/\s+/);
          const first = parts[0] || c.name;
          const rest = parts.slice(1).join(' ') || '';
          const created = await this.ninja.createClient(
            {
              name: c.name,
              contacts: [
                {
                  first_name: first,
                  last_name: rest || undefined,
                  email: c.email,
                  phone: c.phone,
                },
              ],
            },
            ninjaHeader,
          );
          c.ninjaClientId = created.id;
          await this.clientRepo.save(c);
          ninjaClientId = created.id;
        } catch (e) {
          this.logger.warn(`Invoice Ninja: could not create client for invoice ${inv.id}: ${e}`);
          return;
        }
      } else {
        ninjaClientId = c.ninjaClientId;
      }
    } else {
      const parts = inv.clientName.trim().split(/\s+/);
      const first = parts[0] || inv.clientName;
      const rest = parts.slice(1).join(' ') || '';
      try {
        const created = await this.ninja.createClient(
          {
            name: inv.clientName,
            contacts: [
              {
                first_name: first,
                last_name: rest || undefined,
                email: inv.clientEmail,
              },
            ],
          },
          ninjaHeader,
        );
        ninjaClientId = created.id;
      } catch (e) {
        this.logger.warn(`Invoice Ninja: could not create ad-hoc client for invoice ${inv.id}: ${e}`);
        return;
      }
    }

    const lineItems =
      dto.lineItems?.length ?
        dto.lineItems.map((l) => ({
          product_key: l.productKey,
          notes: l.notes,
          quantity: l.quantity,
          cost: l.cost,
        }))
      : [
          {
            product_key: `INV-${inv.number}`,
            notes: `Invoice ${inv.number}`,
            quantity: 1,
            cost: Number(inv.total),
          },
        ];

    const status_id = this.mapLocalStatusToNinja(inv.status);

    try {
      const { id } = await this.ninja.createInvoice(
        {
          client_id: ninjaClientId,
          due_date: inv.dueDate,
          status_id,
          line_items: lineItems,
        },
        ninjaHeader,
      );
      inv.ninjaInvoiceId = id;
      inv.ninjaClientId = ninjaClientId;
      await this.repo.save(inv);
    } catch (e) {
      this.logger.warn(`Invoice Ninja: invoice create failed for local ${inv.id}: ${e}`);
    }
  }

  private clientCanAccessInvoice(user: User, inv: InvoiceRecord): boolean {
    const email = user.email.toLowerCase();
    const name = user.name.toLowerCase();
    if (inv.clientEmail && inv.clientEmail.toLowerCase() === email) return true;
    if (inv.clientName.toLowerCase() === name) return true;
    if (inv.linkedClient?.email && inv.linkedClient.email.toLowerCase() === email) {
      return true;
    }
    return false;
  }

  async findAllForUser(user: User): Promise<InvoiceRecord[]> {
    const companyId = this.companyId(user);

    if (user.role === UserRole.CLIENT) {
      const email = user.email.toLowerCase();
      const name = user.name.toLowerCase();
      return this.repo
        .createQueryBuilder('inv')
        .leftJoinAndSelect('inv.linkedClient', 'cli')
        .where('inv.companyId = :companyId', { companyId })
        .andWhere(
          '(inv.clientEmail IS NOT NULL AND LOWER(inv.clientEmail) = :email OR LOWER(inv.clientName) = :name OR (cli.email IS NOT NULL AND LOWER(cli.email) = :email))',
          { email, name },
        )
        .orderBy('inv.createdAt', 'DESC')
        .getMany();
    }

    return this.repo.find({
      where: { companyId },
      relations: ['linkedClient'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(user: User, id: string): Promise<InvoiceRecord> {
    const companyId = this.companyId(user);
    const inv = await this.repo.findOne({
      where: { id, companyId },
      relations: ['linkedClient'],
    });
    if (!inv) throw new NotFoundException('Facture introuvable');

    if (user.role === UserRole.CLIENT && !this.clientCanAccessInvoice(user, inv)) {
      throw new ForbiddenException('Accès refusé');
    }
    return inv;
  }

  async create(user: User, dto: CreateInvoiceDto): Promise<InvoiceRecord> {
    const companyId = this.companyId(user);
    const snap = await this.resolveClientSnapshot(
      companyId,
      dto.clientId,
      dto.clientName,
      dto.clientEmail,
    );
    const row = this.repo.create({
      companyId,
      number: dto.number,
      clientName: snap.clientName,
      clientEmail: snap.clientEmail ?? dto.clientEmail?.toLowerCase(),
      clientId: snap.clientId,
      date: dto.date.slice(0, 10),
      dueDate: dto.dueDate.slice(0, 10),
      total: dto.total,
      status: dto.status || 'Sent',
    });
    const saved = await this.repo.save(row);
    await this.pushInvoiceToNinja(user, saved, dto);
    return this.findOneForUser(user, saved.id);
  }

  async syncInvoiceToNinja(user: User, id: string): Promise<InvoiceRecord> {
    if (user.role === UserRole.CLIENT) {
      throw new ForbiddenException('Accès refusé');
    }
    const companyId = this.companyId(user);
    const inv = await this.repo.findOne({
      where: { id, companyId },
      relations: ['linkedClient'],
    });
    if (!inv) throw new NotFoundException('Facture introuvable');
    if (inv.ninjaInvoiceId) return this.findOneForUser(user, id);

    const dto: CreateInvoiceDto = {
      number: inv.number,
      clientId: inv.clientId || undefined,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail || undefined,
      date: inv.date,
      dueDate: inv.dueDate,
      total: Number(inv.total),
      status: inv.status as CreateInvoiceDto['status'],
    };
    await this.pushInvoiceToNinja(user, inv, dto);
    return this.findOneForUser(user, id);
  }

  async getInvoicePdf(
    user: User,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    try {
      this.logger.debug(`[getInvoicePdf] Started for user ${user.id}, invoice ${id}`);
      const inv = await this.findOneForUser(user, id);
      this.logger.debug(`[getInvoicePdf] Invoice found: ${inv.id}, company: ${inv.companyId}`);
      
      const company = await this.companyRepo.findOneBy({ id: inv.companyId });
      if (!company) {
        throw new NotFoundException('Entreprise introuvable');
      }
      this.logger.debug(`[getInvoicePdf] Company found: ${company.name}`);
      
      const client = inv.linkedClient ??
        (inv.clientId ? await this.clientRepo.findOne({ where: { id: inv.clientId, companyId: inv.companyId } }) : undefined);
      this.logger.debug(`[getInvoicePdf] Client: ${client?.name || 'none'}`);
      
      const buffer = await this.invoicePdf.generateInvoicePdf(inv, company, client || undefined);
      this.logger.debug(`[getInvoicePdf] PDF buffer generated, size: ${buffer.length}`);
      
      const filename = `invoice-${inv.number.replace(/[^\\w.-]+/g, '_')}.pdf`;
      return { buffer, filename };
    } catch (error) {
      this.logger.error(`[getInvoicePdf] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async suggestPaymentChunks(
    user: User,
    id: string,
  ): Promise<InvoicePaymentSuggestionResult> {
    try {
      this.logger.debug(`[suggestPaymentChunks] Started for user ${user.id}, invoice ${id}`);
      const inv = await this.findOneForUser(user, id);
      this.logger.debug(`[suggestPaymentChunks] Invoice found: ${inv.id}, total: ${inv.total}`);
      
      const now = new Date();
      const dueDate = new Date(inv.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        throw new BadRequestException('Date d\'échéance invalide');
      }
      const daysUntilDue = Math.max(0, Math.round((dueDate.getTime() - now.getTime()) / 86400000));

      const totalValue = Number(inv.total ?? 0);
      if (Number.isNaN(totalValue)) {
        throw new BadRequestException('Total de facture invalide');
      }

      let numberOfChunks = 1;
      if (totalValue > 5000) numberOfChunks = 4;
      else if (totalValue > 2500) numberOfChunks = 3;
      else if (totalValue > 800) numberOfChunks = 2;

      if (daysUntilDue <= 10) {
        numberOfChunks = Math.min(numberOfChunks, 2);
      }

      const baseAmount = Math.floor((totalValue / numberOfChunks) * 100) / 100;
      const amounts = Array(numberOfChunks).fill(baseAmount);
      const remainder = Math.round((totalValue - baseAmount * numberOfChunks) * 100) / 100;
      if (remainder !== 0 && amounts.length > 0) {
        amounts[amounts.length - 1] = Number((amounts[amounts.length - 1] + remainder).toFixed(2));
      }

      const previousInvoices = inv.clientId
        ? await this.repo.find({
            where: { companyId: inv.companyId, clientId: inv.clientId },
            order: { date: 'DESC' },
            take: 6,
          })
        : [];

      const recurring = previousInvoices.length >= 3;
      const historyPaidCount = previousInvoices.filter((item) => item.status === 'Paid').length;
      const confidenceScore = Math.min(
        0.95,
        0.55 + Math.min(historyPaidCount, 4) * 0.08 + (recurring ? 0.08 : 0),
      );

    const intervalDays = recurring ? 30 : daysUntilDue > 30 ? 14 : 7;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1);

    const proposedDates = Array.from({ length: numberOfChunks }, (_, index) => {
      const target = new Date(startDate);
      target.setDate(startDate.getDate() + index * intervalDays);
      if (daysUntilDue > 0 && target > dueDate) {
        return dueDate.toISOString().slice(0, 10);
      }
      return target.toISOString().slice(0, 10);
    });

    const recommendationType = recurring
      ? 'Paiement mensuel recommandé'
      : numberOfChunks === 1
        ? 'Paiement unique recommandé'
        : 'Paiement échelonné recommandé';
    const suggestedTerms = numberOfChunks === 1
      ? 'Paiement intégral à réception.'
      : recurring
        ? `Paiement en ${numberOfChunks} versements mensuels rapprochés.`
        : `Règlement en ${numberOfChunks} échéances espacées d’environ ${intervalDays} jours.`;

      return {
        invoiceId: inv.id,
        recommendationType,
        numberOfChunks,
        chunkAmounts: amounts,
        proposedDates,
        confidenceScore,
        suggestedTerms,
        explanation: `Nous recommandons ${numberOfChunks} versements sur cette facture de ${totalValue.toFixed(2)} € afin d'optimiser la trésorerie client et conserver la date d'échéance ${inv.dueDate}.`,
      };
    } catch (error) {
      this.logger.error(`[suggestPaymentChunks] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async listNinjaRemote(user: User, page = 1, perPage = 100): Promise<unknown[]> {
    if (user.role === UserRole.CLIENT) throw new ForbiddenException('Accès refusé');
    const cid =
      user.role === UserRole.PLATFORM_ADMIN ? user.activeCompanyId || user.companyId : this.companyId(user);
    const header = cid ? await this.ninjaHeaderForCompany(cid) : undefined;
    return this.ninja.listInvoices(page, perPage, header);
  }

  async getNinjaRemoteById(user: User, ninjaInvoiceId: string): Promise<unknown> {
    if (user.role === UserRole.CLIENT) throw new ForbiddenException('Accès refusé');
    const cid =
      user.role === UserRole.PLATFORM_ADMIN ? user.activeCompanyId || user.companyId : this.companyId(user);
    const header = cid ? await this.ninjaHeaderForCompany(cid) : undefined;
    return this.ninja.getInvoice(ninjaInvoiceId, header);
  }

  async update(user: User, id: string, dto: UpdateInvoiceDto): Promise<InvoiceRecord> {
    if (user.role === UserRole.CLIENT) {
      throw new ForbiddenException('Les clients ne peuvent pas modifier une facture');
    }
    const companyId = this.companyId(user);
    const inv = await this.repo.findOne({
      where: { id, companyId },
      relations: ['linkedClient'],
    });
    if (!inv) throw new NotFoundException('Facture introuvable');

    if (dto.number !== undefined) inv.number = dto.number;
    if (dto.date !== undefined) inv.date = dto.date.slice(0, 10);
    if (dto.dueDate !== undefined) inv.dueDate = dto.dueDate.slice(0, 10);
    if (dto.total !== undefined) inv.total = dto.total;
    if (dto.status !== undefined) inv.status = dto.status;

    if ('clientId' in dto) {
      if (dto.clientId === null || dto.clientId === '') {
        inv.clientId = null;
        if (dto.clientName !== undefined) inv.clientName = dto.clientName;
        if (dto.clientEmail !== undefined) inv.clientEmail = dto.clientEmail.toLowerCase();
      } else if (dto.clientId) {
        const snap = await this.resolveClientSnapshot(
          companyId,
          dto.clientId,
          dto.clientName,
          dto.clientEmail,
        );
        inv.clientId = snap.clientId;
        inv.clientName = snap.clientName;
        inv.clientEmail = snap.clientEmail;
      }
    } else {
      if (dto.clientName !== undefined) inv.clientName = dto.clientName;
      if (dto.clientEmail !== undefined) inv.clientEmail = dto.clientEmail.toLowerCase();
    }

    await this.repo.save(inv);
    return this.findOneForUser(user, id);
  }

  async remove(user: User, id: string): Promise<{ deleted: true }> {
    if (user.role === UserRole.CLIENT) {
      throw new ForbiddenException('Les clients ne peuvent pas supprimer une facture');
    }
    const companyId = this.companyId(user);
    const inv = await this.repo.findOne({ where: { id, companyId } });
    if (!inv) throw new NotFoundException('Facture introuvable');
    await this.repo.remove(inv);
    return { deleted: true };
  }

  async markPaid(user: User, id: string): Promise<InvoiceRecord> {
    const companyId = this.companyId(user);
    const inv = await this.repo.findOne({
      where: { id, companyId },
      relations: ['linkedClient'],
    });
    if (!inv) throw new NotFoundException('Facture introuvable');

    if (user.role === UserRole.CLIENT) {
      if (!this.clientCanAccessInvoice(user, inv)) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    inv.status = 'Paid';
    await this.repo.save(inv);
    if (this.ninja.isConfigured() && inv.ninjaInvoiceId) {
      try {
        const header = await this.ninjaHeaderForCompany(inv.companyId);
        await this.ninja.updateInvoiceStatus(inv.ninjaInvoiceId, NINJA_STATUS_PAID, header);
      } catch (e) {
        this.logger.warn(`Invoice Ninja: mark paid failed for ${inv.ninjaInvoiceId}: ${e}`);
      }
    }
    return this.findOneForUser(user, id);
  }
}
