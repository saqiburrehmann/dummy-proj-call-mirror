import { Body, Controller, Get, Post } from '@nestjs/common';
import { NotificationsService } from './notification.service';
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Post('subscribe')
  async subscribe(@Body() subscription: any) {
    this.notificationsService.addSubscription(subscription);
    return { message: 'Subscription added successfully' };
  }
  @Get('public-key')
  getVapidPublicKey() {
    return {
      publicKey: this.notificationsService.getPublicKey(),
    };
  }
  @Post('test')
  async sendTestNotification(@Body() data: { title: string; callId: string }) {
    const payload = {
      title: data.title,
      body: `Call ID: ${data.callId}`,
      icon: '/icons/call-icon.png',
      tag: `call-${data.callId}`,
    };
    await this.notificationsService.sendNotificationToAll(payload);
    return { success: true };
  }
}
