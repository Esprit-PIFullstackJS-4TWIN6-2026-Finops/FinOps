import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../../entities/transaction.entity';
import { TransactionsRepository } from '../../domain/repositories/transactions.repository';

@Injectable()
export class TransactionsTypeormRepository implements TransactionsRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  create(data: Partial<Transaction>): Promise<Transaction> {
    return this.repo.save(this.repo.create(data));
  }

  findAllByCompany(companyId: string): Promise<Transaction[]> {
    return this.repo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }
}
