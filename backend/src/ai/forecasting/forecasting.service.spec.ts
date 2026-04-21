import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../../entities/expense.entity';
import { ForecastingService } from './forecasting.service';

describe('ForecastingService', () => {
  let service: ForecastingService;
  let expenseRepository: Repository<Expense>;

  const mockExpenseRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastingService,
        {
          provide: getRepositoryToken(Expense),
          useValue: mockExpenseRepository,
        },
      ],
    }).compile();

    service = module.get<ForecastingService>(ForecastingService);
    expenseRepository = module.get<Repository<Expense>>(getRepositoryToken(Expense));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateForecast', () => {
    it('should return forecast with insufficient data message when less than 3 expenses', async () => {
      const request = { companyId: 'company-1', periodMonths: 3 };
      mockExpenseRepository.find.mockResolvedValue([
        { id: '1', amount: 100, expenseDate: '2024-01-01', category: 'Office' },
        { id: '2', amount: 150, expenseDate: '2024-02-01', category: 'Office' },
      ]);

      const result = await service.generateForecast(request);

      expect(result.confidenceScore).toBe(0);
      expect(result.explanation).toContain('Insufficient historical data');
    });

    it('should calculate forecast with sufficient data', async () => {
      const request = { companyId: 'company-1', periodMonths: 3 };
      const mockExpenses = [
        { id: '1', amount: 100, expenseDate: '2023-01-01', category: 'Office' },
        { id: '2', amount: 120, expenseDate: '2023-02-01', category: 'Office' },
        { id: '3', amount: 140, expenseDate: '2023-03-01', category: 'Office' },
        { id: '4', amount: 160, expenseDate: '2023-04-01', category: 'Office' },
        { id: '5', amount: 180, expenseDate: '2023-05-01', category: 'Office' },
        { id: '6', amount: 200, expenseDate: '2023-06-01', category: 'Office' },
      ];
      mockExpenseRepository.find.mockResolvedValue(mockExpenses);

      const result = await service.generateForecast(request);

      expect(result.predictedAmount).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(['increasing', 'stable', 'decreasing']).toContain(result.trend);
      expect(result.explanation).toBeDefined();
    });
  });
});