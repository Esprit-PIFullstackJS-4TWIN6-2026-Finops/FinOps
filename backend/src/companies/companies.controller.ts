import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateCompanyJoinRequestDto } from './dto/create-company-join-request.dto';
import { RejectCompanyJoinRequestDto } from './dto/reject-company-join-request.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  async createCompany(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.createCompany(userId, dto);
  }

  @Get('my-companies')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  async myCompanies(@CurrentUser('id') userId: string) {
    return this.companiesService.findUserCompanies(userId);
  }

  @Get('discover')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  async discover(@CurrentUser('id') userId: string) {
    return this.companiesService.discoverCompanies(userId);
  }

  @Get('invoice-ninja/options')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
  )
  async invoiceNinjaCompanyOptions(@CurrentUser('id') userId: string) {
    return this.companiesService.listInvoiceNinjaCompanies(userId);
  }

  @Get('join-requests/mine')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  async myJoinRequests(@CurrentUser('id') userId: string) {
    return this.companiesService.getMyJoinRequests(userId);
  }

  @Post('join-requests')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  async createJoinRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCompanyJoinRequestDto,
  ) {
    return this.companiesService.createJoinRequest(userId, dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.companiesService.getCompanyForUser(id, userId);
  }

  @Post(':id/switch')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  async switchCompany(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.switchCompany(id, userId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateCompany(id, userId, dto);
  }

  @Get(':id/employees')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getEmployees(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.getEmployees(id, userId);
  }

  @Post(':id/employees')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async createEmployee(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.companiesService.createEmployee(id, userId, dto);
  }

  @Get(':id/join-requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getCompanyJoinRequests(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.getCompanyJoinRequests(id, userId);
  }

  @Post(':id/join-requests/:requestId/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async acceptJoinRequest(
    @Param('id') companyId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.acceptJoinRequest(companyId, requestId, userId);
  }

  @Post(':id/join-requests/:requestId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async rejectJoinRequest(
    @Param('id') companyId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectCompanyJoinRequestDto,
  ) {
    return this.companiesService.rejectJoinRequest(
      companyId,
      requestId,
      userId,
      dto.rejectionReason,
    );
  }
}
