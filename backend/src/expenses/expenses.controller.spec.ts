import { ExpensesController } from './expenses.controller';

describe('ExpensesController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = { id: 'user-1', activeCompanyId: 'company-1', companyId: 'company-fallback' } as any;

  let controller: ExpensesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ExpensesController(service as any);
  });

  it('lists expenses for the active company', () => {
    controller.findAll(user);

    expect(service.findAll).toHaveBeenCalledWith('company-1');
  });

  it('returns a single expense for the active company', () => {
    controller.findOne(user, 'expense-1');

    expect(service.findOne).toHaveBeenCalledWith('company-1', 'expense-1');
  });

  it('creates an expense for the current user', () => {
    const dto = { category: 'Travel' };

    controller.create(user, dto as any);

    expect(service.create).toHaveBeenCalledWith('company-1', 'user-1', dto);
  });

  it('updates an expense for the active company', () => {
    const dto = { notes: 'Updated' };

    controller.update(user, 'expense-1', dto as any);

    expect(service.update).toHaveBeenCalledWith(user, 'company-1', 'expense-1', dto);
  });

  it('removes an expense for the active company', () => {
    controller.remove(user, 'expense-1');

    expect(service.remove).toHaveBeenCalledWith(user, 'company-1', 'expense-1');
  });
});
