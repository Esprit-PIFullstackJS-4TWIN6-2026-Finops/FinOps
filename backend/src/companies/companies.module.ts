import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { CompanyJoinRequest } from '../entities/company-join-request.entity';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AuthModule } from '../auth/auth.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoiceNinjaModule } from '../invoice-ninja/invoice-ninja.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User, CompanyJoinRequest]),
    AuthModule,
    MembershipsModule,
    NotificationsModule,
    InvoiceNinjaModule,
  ],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
