import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionsController } from './presentation/transactions.controller';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import {
  TRANSACTIONS_REPOSITORY,
} from './domain/repositories/transactions.repository';
import { TransactionsTypeormRepository } from './infrastructure/repositories/transactions.typeorm.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [TransactionsController],
  providers: [
    CreateTransactionUseCase,
    TransactionsTypeormRepository,
    {
      provide: TRANSACTIONS_REPOSITORY,
      useExisting: TransactionsTypeormRepository,
    },
  ],
  exports: [TransactionsTypeormRepository],
})
export class TransactionsModule {}
