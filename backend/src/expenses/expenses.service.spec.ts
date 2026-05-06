import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  const repo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const aiService = {
    categorizeExpense: jest.fn(),
  };

  let service: ExpensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => value);
    repo.remove.mockResolvedValue(undefined);
    service = new ExpensesService(repo as any, aiService as any);
  });

  it('lists expenses by company in descending creation order', async () => {
    repo.find.mockResolvedValue([{ id: 'expense-1' }]);

    await expect(service.findAll('company-1')).resolves.toEqual([{ id: 'expense-1' }]);
    expect(repo.find).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      order: { createdAt: 'DESC' },
    });
  });

  it('throws when an expense does not exist', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('company-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates an expense with a trimmed manual category', async () => {
    const dto = {
      category: ' Travel ',
      amount: 120,
      expenseDate: '2026-05-01',
      vendor: 'Airline',
      notes: 'Flight',
    };

    const result = await service.create('company-1', 'user-1', dto as any);

    expect(aiService.categorizeExpense).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith({
      ...dto,
      category: 'Travel',
      companyId: 'company-1',
      createdBy: 'user-1',
    });
    expect(result).toEqual({
      ...dto,
      category: 'Travel',
      companyId: 'company-1',
      createdBy: 'user-1',
    });
  });

  it('uses the AI category when the category is auto', async () => {
    aiService.categorizeExpense.mockResolvedValue('Software');

    const result = await service.create('company-1', 'user-1', {
      category: 'auto',
      amount: 55,
      expenseDate: '2026-05-02',
      vendor: 'Figma',
      notes: 'Monthly renewal',
    } as any);

    expect(aiService.categorizeExpense).toHaveBeenCalledWith({
      vendor: 'Figma',
      notes: 'Monthly renewal',
      amount: 55,
    });
    expect(result).toEqual(
      expect.objectContaining({
        category: 'Software',
      }),
    );
  });

  it('prevents employees from editing other users expenses', async () => {
    repo.findOne.mockResolvedValue({
      id: 'expense-1',
      companyId: 'company-1',
      createdBy: 'owner-1',
    });

    await expect(
      service.update(
        { id: 'employee-1', role: UserRole.EMPLOYEE } as any,
        'company-1',
        'expense-1',
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates an expense and normalizes the date when auto category is requested', async () => {
    const expense = {
      id: 'expense-1',
      companyId: 'company-1',
      createdBy: 'employee-1',
      vendor: 'Old vendor',
      notes: 'Old note',
      amount: 75,
      expenseDate: '2026-04-01',
      category: 'Old',
    };
    repo.findOne.mockResolvedValue(expense);
    aiService.categorizeExpense.mockResolvedValue('Operations');

    const result = await service.update(
      { id: 'employee-1', role: UserRole.EMPLOYEE } as any,
      'company-1',
      'expense-1',
      {
        category: ' auto ',
        amount: 99,
        expenseDate: '2026-05-20T12:30:00.000Z',
        vendor: 'New vendor',
        notes: 'Updated note',
      } as any,
    );

    expect(aiService.categorizeExpense).toHaveBeenCalledWith({
      vendor: 'New vendor',
      notes: 'Updated note',
      amount: 99,
    });
    expect(result).toEqual(
      expect.objectContaining({
        amount: 99,
        expenseDate: '2026-05-20',
        vendor: 'New vendor',
        notes: 'Updated note',
        category: 'Operations',
      }),
    );
  });

  it('removes an expense when the user can edit it', async () => {
    repo.findOne.mockResolvedValue({
      id: 'expense-1',
      companyId: 'company-1',
      createdBy: 'manager-1',
    });

    await expect(
      service.remove(
        { id: 'manager-1', role: UserRole.MANAGER } as any,
        'company-1',
        'expense-1',
      ),
    ).resolves.toEqual({ deleted: true });
    expect(repo.remove).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'expense-1',
      }),
    );
  });
});
