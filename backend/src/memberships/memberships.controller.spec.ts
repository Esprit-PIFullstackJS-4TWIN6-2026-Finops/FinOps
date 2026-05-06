import { MembershipsController } from './memberships.controller';

describe('MembershipsController', () => {
  it('switches the active tenant for the current user', () => {
    const service = {
      switchTenant: jest.fn(),
    };
    const controller = new MembershipsController(service as any);

    controller.switch({ id: 'user-1' } as any, { companyId: 'company-2' });

    expect(service.switchTenant).toHaveBeenCalledWith('user-1', 'company-2');
  });
});
