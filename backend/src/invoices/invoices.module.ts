import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceRecord])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
