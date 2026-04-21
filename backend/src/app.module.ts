import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Company } from './entities/company.entity';
import { User } from './entities/user.entity';
import { RegistrationRequest } from './entities/registration-request.entity';
import { EmployeeAccessRequest } from './entities/employee-access-request.entity';
import { CompanyJoinRequest } from './entities/company-join-request.entity';
import { Notification } from './entities/notification.entity';
import { Role } from './entities/role.entity';
import { UserCompanyMembership } from './entities/user-company-membership.entity';
import { Client } from './entities/client.entity';
import { Transaction } from './entities/transaction.entity';
import { Expense } from './entities/expense.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { InvoiceRecord } from './entities/invoice-record.entity';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { RegistrationModule } from './registration/registration.module';
import { AdminModule } from './admin/admin.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ClientsModule } from './clients/clients.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { MembershipsModule } from './memberships/memberships.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ActivityLogInterceptor } from './common/interceptors/activity-log.interceptor';

function resolveDatasourceOptions(): DataSourceOptions {
  const entities = [
    Company,
    User,
    RegistrationRequest,
    EmployeeAccessRequest,
    CompanyJoinRequest,
    Notification,
    Role,
    UserCompanyMembership,
    Client,
    Transaction,
    Expense,
    ActivityLog,
    InvoiceRecord,
  ];

  return {
    type: 'mysql',
    // Force IPv4 localhost to avoid Windows resolving "localhost" to "::1".
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'finops_saas',
    entities,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Ensure backend config is loaded even when process.cwd() is repo root
      envFilePath: [join(__dirname, '..', '.env')],
    }),
    TypeOrmModule.forRoot(resolveDatasourceOptions()),
    MailModule,
    AuthModule,
    RegistrationModule,
    AdminModule,
    CompaniesModule,
    UsersModule,
    TransactionsModule,
    ClientsModule,
    ExpensesModule,
    ActivityLogsModule,
    MembershipsModule,
    SubscriptionsModule,
    AiModule,
    NotificationsModule,
    InvoicesModule,
    DashboardModule,
    BootstrapModule,
  ],
  controllers: [AppController],
  providers: [AppService, ActivityLogInterceptor],
})
export class AppModule {}
