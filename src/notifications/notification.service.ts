import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as webPush from 'web-push';
import { Repository } from 'typeorm';
import { NotificationSubscription } from './entities/notification-subscription.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationSubscription)
    private readonly subscriptionRepo: Repository<NotificationSubscription>,
  ) {
    webPush.setVapidDetails(
      'mailto:you@example.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  async addSubscription(userId: string, subscription: any) {
    const existing = await this.subscriptionRepo.findOne({
      where: {
        user: { id: userId },
        subscription,
      },
      relations: ['user'],
    });

    if (!existing) {
      await this.subscriptionRepo.save({
        user: { id: userId },
        subscription,
      });
    }
  }

  async sendNotificationToAll(payload: any) {
    const all = await this.subscriptionRepo.find({ relations: ['user'] });

    const notificationPayload = JSON.stringify(payload);

    const sendResults = await Promise.allSettled(
      all.map((sub) =>
        webPush.sendNotification(sub.subscription, notificationPayload),
      ),
    );

    for (let i = 0; i < sendResults.length; i++) {
      const result = sendResults[i];
      if (
        result.status === 'rejected' &&
        (result.reason.statusCode === 410 || result.reason.statusCode === 404)
      ) {
        await this.subscriptionRepo.remove(all[i]);
      }
    }

    return sendResults;
  }

  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || '';
  }
}
