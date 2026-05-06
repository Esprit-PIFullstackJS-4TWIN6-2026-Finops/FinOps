import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { ForecastingService } from './forecasting.service';
import { ForecastRequestDto } from './dto/forecast-request.dto';
import { ForecastResponseDto } from './dto/forecast-response.dto';

@ApiTags('AI Forecasting')
@ApiBearerAuth()
@Controller('ai/forecasting')
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate expense forecast for a company and optional category' })
  @ApiQuery({ name: 'companyId', required: true, description: 'Company UUID' })
  @ApiQuery({ name: 'category', required: false, description: 'Expense category filter' })
  @ApiQuery({ name: 'periodMonths', required: false, description: 'Forecast period in months (1-12)', example: 3 })
  async getForecast(
    @Query() query: ForecastRequestDto,
    @CurrentUser() user: User,
  ): Promise<ForecastResponseDto> {
    // Validation: l'utilisateur doit avoir accès à la compagnie
    if (user.activeCompanyId !== query.companyId && user.companyId !== query.companyId) {
      throw new Error('Unauthorized access to company data');
    }

    return this.forecastingService.generateForecast(query);
  }
}