import { ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const invoiceRepo = {
    find: jest.fn(),
  };
  const expenseRepo = {
    find: jest.fn(),
  };
  const clientRepo = {
    count: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(
      invoiceRepo as any,
      expenseRepo as any,
      clientRepo as any,
    );
  });

  it('aggregates invoice, expense, and client summary data', async () => {
    invoiceRepo.find.mockResolvedValue([
      { id: '1', date: '2024-01-01', total: '100', status: 'Draft' },
      { id: '2', date: '2024-01-12', total: '150.5', status: 'Paid' },
      { id: '3', date: '2024-02-08', total: '200', status: 'Sent' },
      { id: '4', date: '2024-03-02', total: '50', status: 'Overdue' },
      { id: '5', date: '2024-04-01', total: null, status: 'Paid' },
      { id: '6', date: 'bad-date', total: 'NaN', status: 'Paid' },
    ]);
    expenseRepo.find.mockResolvedValue([
      { amount: '25', expenseDate: '2024-01-05' },
      { amount: 10, expenseDate: '2024-02-15' },
      { amount: null, expenseDate: 'bad-date' },
    ]);
    clientRepo.count.mockResolvedValue(4);

    const result = await service.getSummary({ companyId: 'company-1' } as any);

    expect(invoiceRepo.find).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      select: ['id', 'date', 'total', 'status'],
    });
    expect(expenseRepo.find).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      select: ['amount', 'expenseDate'],
    });
    expect(clientRepo.count).toHaveBeenCalledWith({ where: { companyId: 'company-1' } });
    expect(result).toEqual({
      invoicedTotal: 400.5,
      paidTotal: 150.5,
      outstandingTotal: 250,
      expenseTotal: 35,
      netPaidMinusExpenses: 115.5,
      invoiceCount: 6,
      expenseCount: 3,
      clientCount: 4,
      monthly: [
        { period: '2024-01', revenue: 150.5, expenses: 25 },
        { period: '2024-02', revenue: 200, expenses: 10 },
        { period: '2024-03', revenue: 50, expenses: 0 },
        { period: '2024-04', revenue: 0, expenses: 0 },
        { period: 'bad-dat', revenue: 0, expenses: 0 },
      ],
    });
  });

  it('throws when the user has no active company', async () => {
    await expect(service.getSummary({} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
