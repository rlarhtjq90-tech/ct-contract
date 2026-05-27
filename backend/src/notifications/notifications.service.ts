import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
  ) {}

  findAll(userId?: number) {
    return this.repo.find({
      where: userId ? { targetUserId: userId } : {},
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  getUnreadCount() {
    return this.repo.count({ where: { isRead: false } });
  }

  async markRead(id: number) {
    await this.repo.update(id, { isRead: true });
  }

  async create(type: NotificationType, title: string, message: string, refId?: number, refType?: string) {
    const n = this.repo.create({ type, title, message, refId, refType });
    return this.repo.save(n);
  }
}
