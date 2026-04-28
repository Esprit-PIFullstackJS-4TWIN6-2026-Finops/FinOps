import { Transaction } from '../../../entities/transaction.entity';

export const TRANSACTIONS_REPOSITORY = 'TRANSACTIONS_REPOSITORY';

export interface TransactionsRepository {
  create(data: Partial<Transaction>): Promise<Transaction>;
  findAllByCompany(companyId: string): Promise<Transaction[]>;
}
