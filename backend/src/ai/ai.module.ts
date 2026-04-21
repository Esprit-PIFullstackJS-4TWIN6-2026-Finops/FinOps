import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { Expense } from '../entities/expense.entity';
import { Transaction } from '../entities/transaction.entity';
import { Client } from '../entities/client.entity';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { ForecastingModule } from './forecasting/forecasting.module';
import { AlertsModule } from './alerts/alerts.module';
import { InvoiceAiExtractionService } from './invoice-ai/invoice-ai-extraction.service';
import { CashFlowCopilotService } from './cash-flow-copilot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Transaction, Client, InvoiceRecord]),
    ForecastingModule,
    AlertsModule,
  ],
  controllers: [AiController],
  providers: [AiService, InvoiceAiExtractionService, CashFlowCopilotService],
  exports: [AiService, InvoiceAiExtractionService, CashFlowCopilotService],
})
export class AiModule {}
