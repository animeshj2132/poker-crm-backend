import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Server, Socket } from 'socket.io';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server!: Server;
  private clientSubscriptions: Map<string, Set<string>> = new Map();
  private clubSubscriptions: Map<string, Set<string>> = new Map();
  private playerSubscriptions: Map<string, Set<string>> = new Map();
  private staffSubscriptions: Map<string, Set<string>> = new Map();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  setServer(server: Server) {
    this.server = server;

    // Periodically clean up delivered messages older than 1 hour
    setInterval(() => this.cleanupDeliveredMessages(), 60 * 60 * 1000);
  }

  // ==================== UNDELIVERED MESSAGE QUEUE ====================

  /**
   * Queue a message for delivery when the recipient reconnects
   */
  private async queueUndeliveredMessage(recipientType: 'player' | 'staff', recipientId: string, eventName: string, payload: any) {
    try {
      await this.dataSource.query(
        `INSERT INTO undelivered_messages (recipient_type, recipient_id, event_name, payload) VALUES ($1, $2, $3, $4)`,
        [recipientType, recipientId, eventName, JSON.stringify(payload)]
      );
      this.logger.log(`Queued undelivered message for ${recipientType} ${recipientId} (${eventName})`);
    } catch (error) {
      this.logger.error(`Failed to queue undelivered message: ${error}`);
    }
  }

  /**
   * Flush all undelivered messages to a client that just reconnected
   */
  async flushUndeliveredMessages(recipientType: 'player' | 'staff', recipientId: string, client: Socket) {
    try {
      const rows = await this.dataSource.query(
        `SELECT id, event_name, payload FROM undelivered_messages 
         WHERE recipient_type = $1 AND recipient_id = $2 AND delivered_at IS NULL
         ORDER BY created_at ASC`,
        [recipientType, recipientId]
      );

      if (rows.length === 0) return;

      this.logger.log(`Flushing ${rows.length} undelivered messages to ${recipientType} ${recipientId}`);

      const deliveredIds: string[] = [];
      for (const row of rows) {
        try {
          const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
          client.emit(row.event_name, payload);
          deliveredIds.push(row.id);
        } catch (err) {
          this.logger.error(`Failed to flush message ${row.id}: ${err}`);
        }
      }

      if (deliveredIds.length > 0) {
        await this.dataSource.query(
          `UPDATE undelivered_messages SET delivered_at = NOW() WHERE id = ANY($1::uuid[])`,
          [deliveredIds]
        );
        this.logger.log(`Marked ${deliveredIds.length} messages as delivered for ${recipientType} ${recipientId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to flush undelivered messages: ${error}`);
    }
  }

  /**
   * Clean up delivered messages older than 1 hour
   */
  private async cleanupDeliveredMessages() {
    try {
      const result = await this.dataSource.query(
        `DELETE FROM undelivered_messages WHERE delivered_at IS NOT NULL AND delivered_at < NOW() - INTERVAL '1 hour'`
      );
      if (result[1] > 0) {
        this.logger.log(`Cleaned up ${result[1]} delivered messages`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup delivered messages: ${error}`);
    }
  }

  /**
   * Emit to a specific recipient with guaranteed delivery.
   * If the recipient is not connected, the message is queued for later.
   */
  private emitToRecipientWithGuarantee(
    recipientType: 'player' | 'staff',
    recipientId: string,
    eventName: string,
    payload: any
  ) {
    const subsMap = recipientType === 'player' ? this.playerSubscriptions : this.staffSubscriptions;
    const clients = subsMap.get(recipientId);

    if (clients && clients.size > 0) {
      clients.forEach(clientId => {
        this.server.to(clientId).emit(eventName, payload);
      });
      this.logger.log(`Emitted ${eventName} to ${recipientType} ${recipientId} (${clients.size} clients)`);
    } else {
      // No connected clients - queue for delivery on reconnect
      this.queueUndeliveredMessage(recipientType, recipientId, eventName, payload);
    }
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

  subscribeToStaff(clientId: string, staffUserId: string, clubId: string) {
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set());
    }
    this.clientSubscriptions.get(clientId)!.add(`staff:${staffUserId}`);
    this.clientSubscriptions.get(clientId)!.add(`club:${clubId}`); // Also subscribe to club for general updates

    if (!this.staffSubscriptions.has(staffUserId)) {
      this.staffSubscriptions.set(staffUserId, new Set());
    }
    this.staffSubscriptions.get(staffUserId)!.add(clientId);

    if (!this.clubSubscriptions.has(clubId)) {
      this.clubSubscriptions.set(clubId, new Set());
    }
    this.clubSubscriptions.get(clubId)!.add(clientId);
  }

  unsubscribeFromStaff(clientId: string, staffUserId: string) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (subscriptions) {
      subscriptions.delete(`staff:${staffUserId}`);
    }

    const staffClients = this.staffSubscriptions.get(staffUserId);
    if (staffClients) {
      staffClients.delete(clientId);
      if (staffClients.size === 0) {
        this.staffSubscriptions.delete(staffUserId);
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
        } else if (sub.startsWith('staff:')) {
          const staffUserId = sub.replace('staff:', '');
          this.unsubscribeFromStaff(clientId, staffUserId);
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

  // ==================== CHAT EVENTS (with guaranteed delivery) ====================

  emitNewChatMessage(clubId: string, sessionId: string, message: any, playerId?: string, recipientStaffId?: string) {
    // Broadcast to club (for all staff to update their chat lists)
    const clubClients = this.clubSubscriptions.get(clubId);
    if (clubClients && clubClients.size > 0) {
      this.server.emit('chat:new-message', {
        clubId,
        sessionId,
        message: {
          id: message.id,
          message: message.message,
          senderType: message.senderType,
          senderName: message.senderName,
          senderStaffId: message.senderStaff?.id,
          createdAt: message.createdAt,
          isRead: message.isRead
        }
      });
    }

    // Guaranteed delivery to recipient staff
    if (recipientStaffId) {
      this.emitToRecipientWithGuarantee('staff', recipientStaffId, 'chat:new-message-direct', {
        clubId,
        sessionId,
        recipientStaffId,
        message: {
          id: message.id,
          message: message.message,
          senderType: message.senderType,
          senderName: message.senderName,
          senderStaffId: message.senderStaff?.id,
          createdAt: message.createdAt,
          isRead: message.isRead
        }
      });
    }

    // Guaranteed delivery to player
    if (playerId) {
      this.emitToRecipientWithGuarantee('player', playerId, 'chat:new-message', {
        clubId,
        sessionId,
        playerId,
        message: {
          id: message.id,
          message: message.message,
          senderType: message.senderType,
          senderName: message.senderName,
          createdAt: message.createdAt,
          isRead: message.isRead
        }
      });
    }
  }

  emitChatSessionUpdate(clubId: string, session: any, playerId?: string, recipientStaffUserId?: string) {
    // Broadcast to club (for staff)
    const clubClients = this.clubSubscriptions.get(clubId);
    if (clubClients && clubClients.size > 0) {
      this.server.emit('chat:session-updated', {
        clubId,
        session: {
          id: session.id,
          sessionType: session.sessionType,
          status: session.status,
          subject: session.subject,
          lastMessageAt: session.lastMessageAt,
          staffInitiator: session.staffInitiator,
          staffRecipient: session.staffRecipient
        }
      });
    }

    // Guaranteed delivery to player
    if (playerId) {
      this.emitToRecipientWithGuarantee('player', playerId, 'chat:session-updated', {
        clubId,
        playerId,
        session: {
          id: session.id,
          status: session.status,
          subject: session.subject,
          lastMessageAt: session.lastMessageAt
        }
      });
    }

    // Guaranteed delivery to specific staff member
    if (recipientStaffUserId) {
      this.emitToRecipientWithGuarantee('staff', recipientStaffUserId, 'chat:session-updated', {
        clubId,
        recipientStaffUserId,
        session: {
          id: session.id,
          sessionType: session.sessionType,
          status: session.status,
          subject: session.subject,
          lastMessageAt: session.lastMessageAt,
          staffInitiator: session.staffInitiator,
          staffRecipient: session.staffRecipient
        }
      });
    }
  }

  emitNewChatMessageDirect(clubId: string, sessionId: string, message: any, recipientStaffUserId: string) {
    this.emitToRecipientWithGuarantee('staff', recipientStaffUserId, 'chat:new-message-direct', {
      clubId,
      sessionId,
      recipientStaffUserId,
      message: {
        id: message.id,
        message: message.message,
        senderType: message.senderType,
        senderName: message.senderName,
        createdAt: message.createdAt,
        isRead: message.isRead,
        senderStaff: message.senderStaff
      }
    });
  }
}




























