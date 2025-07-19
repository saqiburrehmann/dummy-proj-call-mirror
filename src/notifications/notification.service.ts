import { Injectable } from '@nestjs/common';
import * as webPush from 'web-push';
@Injectable()
export class NotificationsService {
  private subscriptions: webPush.PushSubscription[] = [];
  constructor() {
    webPush.setVapidDetails(
      'mailto:you@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }
  addSubscription(subscription: webPush.PushSubscription) {
    // TODO: Store in DB instead of memory
    this.subscriptions.push(subscription);
  }
  async sendNotificationToAll(payload: any) {
    const notificationPayload = JSON.stringify(payload);
    const sendResults = await Promise.allSettled(
      this.subscriptions.map((sub) =>
        webPush.sendNotification(sub, notificationPayload),
      ),
    );
    // Optionally: remove invalid subscriptions
    sendResults.forEach((result, index) => {
      if (
        result.status === 'rejected' &&
        (result.reason.statusCode === 410 || result.reason.statusCode === 404)
      ) {
        this.subscriptions.splice(index, 1);
      }
    });
    return sendResults;
  }
  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || '';
  }
}
