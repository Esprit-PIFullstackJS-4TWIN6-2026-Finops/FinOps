import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { MembershipsService } from './memberships.service';
import { SwitchTenantDto } from './dto/switch-tenant.dto';

@Controller('tenants')
@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post('switch')
  switch(@CurrentUser() user: User, @Body() dto: SwitchTenantDto) {
    return this.service.switchTenant(user.id, dto.companyId);
  }
}
