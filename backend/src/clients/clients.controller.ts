import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('clients')
@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.activeCompanyId || user.companyId!);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  create(@CurrentUser() user: User, @Body() dto: CreateClientDto) {
    return this.service.create(user.activeCompanyId || user.companyId!, dto);
  }
}
