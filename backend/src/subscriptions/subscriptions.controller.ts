import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  @Get('company/:companyId')
  getCompanyPlan(@Param('companyId') companyId: string) {
    return {
      companyId,
      plan: 'starter',
      status: 'active',
      features: ['transactions', 'expenses', 'clients'],
      // Placeholder for future paywall/billing provider integration.
    };
  }
}
