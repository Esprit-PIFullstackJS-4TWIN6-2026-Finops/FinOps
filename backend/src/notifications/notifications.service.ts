import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async createForUser(input: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || 'info',
      link: input.link,
    });
    return this.notificationRepo.save(notification);
  }

  async listMine(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, readAt: IsNull() } });
  }

  async markAsRead(userId: string, id: string): Promise<{ success: boolean }> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    }
    return { success: true };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
    return { success: true };
  }
}
