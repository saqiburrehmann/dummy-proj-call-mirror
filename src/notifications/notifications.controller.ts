import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { NotificationsService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Save push notification subscription for the current user
   * - Requires JWT token
   * - Accepts push subscription object with endpoint and keys
   * - Saves it to DB linked with authenticated user
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subscribe to push notifications',
    description: `
This endpoint saves the push subscription for the authenticated user.

### Requirements:
- Must include Authorization header with Bearer token
- Body must contain:
  - endpoint: string
  - keys: object with p256dh and auth fields

### Example body:
\`\`\`json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/some-token",
  "keys": {
    "p256dh": "base64-encoded-key",
    "auth": "base64-encoded-auth-key"
  }
}
\`\`\`
    `,
  })
  @ApiBody({ type: SubscribePushDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription saved successfully',
    schema: {
      example: {
        message: 'Subscription saved successfully',
      },
    },
  })
  async subscribe(@Body() subscription: SubscribePushDto, @Req() req: any) {
    const userId = req.user.id;
    await this.notificationsService.addSubscription(userId, subscription);
    return { message: 'Subscription saved successfully' };
  }

  /**
   * Returns VAPID public key for push notifications
   * - This key is used by the frontend to encrypt push payloads
   */
  @Get('public-key')
  @ApiOperation({
    summary: 'Get VAPID public key',
    description: `
Returns the VAPID public key that the frontend needs
to initialize push notifications using the browser's Push API.

No authentication required.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'VAPID public key returned',
    schema: {
      example: {
        publicKey: 'BCEyD.....',
      },
    },
  })
  getVapidPublicKey() {
    return {
      publicKey: this.notificationsService.getPublicKey(),
    };
  }

  /**
   * Test push notification endpoint
   * - Sends a test notification to all saved subscriptions
   */
  @Post('test')
  @ApiOperation({
    summary: 'Send test push notification to all users',
    description: `
Sends a sample push notification to all users who have active subscriptions.

Useful for testing notifications from the backend.
    `,
  })
  @ApiBody({
    schema: {
      example: {
        title: 'Incoming Call',
        callId: 'abc123',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent to all users',
    schema: {
      example: {
        success: true,
      },
    },
  })
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
