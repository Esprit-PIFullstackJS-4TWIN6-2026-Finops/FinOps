import { CashFlowCopilotService } from './cash-flow-copilot.service';

describe('CashFlowCopilotService', () => {
  it('builds a short-term cash-flow projection from internal models', async () => {
    const service = new CashFlowCopilotService(
      {
        find: jest.fn().mockResolvedValue([
          { amount: 520, expenseDate: '2025-09-12', category: 'Cloud' },
          { amount: 600, expenseDate: '2025-10-12', category: 'Cloud' },
          { amount: 640, expenseDate: '2025-11-12', category: 'Cloud' },
          { amount: 680, expenseDate: '2025-12-12', category: 'Payroll' },
          { amount: 700, expenseDate: '2026-01-12', category: 'Payroll' },
          { amount: 720, expenseDate: '2026-02-12', category: 'Cloud' },
          { amount: 740, expenseDate: '2026-03-12', category: 'Cloud' },
          { amount: 760, expenseDate: '2026-04-12', category: 'Payroll' },
        ]),
      } as any,
      {
        find: jest.fn().mockResolvedValue([
          { total: 1600, date: '2025-09-03', dueDate: '2025-09-28', status: 'Paid' },
          { total: 1700, date: '2025-10-03', dueDate: '2025-10-28', status: 'Paid' },
          { total: 1820, date: '2025-11-03', dueDate: '2025-11-28', status: 'Paid' },
          { total: 1890, date: '2025-12-03', dueDate: '2025-12-28', status: 'Paid' },
          { total: 1950, date: '2026-01-03', dueDate: '2026-01-28', status: 'Paid' },
          { total: 2020, date: '2026-02-03', dueDate: '2026-02-28', status: 'Paid' },
          { total: 2140, date: '2026-03-03', dueDate: '2026-03-28', status: 'Paid' },
          { total: 2280, date: '2026-04-03', dueDate: '2026-05-28', status: 'Sent' },
        ]),
      } as any,
      {
        find: jest.fn().mockResolvedValue([
          { type: 'income', amount: 1580, txDate: '2025-09-15' },
          { type: 'income', amount: 1680, txDate: '2025-10-15' },
          { type: 'income', amount: 1760, txDate: '2025-11-15' },
          { type: 'income', amount: 1830, txDate: '2025-12-15' },
          { type: 'income', amount: 1910, txDate: '2026-01-15' },
          { type: 'income', amount: 1980, txDate: '2026-02-15' },
          { type: 'income', amount: 2070, txDate: '2026-03-15' },
          { type: 'income', amount: 2190, txDate: '2026-04-15' },
        ]),
      } as any,
    );

    const result = await service.generate('company-1', { historyMonths: 12, horizonMonths: 3 });

    expect(result.timeline).toHaveLength(3);
    expect(result.projectedEndingCash).toBeGreaterThanOrEqual(result.openingCashEstimate - 1000);
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.summary).toContain('Internal ML cash-flow models');
  });
});
