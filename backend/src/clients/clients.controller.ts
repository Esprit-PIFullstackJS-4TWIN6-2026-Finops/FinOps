import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { requireActiveCompanyId } from '../common/utils/active-company.util';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(requireActiveCompanyId(user));
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.findOne(requireActiveCompanyId(user), id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  create(@CurrentUser() user: User, @Body() dto: CreateClientDto) {
    return this.service.create(requireActiveCompanyId(user), dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.service.update(requireActiveCompanyId(user), id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(requireActiveCompanyId(user), id);
  }
}
