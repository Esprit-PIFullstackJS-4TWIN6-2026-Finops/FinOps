import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { Expense } from '../entities/expense.entity';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceRecord, Expense, Client])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
