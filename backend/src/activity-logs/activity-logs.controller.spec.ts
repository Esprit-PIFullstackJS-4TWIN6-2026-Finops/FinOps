import { ActivityLogsController } from './activity-logs.controller';

describe('ActivityLogsController', () => {
  const service = {
    findByCompany: jest.fn(),
  };

  let controller: ActivityLogsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ActivityLogsController(service as any);
  });

  it('returns an empty list when the user has no company context', () => {
    expect(controller.list({} as any)).toEqual([]);
    expect(service.findByCompany).not.toHaveBeenCalled();
  });

  it('lists activity logs for the active company', () => {
    const logs = [{ id: 1 }];
    service.findByCompany.mockReturnValue(logs);

    expect(controller.list({ activeCompanyId: 'company-1' } as any)).toBe(logs);
    expect(service.findByCompany).toHaveBeenCalledWith('company-1');
  });
});
