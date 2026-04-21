import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { User, UserRole } from '../entities/user.entity';
import { AiService } from '../ai/ai.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
    private readonly aiService: AiService,
  ) {}

  findAll(companyId: string): Promise<Expense[]> {
    return this.repo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(companyId: string, id: string): Promise<Expense> {
    const row = await this.repo.findOne({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException('Dépense introuvable');
    return row;
  }

  private assertCanEditExpense(user: User, exp: Expense): void {
    if (user.role === UserRole.EMPLOYEE && exp.createdBy !== user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres dépenses',
      );
    }
  }

  async create(
    companyId: string,
    createdBy: string,
    dto: CreateExpenseDto,
  ): Promise<Expense> {
    let category = dto.category?.trim();
    if (!category || category.toLowerCase() === 'auto') {
      category = await this.aiService.categorizeExpense({
        vendor: dto.vendor,
        notes: dto.notes,
        amount: Number(dto.amount),
      });
    }
    return this.repo.save(
      this.repo.create({ ...dto, category, companyId, createdBy }),
    );
  }

  async update(
    user: User,
    companyId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const exp = await this.findOne(companyId, id);
    this.assertCanEditExpense(user, exp);

    let category = dto.category?.trim();
    if (category !== undefined && (!category || category.toLowerCase() === 'auto')) {
      category = await this.aiService.categorizeExpense({
        vendor: dto.vendor ?? exp.vendor,
        notes: dto.notes ?? exp.notes,
        amount: Number(dto.amount ?? exp.amount),
      });
    }

    if (dto.amount !== undefined) exp.amount = dto.amount;
    if (dto.expenseDate !== undefined) exp.expenseDate = dto.expenseDate.slice(0, 10);
    if (dto.vendor !== undefined) exp.vendor = dto.vendor;
    if (dto.notes !== undefined) exp.notes = dto.notes;
    if (category !== undefined) exp.category = category;

    return this.repo.save(exp);
  }

  async remove(user: User, companyId: string, id: string): Promise<{ deleted: true }> {
    const exp = await this.findOne(companyId, id);
    this.assertCanEditExpense(user, exp);
    await this.repo.remove(exp);
    return { deleted: true };
  }
}
