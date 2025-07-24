import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSubscription } from './entities/notification-subscription.entity';
import { UserModule } from 'src/user/user.module';
@Module({
  imports: [TypeOrmModule.forFeature([NotificationSubscription]), UserModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
