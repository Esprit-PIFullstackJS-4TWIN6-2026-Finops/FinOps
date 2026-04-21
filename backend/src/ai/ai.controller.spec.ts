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
  const mockIntakeService = {
    intakeDocument: jest.fn().mockResolvedValue({
      detectedType: 'invoice',
      suggestedAction: 'create_invoice',
      confidenceScore: 88,
      summary: 'ok',
      warnings: [],
      missingFields: [],
      blockingFields: [],
      normalizedTextPreview: 'Invoice',
      invoiceDraft: {
        number: 'INV-100',
        clientName: 'Acme',
        date: '2026-04-01',
        dueDate: '2026-05-01',
        total: 100,
        status: 'Draft',
        lineItems: [],
      },
      generatedAt: new Date().toISOString(),
    }),
  };
  const mockCashFlowService = {
    generate: jest.fn().mockResolvedValue({
      openingCashEstimate: 1000,
      projectedEndingCash: 1450,
      netTrend: 'improving',
      confidence: 0.81,
      summary: 'ok',
      drivers: [],
      actions: [],
      timeline: [],
      generatedAt: new Date().toISOString(),
    }),
  };

  let controller: AiController;

  beforeEach(() => {
    controller = new AiController(
      mockService as any,
      mockIntakeService as any,
      mockCashFlowService as any,
    );
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

  it('routes cash-flow copilot with current company context', async () => {
    const user = {
      id: 'u1',
      role: UserRole.OWNER,
      companyId: 'company-1',
      activeCompanyId: 'company-2',
    } as any;
    await controller.cashFlowCopilot(user, { historyMonths: 12, horizonMonths: 3 });
    expect(mockCashFlowService.generate).toHaveBeenCalledWith('company-2', {
      historyMonths: 12,
      horizonMonths: 3,
    });
  });
});
