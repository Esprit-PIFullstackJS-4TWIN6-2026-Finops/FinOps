import { Inject, Injectable } from '@nestjs/common';
import { Transaction, TransactionType } from '../../../entities/transaction.entity';
import {
  TRANSACTIONS_REPOSITORY,
} from '../../domain/repositories/transactions.repository';
import type { TransactionsRepository } from '../../domain/repositories/transactions.repository';

export interface CreateTransactionCommand {
  companyId: string;
  createdBy: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  txDate: string;
  description?: string;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTIONS_REPOSITORY)
    private readonly repo: TransactionsRepository,
  ) {}

  execute(command: CreateTransactionCommand): Promise<Transaction> {
    return this.repo.create({
      ...command,
      currency: command.currency || 'USD',
    });
  }
}
