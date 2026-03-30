import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { Expense } from '../entities/expense.entity';
import { Transaction } from '../entities/transaction.entity';
import { Client } from '../entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, Transaction, Client])],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
