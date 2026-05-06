import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const queryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };
  const notificationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(notificationRepo as any);
  });

  it('creates and saves a notification with the default type', async () => {
    const created = { id: 'notif-1', type: 'info' };
    notificationRepo.create.mockReturnValue(created);
    notificationRepo.save.mockResolvedValue(created);

    const result = await service.createForUser({
      userId: 'user-1',
      title: 'Hello',
      message: 'World',
    });

    expect(notificationRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Hello',
      message: 'World',
      type: 'info',
      link: undefined,
    });
    expect(result).toBe(created);
  });

  it('lists recent notifications for a user', async () => {
    notificationRepo.find.mockResolvedValue([{ id: 'notif-1' }]);

    await expect(service.listMine('user-1')).resolves.toEqual([{ id: 'notif-1' }]);
    expect(notificationRepo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  });

  it('counts unread notifications', async () => {
    notificationRepo.count.mockResolvedValue(3);

    await expect(service.unreadCount('user-1')).resolves.toBe(3);
    expect(notificationRepo.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });

  it('marks a notification as read when it exists', async () => {
    const notification = { id: 'notif-1', userId: 'user-1', readAt: undefined };
    notificationRepo.findOne.mockResolvedValue(notification);
    notificationRepo.save.mockResolvedValue(notification);

    await expect(service.markAsRead('user-1', 'notif-1')).resolves.toEqual({ success: true });
    expect(notificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ readAt: expect.any(Date) }),
    );
  });

  it('throws when trying to mark a missing notification as read', async () => {
    notificationRepo.findOne.mockResolvedValue(null);

    await expect(service.markAsRead('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marks all unread notifications as read', async () => {
    queryBuilder.execute.mockResolvedValue({ affected: 2 });

    await expect(service.markAllAsRead('user-1')).resolves.toEqual({ success: true });
    expect(notificationRepo.createQueryBuilder).toHaveBeenCalled();
    expect(queryBuilder.set).toHaveBeenCalledWith({ readAt: expect.any(Date) });
    expect(queryBuilder.where).toHaveBeenCalledWith('user_id = :userId', { userId: 'user-1' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('read_at IS NULL');
  });
});
