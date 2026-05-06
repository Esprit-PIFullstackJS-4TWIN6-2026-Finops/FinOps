import { ExpenseForecastMlService } from './expense-forecast-ml.service';

describe('ExpenseForecastMlService', () => {
  it('trains a monthly expense model and returns a 3-month forecast', async () => {
    const service = new ExpenseForecastMlService({
      find: jest.fn().mockResolvedValue([
        { amount: 800, expenseDate: '2025-09-10' },
        { amount: 920, expenseDate: '2025-10-10' },
        { amount: 960, expenseDate: '2025-11-10' },
        { amount: 1010, expenseDate: '2025-12-10' },
        { amount: 1080, expenseDate: '2026-01-10' },
        { amount: 1110, expenseDate: '2026-02-10' },
        { amount: 1180, expenseDate: '2026-03-10' },
        { amount: 1240, expenseDate: '2026-04-10' },
      ]),
    } as any);

    const result = await service.generate('company-1', { historyMonths: 8 });

    expect(result.timeline).toHaveLength(3);
    expect(result.nextMonthExpense).toBeGreaterThan(0);
    expect(result.next3MonthsTotal).toBeGreaterThan(result.nextMonthExpense);
    expect(result.confidence).toBeGreaterThan(0);
  });
});
