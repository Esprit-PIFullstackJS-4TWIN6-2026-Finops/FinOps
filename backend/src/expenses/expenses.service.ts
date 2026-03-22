import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
    private readonly aiService: AiService,
  ) {}

  findAll(companyId: string): Promise<Expense[]> {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async create(companyId: string, createdBy: string, dto: CreateExpenseDto): Promise<Expense> {
    let category = dto.category?.trim();
    if (!category || category.toLowerCase() === 'auto') {
      category = await this.aiService.categorizeExpense({
        vendor: dto.vendor,
        notes: dto.notes,
        amount: Number(dto.amount),
      });
    }
    return this.repo.save(this.repo.create({ ...dto, category, companyId, createdBy }));
  }
}
