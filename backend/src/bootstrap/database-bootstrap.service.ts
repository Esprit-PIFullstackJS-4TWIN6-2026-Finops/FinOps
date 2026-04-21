import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async onModuleInit() {
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
    console.log('[Bootstrap] Roles + admin seeds vérifiés/insérés (idempotent).');
  }
}
