import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server!: Server;
  private clientSubscriptions: Map<string, Set<string>> = new Map(); // clientId -> Set of clubIds/playerIds
  private clubSubscriptions: Map<string, Set<string>> = new Map(); // clubId -> Set of clientIds
  private playerSubscriptions: Map<string, Set<string>> = new Map(); // playerId -> Set of clientIds

  setServer(server: Server) {
    this.server = server;
  }

  subscribeToClub(clientId: string, clubId: string, playerId?: string) {
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set());
    }
    this.clientSubscriptions.get(clientId)!.add(`club:${clubId}`);
    if (playerId) {
      this.clientSubscriptions.get(clientId)!.add(`player:${playerId}`);
    }

    if (!this.clubSubscriptions.has(clubId)) {
      this.clubSubscriptions.set(clubId, new Set());
    }
    this.clubSubscriptions.get(clubId)!.add(clientId);

    if (playerId) {
      if (!this.playerSubscriptions.has(playerId)) {
        this.playerSubscriptions.set(playerId, new Set());
      }
      this.playerSubscriptions.get(playerId)!.add(clientId);
    }
  }

  subscribeToPlayer(clientId: string, playerId: string, clubId: string) {
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set());
    }
    this.clientSubscriptions.get(clientId)!.add(`player:${playerId}`);
    this.clientSubscriptions.get(clientId)!.add(`club:${clubId}`);

    if (!this.playerSubscriptions.has(playerId)) {
      this.playerSubscriptions.set(playerId, new Set());
    }
    this.playerSubscriptions.get(playerId)!.add(clientId);

    if (!this.clubSubscriptions.has(clubId)) {
      this.clubSubscriptions.set(clubId, new Set());
    }
    this.clubSubscriptions.get(clubId)!.add(clientId);
  }

  unsubscribeFromClub(clientId: string, clubId: string) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (subscriptions) {
      subscriptions.delete(`club:${clubId}`);
    }

    const clubClients = this.clubSubscriptions.get(clubId);
    if (clubClients) {
      clubClients.delete(clientId);
      if (clubClients.size === 0) {
        this.clubSubscriptions.delete(clubId);
      }
    }
  }

  unsubscribeFromPlayer(clientId: string, playerId: string) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (subscriptions) {
      subscriptions.delete(`player:${playerId}`);
    }

    const playerClients = this.playerSubscriptions.get(playerId);
    if (playerClients) {
      playerClients.delete(clientId);
      if (playerClients.size === 0) {
        this.playerSubscriptions.delete(playerId);
      }
    }
  }

  removeClient(clientId: string) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (subscriptions) {
      subscriptions.forEach(sub => {
        if (sub.startsWith('club:')) {
          const clubId = sub.replace('club:', '');
          this.unsubscribeFromClub(clientId, clubId);
        } else if (sub.startsWith('player:')) {
          const playerId = sub.replace('player:', '');
          this.unsubscribeFromPlayer(clientId, playerId);
        }
      });
    }
    this.clientSubscriptions.delete(clientId);
  }

  // Emit table status change to all clients subscribed to the club
  emitTableStatusChange(clubId: string, table: any) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      this.server.emit('table:status-changed', {
        clubId,
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          tableType: table.tableType,
          maxSeats: table.maxSeats,
          currentSeats: table.currentSeats,
          availableSeats: table.maxSeats - table.currentSeats,
          status: table.status,
          minBuyIn: Number(table.minBuyIn) || 0,
          maxBuyIn: Number(table.maxBuyIn) || 0
        }
      });
      this.logger.log(`Emitted table status change for club ${clubId} to ${clients.size} clients`);
    }
  }

  // Emit table list update to all clients subscribed to the club
  emitTablesUpdated(clubId: string, tables: any[]) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      this.server.emit('tables:updated', {
        clubId,
        tables: tables.map(t => ({
          id: t.id,
          tableNumber: t.tableNumber,
          tableType: t.tableType,
          maxSeats: t.maxSeats,
          currentSeats: t.currentSeats,
          availableSeats: t.maxSeats - t.currentSeats,
          status: t.status,
          minBuyIn: Number(t.minBuyIn) || 0,
          maxBuyIn: Number(t.maxBuyIn) || 0
        }))
      });
      this.logger.log(`Emitted tables updated for club ${clubId} to ${clients.size} clients`);
    }
  }

  // Emit credit request status change to specific player
  emitCreditRequestStatusChange(playerId: string, clubId: string, request: any) {
    const clients = this.playerSubscriptions.get(playerId);
    if (clients && clients.size > 0) {
      clients.forEach(clientId => {
        this.server.to(clientId).emit('credit:status-changed', {
          playerId,
          clubId,
          request: {
            id: request.id,
            amount: Number(request.amount),
            status: request.status,
            limit: Number(request.limit) || 0,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt
          }
        });
      });
      this.logger.log(`Emitted credit status change for player ${playerId} to ${clients.size} clients`);
    }
  }

  // Emit waitlist position update to specific player
  emitWaitlistPositionUpdate(playerId: string, clubId: string, position: number, totalInQueue: number, entry: any) {
    const clients = this.playerSubscriptions.get(playerId);
    if (clients && clients.size > 0) {
      clients.forEach(clientId => {
        this.server.to(clientId).emit('waitlist:position-updated', {
          playerId,
          clubId,
          position,
          totalInQueue,
          entry: {
            id: entry.id,
            status: entry.status,
            tableNumber: entry.tableNumber,
            tableType: entry.tableType
          }
        });
      });
      this.logger.log(`Emitted waitlist position update for player ${playerId} to ${clients.size} clients`);
    }
  }

  // Emit waitlist status change (seated, cancelled, etc.)
  emitWaitlistStatusChange(playerId: string, clubId: string, entry: any) {
    const clients = this.playerSubscriptions.get(playerId);
    if (clients && clients.size > 0) {
      clients.forEach(clientId => {
        this.server.to(clientId).emit('waitlist:status-changed', {
          playerId,
          clubId,
          entry: {
            id: entry.id,
            status: entry.status,
            tableNumber: entry.tableNumber,
            tableType: entry.tableType,
            createdAt: entry.createdAt
          }
        });
      });
      this.logger.log(`Emitted waitlist status change for player ${playerId} to ${clients.size} clients`);
    }
  }

  // Emit table available notification to all players on waitlist for that club
  emitTableAvailableNotification(clubId: string, table: any) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      this.server.emit('table:available', {
        clubId,
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          tableType: table.tableType,
          availableSeats: table.maxSeats - table.currentSeats
        }
      });
      this.logger.log(`Emitted table available notification for club ${clubId} to ${clients.size} clients`);
    }
  }
}

























