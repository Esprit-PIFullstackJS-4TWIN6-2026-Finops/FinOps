import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { ActivityLogsService } from './activity-logs.service';

@Controller('activity-logs')
@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  list(@CurrentUser() user: User) {
    const companyId = user.activeCompanyId || user.companyId;
    if (!companyId) return [];
    return this.service.findByCompany(companyId);
  }
}
