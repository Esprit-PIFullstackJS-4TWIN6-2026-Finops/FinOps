import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsTypeormRepository } from '../infrastructure/repositories/transactions.typeorm.repository';

@Controller('transactions')
@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly txRepo: TransactionsTypeormRepository,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  findAll(@CurrentUser() user: User) {
    const companyId = user.activeCompanyId || user.companyId;
    return this.txRepo.findAllByCompany(companyId!);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  create(@CurrentUser() user: User, @Body() dto: CreateTransactionDto) {
    const companyId = user.activeCompanyId || user.companyId;
    return this.createTransaction.execute({
      companyId: companyId!,
      createdBy: user.id,
      ...dto,
    });
  }
}
