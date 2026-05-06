import { DashboardController } from './dashboard.controller';

describe('DashboardController', () => {
  it('delegates summary requests to the service', async () => {
    const summary = { invoicedTotal: 42 };
    const dashboardService = {
      getSummary: jest.fn().mockResolvedValue(summary),
    };
    const controller = new DashboardController(dashboardService as any);
    const user = { id: 'user-1', companyId: 'company-1' } as any;

    await expect(controller.summary(user)).resolves.toBe(summary);
    expect(dashboardService.getSummary).toHaveBeenCalledWith(user);
  });
});
