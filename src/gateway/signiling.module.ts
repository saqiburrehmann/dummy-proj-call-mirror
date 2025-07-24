import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { UserModule } from 'src/user/user.module';
@Module({
  imports: [UserModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
