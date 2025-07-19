import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private users: Map<string, ActiveUser> = new Map(); 
  handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token;
    const userId = this.verifyToken(token);
    if (!userId) {
      console.log('Invalid token. Disconnecting...');
      socket.disconnect();
      return;
    }
    socket.data.userId = userId;
    this.users.set(userId, { socketId: socket.id, userId });
    this.updatePresence();
    console.log(`User connected: ${userId}`);
  }
  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    this.users.delete(userId);
    this.updatePresence();
    console.log(`User disconnected: ${userId}`);
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
  handleCallInitiate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { contactId: string; type: 'audio' | 'video' },
  ) {
    const fromUserId = socket.data.userId;
    const to = this.users.get(data.contactId);
    const callId = `${fromUserId}-${Date.now()}`;
    if (to) {
      this.server.to(to.socketId).emit('call:incoming', {
        callId,
        from: { id: fromUserId, isOnline: true }, 
        type: data.type,
      });
    }
  }
  @SubscribeMessage('call:accept')
  handleCallAccept(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const fromUserId = socket.data.userId;
    const [initiatorId] = data.callId.split('-');
    const to = this.users.get(initiatorId);
    if (to) {
      this.server
        .to(to.socketId)
        .emit('call:accepted', { callId: data.callId, by: fromUserId });
    }
  }
  @SubscribeMessage('call:decline')
  handleCallDecline(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const fromUserId = socket.data.userId;
    const [initiatorId] = data.callId.split('-');
    const to = this.users.get(initiatorId);
    if (to) {
      this.server
        .to(to.socketId)
        .emit('call:declined', { callId: data.callId, by: fromUserId });
    }
  }
  @SubscribeMessage('call:end')
  handleCallEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const fromUserId = socket.data.userId;
    const [otherUserId] = data.callId
      .split('-')
      .filter((id) => id !== fromUserId);
    const to = this.users.get(otherUserId);
    if (to) {
      this.server
        .to(to.socketId)
        .emit('call:ended', { callId: data.callId, by: fromUserId });
    }
  }
  @SubscribeMessage('webrtc:signal')
  handleWebRTCSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: string; signal: any },
  ) {
    const fromUserId = socket.data.userId;
    const [otherUserId] = data.callId
      .split('-')
      .filter((id) => id !== fromUserId);
    const to = this.users.get(otherUserId);
    if (to) {
      this.server.to(to.socketId).emit('webrtc:signal', {
        callId: data.callId,
        signal: data.signal,
      });
    }
  }
}
