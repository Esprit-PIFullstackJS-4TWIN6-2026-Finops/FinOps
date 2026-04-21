import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationRequest } from '../entities/registration-request.entity';
import { EmployeeAccessRequest } from '../entities/employee-access-request.entity';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RegistrationRequest,
      EmployeeAccessRequest,
      Company,
      User,
    ]),
  ],
  providers: [RegistrationService],
  controllers: [RegistrationController],
  exports: [RegistrationService],
})
export class RegistrationModule {}
