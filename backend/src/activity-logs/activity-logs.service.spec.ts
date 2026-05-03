import { ActivityLogsService } from './activity-logs.service';

describe('ActivityLogsService', () => {
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  let service: ActivityLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => value);
    service = new ActivityLogsService(repo as any);
  });

  it('creates and saves a new activity log record', async () => {
    const payload = { companyId: 'company-1', action: 'created' };

    await expect(service.create(payload)).resolves.toEqual(payload);
    expect(repo.create).toHaveBeenCalledWith(payload);
    expect(repo.save).toHaveBeenCalledWith(payload);
  });

  it('finds the most recent activity logs for a company', async () => {
    repo.find.mockResolvedValue([{ id: 1 }]);

    await expect(service.findByCompany('company-1')).resolves.toEqual([{ id: 1 }]);
    expect(repo.find).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  });
});
