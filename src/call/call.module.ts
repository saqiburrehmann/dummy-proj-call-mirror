// src/call/call.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { User } from 'src/user/entities/user.entity';
import { CallGateway } from './call.gateway';
import { RedisService } from 'src/redis/redis.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Call, User]), AuthModule],
  providers: [CallService, CallGateway, RedisService],
  controllers: [CallController],
})
export class CallModule {}
