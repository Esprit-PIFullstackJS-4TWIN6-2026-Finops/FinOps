import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { Company } from '../entities/company.entity';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { InvoiceNinjaModule } from '../invoice-ninja/invoice-ninja.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceRecord, Client, Company]), InvoiceNinjaModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService],
})
export class InvoicesModule {}
