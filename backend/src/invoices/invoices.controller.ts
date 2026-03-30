import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  findAll(@CurrentUser() user: User) {
    return this.service.findAllForUser(user);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  create(@CurrentUser() user: User, @Body() dto: CreateInvoiceDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id/pay')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  pay(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.markPaid(user, id);
  }
}
