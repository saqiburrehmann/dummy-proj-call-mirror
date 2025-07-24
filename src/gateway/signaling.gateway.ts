import { InjectRepository } from '@nestjs/typeorm';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { User } from 'src/user/entities/user.entity';
import { Contact } from 'src/contact/entities/contact.entity';
import { Repository } from 'typeorm';
import { RedisService } from 'src/redis/redis.service';

interface ActiveUser {
  socketId: string;
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  @WebSocketServer()
  server: Server;

  private users: Map<string, ActiveUser> = new Map();

  async onModuleInit() {
    const subscriber = this.redisService.getSubscriber();
    await subscriber.subscribe('call-events');

    subscriber.on('message', (channel, message) => {
      try {
        const { event, payload } = JSON.parse(message);
        if (event === 'call:incoming') return;
        this.server.emit(event, payload);
      } catch (err) {
        console.error('Failed to parse Redis message:', message);
      }
    });
  }

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token;
    const userId = this.verifyToken(token);
    if (!userId) {
      console.log('Invalid token. Disconnecting...');
      socket.disconnect();
      return;
    }

    socket.data.userId = userId;
    this.users.set(userId, { socketId: socket.id, userId });
    await this.userRepository.update(userId, { isOnline: true });
    this.updatePresence();
    console.log(`✅ User connected: ${userId}`);
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    this.users.delete(userId);
    if (userId) {
      await this.userRepository.update(userId, { isOnline: false });
      this.server.emit('presence:offline', { id: userId });
    }
    this.updatePresence();
    console.log(`❌ User disconnected: ${userId}`);
  }

  private updatePresence() {
    const contacts = Array.from(this.users.values()).map((u) => ({
      id: u.userId,
      isOnline: true,
    }));
    this.server.emit('presence:update', contacts);
  }

  private verifyToken(token: string): string | null {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      return payload.sub || payload.id || payload._id;
    } catch (e) {
      return null;
    }
  }

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { contactId: string; type: 'audio' | 'video' },
  ) {
    const fromUserId = socket.data.userId;
    const callId = `${fromUserId}-${Date.now()}`;
    console.log('📞 [call:initiate] Received call request');
    try {
      const contact = await this.userRepository.manager.findOne(Contact, {
        where: { id: data.contactId },
        relations: ['contactUser'],
      });
      if (!contact?.contactUser) {
        socket.emit('call:error', { message: 'Contact not found or invalid.' });
        return;
      }
      const toUserId = contact.contactUser.id;
      if (fromUserId === toUserId) {
        socket.emit('call:error', { message: 'Cannot call yourself.' });
        return;
      }
      const to = this.users.get(toUserId);
      if (!to) {
        socket.emit('call:error', {
          message: 'User is offline or unavailable.',
        });
        return;
      }
      const caller = await this.userRepository.findOne({
        where: { id: fromUserId },
        select: ['id', 'fullName', 'email'],
      });
      if (!caller) {
        console.log(`❌ Caller not found`);
        return;
      }
      const payload = {
        callId,
        from: {
          id: caller.id,
          fullName: caller.fullName,
          email: caller.email,
          isOnline: true,
        },
        type: data.type,
      };
      // ✅ Send call:initiated back to caller to confirm callId
      socket.emit('call:initiated', { callId });
      // 🔄 Emit to callee (incoming call)
      this.server.to(to.socketId).emit('call:incoming', payload);
      // 📡 Publish to Redis
      await this.redisService
        .getPublisher()
        .publish(
          'call-events',
          JSON.stringify({ event: 'call:incoming', payload }),
        );
      console.log(
        `📤 Call emitted: ${caller.fullName} ➡️ ${contact.contactUser.fullName}`,
      );
    } catch (error) {
      console.error('🔥 Error in call:initiate handler:', error);
      socket.emit('call:error', { message: 'Failed to initiate call.' });
    }
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const fromUserId = socket.data.userId;
    const [initiatorId] = data.callId.split('-');
    const to = this.users.get(initiatorId);
    const payload = { callId: data.callId, by: fromUserId };

    if (to) {
      this.server.to(to.socketId).emit('call:accepted', payload);
    }

    await this.redisService
      .getPublisher()
      .publish(
        'call-events',
        JSON.stringify({ event: 'call:accepted', payload }),
      );
  }

  @SubscribeMessage('call:decline')
  async handleCallDecline(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const fromUserId = socket.data.userId;
    const [initiatorId] = data.callId.split('-');
    const to = this.users.get(initiatorId);
    const payload = { callId: data.callId, by: fromUserId };

    if (to) {
      this.server.to(to.socketId).emit('call:declined', payload);
    }

    await this.redisService
      .getPublisher()
      .publish(
        'call-events',
        JSON.stringify({ event: 'call:declined', payload }),
      );
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const fromUserId = socket.data.userId;
    const [otherUserId] = data.callId
      .split('-')
      .filter((id) => id !== fromUserId);
    const to = this.users.get(otherUserId);
    const payload = { callId: data.callId, by: fromUserId };

    if (to) {
      this.server.to(to.socketId).emit('call:ended', payload);
    }

    await this.redisService
      .getPublisher()
      .publish('call-events', JSON.stringify({ event: 'call:ended', payload }));
  }

  @SubscribeMessage('signal')
  handleSignal(
    @MessageBody() data: { callId: string; signal: any; targetId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const from = client.id;
    const { callId, signal, targetId } = data;
    console.log(`🔁 Relaying signal from ${from} to ${targetId}:`, signal.type);
    this.server.to(targetId).emit('signal', {
      callId,
      signal,
      from, // ✅ include sender ID
    });
  }

  @SubscribeMessage('call:signal')
  async handleCallSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string; signal: any },
  ) {
    const fromUserId = socket.data.userId;
    const [otherUserId] = data.callId
      .split('-')
      .filter((id) => id !== fromUserId);
    const to = this.users.get(otherUserId);

    const payload = {
      callId: data.callId,
      signal: data.signal,
      from: fromUserId,
    };

    if (to) {
      this.server.to(to.socketId).emit('call:signal', payload);
    }

    await this.redisService
      .getPublisher()
      .publish(
        'call-events',
        JSON.stringify({ event: 'call:signal', payload }),
      );
  }
}
