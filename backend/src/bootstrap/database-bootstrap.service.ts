import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class DatabaseBootstrapService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    if (!this.dataSource.isInitialized) {
      console.warn(
        '[Bootstrap] Database not ready during startup; seed will run after the connection is established.',
      );
      return;
    }

    await this.runSeedsSafely();
  }

  async runSeedsSafely() {
    try {
      await this.runSeeds();
    } catch (error) {
      console.error('[Bootstrap] Failed to seed initial data:', error);
    }
  }

  private async runSeeds() {
    const roleSeeds = [
      { code: UserRole.PLATFORM_ADMIN, description: 'Platform administrator' },
      { code: UserRole.OWNER, description: 'Business owner' },
      { code: UserRole.MANAGER, description: 'Company manager' },
      { code: UserRole.EMPLOYEE, description: 'Company employee' },
      { code: UserRole.ACCOUNTANT, description: 'Company accountant' },
      { code: UserRole.CLIENT, description: 'Client user' },
    ];
    await this.roleRepo.upsert(roleSeeds, ['code']);

    const hash = await bcrypt.hash('Admin123!', 10);
    const adminSeeds = [
      { email: 'admin@finops.com', name: 'Administrateur Plateforme' },
      { email: 'admin@alpha.com', name: 'Administrateur Plateforme (Alpha)' },
    ];

    await this.userRepo.upsert(
      adminSeeds.map((seed) => ({
        email: seed.email.toLowerCase(),
        passwordHash: hash,
        name: seed.name,
        role: UserRole.PLATFORM_ADMIN,
        mustChangePassword: false,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })),
      ['email'],
    );
    console.log('[Bootstrap] Roles and admin seeds verified/inserted (idempotent).');
  }
}
