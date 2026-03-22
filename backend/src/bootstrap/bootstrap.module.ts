import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Company } from '../entities/company.entity';
import { Role } from '../entities/role.entity';
import { DatabaseBootstrapService } from './database-bootstrap.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company, Role])],
  providers: [DatabaseBootstrapService],
})
export class BootstrapModule {}
