import { AiController } from './ai.controller';
import { UserRole } from '../entities/user.entity';

describe('AiController', () => {
  const mockService = {
    analyzeExpenses: jest.fn().mockResolvedValue({ summary: 'ok', anomalies: [], alerts: [], recommendations: [], generatedAt: new Date().toISOString() }),
    forecast: jest.fn().mockResolvedValue({ nextMonthExpense: 100, next3MonthsTotal: 320, growthTrend: 'increasing', confidence: 0.7, timeline: [], generatedAt: new Date().toISOString() }),
    chat: jest.fn().mockResolvedValue({ answer: 'ok', followUps: [], generatedAt: new Date().toISOString() }),
    optimizeCosts: jest.fn().mockResolvedValue({ summary: 'ok', estimatedMonthlySavings: 10, recommendations: [], generatedAt: new Date().toISOString() }),
    generateMonthlyReport: jest.fn().mockResolvedValue({ month: '2026-03', totalExpenses: 1000, biggestCostSources: [], costIncreaseAnalysis: 'stable', optimizationSuggestions: [], executiveSummary: 'ok', generatedAt: new Date().toISOString() }),
    translate: jest.fn(),
    translateBatch: jest.fn(),
    listLanguages: jest.fn(),
  };

  let controller: AiController;

  beforeEach(() => {
    controller = new AiController(mockService as any);
  });

  it('routes analyze-expenses with current company context', async () => {
    const user = {
      id: 'u1',
      role: UserRole.OWNER,
      companyId: 'company-1',
      activeCompanyId: 'company-2',
    } as any;
    await controller.analyzeExpenses(user, { lookbackMonths: 6 });
    expect(mockService.analyzeExpenses).toHaveBeenCalledWith('company-2', { lookbackMonths: 6 });
  });
});
