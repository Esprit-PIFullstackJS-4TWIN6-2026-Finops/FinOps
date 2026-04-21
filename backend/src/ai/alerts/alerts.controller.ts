import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { AlertsService } from './alerts.service';
import { AlertRequestDto } from './dto/alert-request.dto';
import { AlertResponseDto } from './dto/alert-response.dto';

@ApiTags('AI Alerts')
@ApiBearerAuth()
@Controller('ai/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get expense alerts for a company and optional category' })
  @ApiQuery({ name: 'companyId', required: true, description: 'Company UUID' })
  @ApiQuery({ name: 'category', required: false, description: 'Expense category filter' })
  async getAlerts(
    @Query() query: AlertRequestDto,
    @CurrentUser() user: User,
  ): Promise<AlertResponseDto[]> {
    // Validation: l'utilisateur doit avoir accès à la compagnie
    if (user.activeCompanyId !== query.companyId && user.companyId !== query.companyId) {
      throw new Error('Unauthorized access to company data');
    }

    return this.alertsService.getAlerts(query);
  }
}