import { SubscriptionsController } from './subscriptions.controller';

describe('SubscriptionsController', () => {
  it('returns the placeholder starter plan for a company', () => {
    const controller = new SubscriptionsController();

    expect(controller.getCompanyPlan('company-1')).toEqual({
      companyId: 'company-1',
      plan: 'starter',
      status: 'active',
      features: ['transactions', 'expenses', 'clients'],
    });
  });
});
