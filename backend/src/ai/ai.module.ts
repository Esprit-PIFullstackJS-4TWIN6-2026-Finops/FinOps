import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { Expense } from '../entities/expense.entity';
import { Transaction } from '../entities/transaction.entity';
import { Client } from '../entities/client.entity';
import { ForecastingModule } from './forecasting/forecasting.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Transaction, Client]),
    ForecastingModule,
    AlertsModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
