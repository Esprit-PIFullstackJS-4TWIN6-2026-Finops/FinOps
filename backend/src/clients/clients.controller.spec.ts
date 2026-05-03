import { ClientsController } from './clients.controller';

describe('ClientsController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = { activeCompanyId: 'company-1', companyId: 'company-fallback' } as any;

  let controller: ClientsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ClientsController(service as any);
  });

  it('lists clients for the current company', () => {
    controller.findAll(user);

    expect(service.findAll).toHaveBeenCalledWith('company-1');
  });

  it('returns a client by id for the current company', () => {
    controller.findOne(user, 'client-1');

    expect(service.findOne).toHaveBeenCalledWith('company-1', 'client-1');
  });

  it('creates a client for the current company', () => {
    const dto = { name: 'Acme' };

    controller.create(user, dto as any);

    expect(service.create).toHaveBeenCalledWith('company-1', dto);
  });

  it('updates a client for the current company', () => {
    const dto = { email: 'new@example.com' };

    controller.update(user, 'client-1', dto as any);

    expect(service.update).toHaveBeenCalledWith('company-1', 'client-1', dto);
  });

  it('removes a client for the current company', () => {
    controller.remove(user, 'client-1');

    expect(service.remove).toHaveBeenCalledWith('company-1', 'client-1');
  });
});
