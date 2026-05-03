import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const notificationsService = {
    listMine: jest.fn(),
    unreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  let controller: NotificationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationsController(notificationsService as any);
  });

  it('lists notifications for the current user', () => {
    controller.listMine('user-1');

    expect(notificationsService.listMine).toHaveBeenCalledWith('user-1');
  });

  it('returns the unread count for the current user', () => {
    controller.unreadCount('user-1');

    expect(notificationsService.unreadCount).toHaveBeenCalledWith('user-1');
  });

  it('marks a single notification as read', () => {
    controller.markAsRead('user-1', 'notif-1');

    expect(notificationsService.markAsRead).toHaveBeenCalledWith('user-1', 'notif-1');
  });

  it('marks every notification as read', () => {
    controller.markAllAsRead('user-1');

    expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('user-1');
  });
});
