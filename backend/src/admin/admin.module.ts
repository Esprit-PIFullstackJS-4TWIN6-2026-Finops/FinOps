import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationRequest } from '../entities/registration-request.entity';
import { EmployeeAccessRequest } from '../entities/employee-access-request.entity';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { RegistrationModule } from '../registration/registration.module';
import { AuthModule } from '../auth/auth.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RegistrationRequest,
      EmployeeAccessRequest,
      Company,
      User,
    ]),
    RegistrationModule,
    AuthModule,
    MembershipsModule,
    NotificationsModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
