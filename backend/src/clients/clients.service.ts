import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { Company } from '../entities/company.entity';
import { InvoiceNinjaService } from '../invoice-ninja/invoice-ninja.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly ninja: InvoiceNinjaService,
  ) {}

  private async ninjaHeaderForCompany(companyId: string): Promise<string | undefined> {
    const co = await this.companyRepo.findOne({ where: { id: companyId } });
    return co?.invoiceNinjaCompanyId?.trim() || undefined;
  }

  findAll(companyId: string): Promise<Client[]> {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async findOne(companyId: string, id: string): Promise<Client> {
    const row = await this.repo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Client introuvable');
    return row;
  }

  async create(companyId: string, dto: CreateClientDto): Promise<Client> {
    const row = await this.repo.save(this.repo.create({ ...dto, companyId }));
    if (!this.ninja.isConfigured() || row.ninjaClientId) return row;
    try {
      const ninjaHeader = await this.ninjaHeaderForCompany(companyId);
      const parts = row.name.trim().split(/\s+/);
      const first = parts[0] || row.name;
      const rest = parts.slice(1).join(' ') || '';
      const { id } = await this.ninja.createClient(
        {
          name: row.name,
          contacts: [
            {
              first_name: first,
              last_name: rest || undefined,
              email: row.email,
              phone: row.phone,
            },
          ],
        },
        ninjaHeader,
      );
      row.ninjaClientId = id;
      await this.repo.save(row);
    } catch (e) {
      this.logger.warn(`Invoice Ninja client sync failed for ${row.id}: ${e}`);
    }
    return row;
  }

  async update(companyId: string, id: string, dto: UpdateClientDto): Promise<Client> {
    const row = await this.findOne(companyId, id);
    Object.assign(row, dto);
    return this.repo.save(row);
  }

  async remove(companyId: string, id: string): Promise<{ deleted: true }> {
    await this.findOne(companyId, id);
    await this.repo.delete({ id, companyId });
    return { deleted: true };
  }
}
