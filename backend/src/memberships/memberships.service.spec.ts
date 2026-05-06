import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  const membershipRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
  };
  const userRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const roleRepo = {
    findOne: jest.fn(),
  };
  const companyRepo = {
    exists: jest.fn(),
  };

  let service: MembershipsService;

  beforeEach(() => {
    jest.clearAllMocks();
    membershipRepo.create.mockImplementation((value) => value);
    membershipRepo.save.mockImplementation(async (value) => value);
    userRepo.save.mockImplementation(async (value) => value);
    service = new MembershipsService(
      membershipRepo as any,
      userRepo as any,
      roleRepo as any,
      companyRepo as any,
    );
  });

  it('creates a new membership when none exists', async () => {
    roleRepo.findOne.mockResolvedValue({ id: 'role-1' });
    membershipRepo.findOne.mockResolvedValue(null);

    const result = await service.assignMembership('user-1', 'company-1', 'manager', true);

    expect(membershipRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      companyId: 'company-1',
      roleId: 'role-1',
      isDefault: true,
    });
    expect(result).toEqual({
      userId: 'user-1',
      companyId: 'company-1',
      roleId: 'role-1',
      isDefault: true,
    });
  });

  it('updates an existing membership and preserves default membership state', async () => {
    const existing = { userId: 'user-1', companyId: 'company-1', roleId: 'old-role', isDefault: true };
    roleRepo.findOne.mockResolvedValue({ id: 'role-2' });
    membershipRepo.findOne.mockResolvedValue(existing);

    const result = await service.assignMembership('user-1', 'company-1', 'owner');

    expect(result).toEqual({
      userId: 'user-1',
      companyId: 'company-1',
      roleId: 'role-2',
      isDefault: true,
    });
  });

  it('throws when assigning a membership with an unknown role', async () => {
    roleRepo.findOne.mockResolvedValue(null);

    await expect(
      service.assignMembership('user-1', 'company-1', 'missing-role'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks whether a membership exists', async () => {
    membershipRepo.exists.mockResolvedValue(true);

    await expect(service.hasMembership('user-1', 'company-1')).resolves.toBe(true);
    expect(membershipRepo.exists).toHaveBeenCalledWith({
      where: { userId: 'user-1', companyId: 'company-1' },
    });
  });

  it('throws for platform admins when the target company does not exist', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'admin-1', role: UserRole.PLATFORM_ADMIN });
    companyRepo.exists.mockResolvedValue(false);

    await expect(service.switchTenant('admin-1', 'company-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows owners to switch to a company they belong to', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.OWNER,
      companyId: 'company-old',
    });
    companyRepo.exists.mockResolvedValue(false);
    membershipRepo.findOne.mockResolvedValue({ id: 'membership-1' });

    await expect(service.switchTenant('owner-1', 'company-2')).resolves.toEqual({
      activeCompanyId: 'company-2',
    });
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCompanyId: 'company-2',
        companyId: 'company-2',
      }),
    );
  });

  it('rejects standard users without a membership in the target company', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'employee-1', role: UserRole.EMPLOYEE });
    membershipRepo.findOne.mockResolvedValue(null);

    await expect(service.switchTenant('employee-1', 'company-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
