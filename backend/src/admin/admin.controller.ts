import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { RejectRequestDto } from './dto/reject-request.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('registration-requests')
  async getRequests() {
    return this.adminService.getRegistrationRequests();
  }

  @Get('registration-requests/pending')
  async getPendingRequests() {
    return this.adminService.getPendingRegistrationRequests();
  }

  @Post('registration-requests/:id/accept')
  async accept(@Param('id') id: string) {
    return this.adminService.acceptRegistrationRequest(id);
  }

  @Post('registration-requests/:id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectRequestDto) {
    return this.adminService.rejectRegistrationRequest(id, dto);
  }

  @Delete('registration-requests/:id')
  async purgeRegistrationRequest(@Param('id') id: string) {
    return this.adminService.purgeRegistrationRequest(id);
  }

  @Get('employee-access-requests')
  async getEmployeeAccessRequests() {
    return this.adminService.getEmployeeAccessRequests();
  }

  @Post('employee-access-requests/:id/accept')
  async acceptEmployeeAccessRequest(@Param('id') id: string) {
    return this.adminService.acceptEmployeeAccessRequest(id);
  }

  @Post('employee-access-requests/:id/reject')
  async rejectEmployeeAccessRequest(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
  ) {
    return this.adminService.rejectEmployeeAccessRequest(id, dto);
  }
}
