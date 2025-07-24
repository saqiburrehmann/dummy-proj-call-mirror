import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('CallGateway');

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtservice: JwtService,
  ) {
    // Redis subscriber listens to events from other instances
    this.redisService.getSubscriber().subscribe('call-events', (err) => {
      if (err) this.logger.error('Redis subscription failed', err);
    });

    this.redisService.getSubscriber().on('message', (channel, message) => {
      const parsed = JSON.parse(message);
      this.logger.log(`Redis broadcasted ${parsed.event} to ${parsed.to}`);
      this.server.to(parsed.to).emit(parsed.event, parsed.data);
    });
  }

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    try {
      const payload = this.jwtservice.verify(token);
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
      };

      await this.redisService.set(`socket:${payload.sub}`, client.id);
      this.logger.log(`Client connected: ${client.id} (${payload.email})`);

      const user = client.data.user;
      await this.broadcast('presence:update', user.id, {
        userId: user.id,
        status: 'online',
      });
    } catch (error) {
      this.logger.warn('Invalid socket token, disconnecting...');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;

    if (user?.id) {
      await this.redisService.del(`socket:${user.id}`);
      this.logger.log(`Client disconnected: ${client.id} (${user.email})`);

      await this.broadcast('presence:update', user.id, {
        userId: user.id,
        status: 'offline',
      });
    }
  }

  private async broadcast(event: string, toUserId: string, data: any) {
    const socketId = await this.redisService.get<string>(`socket:${toUserId}`);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }

    // Redis broadcast for horizontal scaling
    await this.redisService
      .getPublisher()
      .publish('call-events', JSON.stringify({ event, to: toUserId, data }));
  }

  @SubscribeMessage('call:invite')
  async handleCallInvite(@MessageBody() payload: any) {
    this.logger.log(`Call Invite: ${JSON.stringify(payload)}`);
    await this.broadcast('call:invite', payload.to, payload);
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(@MessageBody() payload: any) {
    this.logger.log(`Call Accept: ${JSON.stringify(payload)}`);
    await this.broadcast('call:accept', payload.to, payload);
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(@MessageBody() payload: any) {
    this.logger.log(`Call Reject: ${JSON.stringify(payload)}`);
    await this.broadcast('call:reject', payload.to, payload);
  }

  @SubscribeMessage('webrtc:offer')
  async handleOffer(@MessageBody() payload: any) {
    this.logger.log(`WebRTC Offer: ${JSON.stringify(payload)}`);
    await this.broadcast('webrtc:offer', payload.to, payload);
  }

  @SubscribeMessage('webrtc:answer')
  async handleAnswer(@MessageBody() payload: any) {
    this.logger.log(`WebRTC Answer: ${JSON.stringify(payload)}`);
    await this.broadcast('webrtc:answer', payload.to, payload);
  }

  @SubscribeMessage('webrtc:ice')
  async handleIceCandidate(@MessageBody() payload: any) {
    this.logger.log(`WebRTC ICE: ${JSON.stringify(payload)}`);
    await this.broadcast('webrtc:ice', payload.to, payload);
  }

  @SubscribeMessage('presence:update')
  async handlePresenceUpdate(@MessageBody() payload: any) {
    this.logger.log(`Presence Update: ${JSON.stringify(payload)}`);
    await this.broadcast('presence:update', payload.to, payload);
  }
}
