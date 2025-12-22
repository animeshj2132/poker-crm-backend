import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:8083',
      'http://localhost:8084',
      'http://localhost:8085',
      'http://localhost:8086',
      'http://localhost:8087',
      'http://localhost:8088',
      'http://localhost:8089',
      'http://localhost:8090'
    ],
    credentials: true
  },
  namespace: '/realtime'
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly eventsService: EventsService) {}

  afterInit(server: Server) {
    this.eventsService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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

    this.logger.log(`Client ${client.id} subscribing to club ${data.clubId}`);
    this.eventsService.subscribeToClub(client.id, data.clubId, data.playerId);
    client.emit('subscribed', { clubId: data.clubId });
  }

  @SubscribeMessage('subscribe:player')
  handleSubscribePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string; clubId: string }
  ) {
    if (!data || !data.playerId || !data.clubId) {
      client.emit('error', { message: 'Player ID and Club ID are required' });
      return;
    }

    this.logger.log(`Client ${client.id} subscribing to player ${data.playerId}`);
    this.eventsService.subscribeToPlayer(client.id, data.playerId, data.clubId);
    client.emit('subscribed', { playerId: data.playerId, clubId: data.clubId });
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

