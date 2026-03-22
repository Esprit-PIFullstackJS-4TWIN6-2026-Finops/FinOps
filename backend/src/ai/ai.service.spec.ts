import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.API_KEY;

    const expenseRepo = {
      find: jest.fn().mockResolvedValue([
        { amount: 100, expenseDate: '2026-01-12', category: 'Cloud', vendor: 'AWS', notes: '' },
        { amount: 300, expenseDate: '2026-02-10', category: 'Software', vendor: 'Slack', notes: '' },
        { amount: 550, expenseDate: '2026-03-10', category: 'Cloud', vendor: 'AWS', notes: '' },
      ]),
    };
    const txRepo = {
      find: jest.fn().mockResolvedValue([
        { txDate: '2026-03-01', type: 'expense', amount: 120, description: 'Infra' },
      ]),
    };
    const clientRepo = {
      count: jest.fn().mockResolvedValue(3),
    };

    service = new AiService(
      expenseRepo as any,
      txRepo as any,
      clientRepo as any,
    );
  });

  it('analyzes expenses with deterministic fallback', async () => {
    const result = await service.analyzeExpenses('company-1', { lookbackMonths: 6 });
    expect(result.generatedAt).toBeDefined();
    expect(result.summary).toContain('month');
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('returns forecast values', async () => {
    const result = await service.forecast('company-1', {});
    expect(result.nextMonthExpense).toBeGreaterThanOrEqual(0);
    expect(result.timeline).toHaveLength(3);
  });

  it('returns optimization recommendations', async () => {
    const result = await service.optimizeCosts('company-1');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('categorizes expense without AI key', async () => {
    const category = await service.categorizeExpense({
      amount: 200,
      vendor: 'Google Cloud',
      notes: 'infra workload',
    });
    expect(category).toBe('Cloud');
  });
});
