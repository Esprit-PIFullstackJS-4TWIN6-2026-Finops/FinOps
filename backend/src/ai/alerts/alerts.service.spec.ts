import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../../entities/expense.entity';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let expenseRepository: Repository<Expense>;

  const mockExpenseRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Expense),
          useValue: mockExpenseRepository,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    expenseRepository = module.get<Repository<Expense>>(getRepositoryToken(Expense));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAlerts', () => {
    it('should return empty array when insufficient data', async () => {
      const request = { companyId: 'company-1' };
      mockExpenseRepository.find.mockResolvedValue([
        { id: '1', amount: 100, expenseDate: '2024-01-01', category: 'Office' },
      ]);

      const result = await service.getAlerts(request);

      expect(result).toEqual([]);
    });

    it('should detect high-risk expense anomaly', async () => {
      const request = { companyId: 'company-1' };
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const recentDate = new Date(now.getFullYear(), now.getMonth(), 15);

      const mockExpenses = [
        // Historical data (last 6 months) - small amounts
        { id: '1', amount: -100, expenseDate: sixMonthsAgo.toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '2', amount: -105, expenseDate: new Date(sixMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '3', amount: -98, expenseDate: new Date(sixMonthsAgo.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '4', amount: -102, expenseDate: new Date(sixMonthsAgo.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '5', amount: -99, expenseDate: new Date(sixMonthsAgo.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '6', amount: -101, expenseDate: oneMonthAgo.toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        // Recent anomalous expense (last month) - very high amount
        { id: '7', amount: -5000, expenseDate: recentDate.toISOString().split('T')[0], category: 'Office', vendor: 'Google' }, // Very high anomaly
      ];
      mockExpenseRepository.find.mockResolvedValue(mockExpenses);

      const result = await service.getAlerts(request);

      expect(result.length).toBeGreaterThan(0);
      // Should trigger RULE 2 (EXTREME EXPENSE) for amounts >= 1000
      const criticalAlert = result.find(a => a.alertLevel === 'critical');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.expenseId).toBe('7');
      expect(criticalAlert?.amount).toBe(5000);
    });

    it('should not generate alerts for normal expenses', async () => {
      const request = { companyId: 'company-1' };
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const recentDate = new Date(now.getFullYear(), now.getMonth(), 15);

      const mockExpenses = [
        // Historical data
        { id: '1', amount: -100, expenseDate: sixMonthsAgo.toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '2', amount: -105, expenseDate: new Date(sixMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '3', amount: -98, expenseDate: new Date(sixMonthsAgo.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '4', amount: -102, expenseDate: new Date(sixMonthsAgo.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '5', amount: -99, expenseDate: new Date(sixMonthsAgo.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        { id: '6', amount: -101, expenseDate: oneMonthAgo.toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
        // Recent normal expense
        { id: '7', amount: -103, expenseDate: recentDate.toISOString().split('T')[0], category: 'Office', vendor: 'Office Depot' },
      ];
      mockExpenseRepository.find.mockResolvedValue(mockExpenses);

      const result = await service.getAlerts(request);

      expect(result.length).toBe(0);
    });
  });
});