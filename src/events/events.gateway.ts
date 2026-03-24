import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EventsService } from './events.service';
import { isOriginAllowed } from '../common/security/cors-origins';
import { verifyAppJwt } from '../common/security/jwt';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true
  },
  namespace: '/realtime',
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly eventsService: EventsService) {}

  private getSocketJwt(client: Socket): { sub: string; type: 'staff' | 'player'; clubId?: string } | null {
    return ((client.data as any)?.jwt as { sub: string; type: 'staff' | 'player'; clubId?: string }) || null;
  }

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const authHeader = socket.handshake.headers?.authorization;
        const bearerToken =
          typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : undefined;
        const authToken = typeof socket.handshake.auth?.token === 'string'
          ? socket.handshake.auth.token
          : undefined;
        const token = authToken || bearerToken;

        if (!token) {
          return next(new Error('Unauthorized: missing websocket token'));
        }

        const payload = verifyAppJwt(token);
        (socket.data as any).jwt = payload;
        return next();
      } catch (error) {
        return next(new Error('Unauthorized: invalid websocket token'));
      }
    });

    this.eventsService.setServer(server);
    this.logger.log('WebSocket Gateway initialized with connection state recovery (Redis adapter set via main.ts)');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} (recovered: ${client.recovered})`);

    // If client recovered from a brief disconnect, their subscriptions are still intact
    if (client.recovered) {
      this.logger.log(`Client ${client.id} recovered session - no re-subscription needed`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.eventsService.removeClient(client.id);
  }

  @SubscribeMessage('subscribe:club')
  handleSubscribeClub(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { clubId: string; playerId?: string }
  ) {
    if (!data || !data.clubId) {
      client.emit('error', { message: 'Club ID is required' });
      return;
    }

    const socketJwt = this.getSocketJwt(client);
    if (!socketJwt) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (socketJwt.clubId && socketJwt.clubId !== data.clubId) {
      client.emit('error', { message: 'Forbidden: invalid club scope' });
      return;
    }

    this.logger.log(`Client ${client.id} subscribing to club ${data.clubId}`);
    this.eventsService.subscribeToClub(client.id, data.clubId, data.playerId);
    client.emit('subscribed', { clubId: data.clubId });
  }

  @SubscribeMessage('subscribe:player')
  async handleSubscribePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string; clubId: string }
  ) {
    if (!data || !data.playerId || !data.clubId) {
      client.emit('error', { message: 'Player ID and Club ID are required' });
      return;
    }

    const socketJwt = this.getSocketJwt(client);
    if (!socketJwt || socketJwt.type !== 'player' || socketJwt.sub !== data.playerId) {
      client.emit('error', { message: 'Forbidden: invalid player scope' });
      return;
    }
    if (socketJwt.clubId && socketJwt.clubId !== data.clubId) {
      client.emit('error', { message: 'Forbidden: invalid club scope' });
      return;
    }

    this.logger.log(`Client ${client.id} subscribing to player ${data.playerId}`);
    this.eventsService.subscribeToPlayer(client.id, data.playerId, data.clubId);
    client.emit('subscribed', { playerId: data.playerId, clubId: data.clubId });

    // Flush any undelivered messages for this player
    await this.eventsService.flushUndeliveredMessages('player', data.playerId, client);
  }

  @SubscribeMessage('subscribe:staff')
  async handleSubscribeStaff(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { staffId: string; clubId: string }
  ) {
    if (!data || !data.staffId || !data.clubId) {
      client.emit('error', { message: 'Staff ID and Club ID are required' });
      return;
    }

    const socketJwt = this.getSocketJwt(client);
    if (!socketJwt || socketJwt.type !== 'staff' || socketJwt.sub !== data.staffId) {
      client.emit('error', { message: 'Forbidden: invalid staff scope' });
      return;
    }
    if (socketJwt.clubId && socketJwt.clubId !== data.clubId) {
      client.emit('error', { message: 'Forbidden: invalid club scope' });
      return;
    }

    this.logger.log(`Client ${client.id} subscribing to staff ${data.staffId}`);
    this.eventsService.subscribeToStaff(client.id, data.staffId, data.clubId);
    client.emit('subscribed', { staffId: data.staffId, clubId: data.clubId });

    // Flush any undelivered messages for this staff member
    await this.eventsService.flushUndeliveredMessages('staff', data.staffId, client);
  }

  @SubscribeMessage('unsubscribe:club')
  handleUnsubscribeClub(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { clubId: string }
  ) {
    if (data && data.clubId) {
      this.eventsService.unsubscribeFromClub(client.id, data.clubId);
      client.emit('unsubscribed', { clubId: data.clubId });
    }
  }

  @SubscribeMessage('unsubscribe:player')
  handleUnsubscribePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string }
  ) {
    if (data && data.playerId) {
      this.eventsService.unsubscribeFromPlayer(client.id, data.playerId);
      client.emit('unsubscribed', { playerId: data.playerId });
    }
  }
}
