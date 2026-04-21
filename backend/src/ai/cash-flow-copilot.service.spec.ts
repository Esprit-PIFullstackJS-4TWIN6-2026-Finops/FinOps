import { CashFlowCopilotService } from './cash-flow-copilot.service';

describe('CashFlowCopilotService', () => {
  it('builds a short-term cash-flow projection', async () => {
    const service = new CashFlowCopilotService(
      {
        find: jest.fn().mockResolvedValue([
          { amount: 600, expenseDate: '2026-02-12', category: 'Cloud' },
          { amount: 720, expenseDate: '2026-03-12', category: 'Cloud' },
          { amount: 700, expenseDate: '2026-04-12', category: 'Payroll' },
        ]),
      } as any,
      {
        find: jest.fn().mockResolvedValue([
          { total: 1800, date: '2026-02-03', dueDate: '2026-02-28', status: 'Paid' },
          { total: 1900, date: '2026-03-03', dueDate: '2026-03-28', status: 'Paid' },
          { total: 2100, date: '2026-04-03', dueDate: '2026-05-28', status: 'Sent' },
        ]),
      } as any,
      {
        find: jest.fn().mockResolvedValue([
          { type: 'income', amount: 1750, txDate: '2026-02-15' },
          { type: 'income', amount: 1850, txDate: '2026-03-15' },
          { type: 'income', amount: 1950, txDate: '2026-04-15' },
        ]),
      } as any,
    );

    const result = await service.generate('company-1', { historyMonths: 12, horizonMonths: 3 });

    expect(result.timeline).toHaveLength(3);
    expect(result.projectedEndingCash).toBeGreaterThanOrEqual(result.openingCashEstimate - 1000);
    expect(result.actions.length).toBeGreaterThan(0);
  });
});
