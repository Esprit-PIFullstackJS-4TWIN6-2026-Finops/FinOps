import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompanyMembership } from '../entities/user-company-membership.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Company } from '../entities/company.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(UserCompanyMembership)
    private readonly membershipRepo: Repository<UserCompanyMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async assignMembership(
    userId: string,
    companyId: string,
    roleCode: string,
    isDefault = false,
  ): Promise<UserCompanyMembership> {
    const role = await this.roleRepo.findOne({ where: { code: roleCode } });
    if (!role) {
      throw new NotFoundException(`Role '${roleCode}' not found`);
    }

    const existing = await this.membershipRepo.findOne({
      where: { userId, companyId },
    });
    if (existing) {
      existing.roleId = role.id;
      existing.isDefault = existing.isDefault || isDefault;
      return this.membershipRepo.save(existing);
    }

    const membership = this.membershipRepo.create({
      userId,
      companyId,
      roleId: role.id,
      isDefault,
    });
    return this.membershipRepo.save(membership);
  }

  async hasMembership(userId: string, companyId: string): Promise<boolean> {
    return this.membershipRepo.exists({ where: { userId, companyId } });
  }

  async switchTenant(userId: string, companyId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      const companyExists = await this.companyRepo.exists({ where: { id: companyId } });
      if (!companyExists) {
        throw new NotFoundException('Company not found');
      }
    } else if (user.role === UserRole.OWNER) {
      const ownsCompany = await this.companyRepo.exists({
        where: { id: companyId, ownerId: userId },
      });
      if (!ownsCompany) {
        const membership = await this.membershipRepo.findOne({
          where: { userId, companyId },
        });
        if (!membership) {
          throw new ForbiddenException('No membership for selected company');
        }
      }
    } else {
      const membership = await this.membershipRepo.findOne({
        where: { userId, companyId },
      });
      if (!membership) {
        throw new ForbiddenException('No membership for selected company');
      }
    }

    user.activeCompanyId = companyId;
    user.companyId = companyId;
    await this.userRepo.save(user);

    return { activeCompanyId: companyId };
  }
}
