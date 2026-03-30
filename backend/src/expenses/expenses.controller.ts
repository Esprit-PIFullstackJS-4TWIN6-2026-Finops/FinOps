import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Controller('expenses')
@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.activeCompanyId || user.companyId!);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  create(@CurrentUser() user: User, @Body() dto: CreateExpenseDto) {
    return this.service.create(user.activeCompanyId || user.companyId!, user.id, dto);
  }
}
