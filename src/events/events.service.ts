import { Injectable, Logger } from '@nestjs/common';
import { WaitlistStatus } from '../clubs/entities/waitlist-entry.entity';
import { playerFacingStaffSenderLabel } from '../player-chat/player-chat-display.util';
import {
  chatCreatedAtToIsoUtc,
  chatCreatedAtToUtcMs,
} from '../common/utils/chat-created-at.util';
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
      this.emitToClub(clubId, 'table:status-changed', {
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
          maxBuyIn: Number(table.maxBuyIn) || 0,
          notes: table.notes ?? null,
        }
      });
      this.logger.log(`Emitted table status change for club ${clubId} to ${clients.size} clients`);
    }
  }

  // Emit table list update to all clients subscribed to the club
  emitTablesUpdated(clubId: string, tables: any[]) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      this.emitToClub(clubId, 'tables:updated', {
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
    const payload = {
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
    };

    const clients = this.playerSubscriptions.get(playerId);
    if (clients && clients.size > 0) {
      clients.forEach(clientId => {
        this.server.to(clientId).emit('credit:status-changed', payload);
        this.server.to(clientId).emit('credit:request-updated', payload);
      });
      this.logger.log(`Emitted credit status change for player ${playerId} to ${clients.size} clients`);
    }

    // Also notify staff/club dashboards to refresh in real-time.
    this.emitToClub(clubId, 'credit:status-changed', payload);
    this.emitToClub(clubId, 'credit:request-updated', payload);

    const st = String(request?.status || '');
    void this.sendFcmPush(playerId, 'Credit request update', `Your credit request is ${st}.`, {
      clubId,
      type: 'credit_request',
      requestId: String(request?.id || ''),
    });
  }

  /** Credit line toggled or limit cleared at player level (e.g. super admin lock). */
  emitCreditFacilityChanged(
    clubId: string,
    playerId: string,
    detail: { creditEnabled: boolean; creditLimit?: number },
  ) {
    const payload = { clubId, playerId, ...detail };
    this.emitToRecipientWithGuarantee('player', playerId, 'credit:facility-changed', payload);
    this.emitToClub(clubId, 'credit:facility-changed', payload);
    this.logger.log(`Emitted credit:facility-changed for player ${playerId} in club ${clubId}`);

    const lim = detail.creditLimit != null ? ` Limit ₹${detail.creditLimit}.` : '';
    void this.sendFcmPush(playerId, 'Credit line updated', `Credit line is now ${detail.creditEnabled ? 'on' : 'off'}.${lim}`, {
      clubId,
      type: 'credit_facility',
    });
  }

  // Emit waitlist position update to specific player
  emitWaitlistPositionUpdate(playerId: string, clubId: string, position: number, totalInQueue: number, entry: any) {
    const payload = {
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
    };

    const clients = this.playerSubscriptions.get(playerId);
    if (clients && clients.size > 0) {
      clients.forEach(clientId => {
        this.server.to(clientId).emit('waitlist:position-updated', payload);
      });
      this.logger.log(`Emitted waitlist position update for player ${playerId} to ${clients.size} clients`);
    }

    // Also notify club subscribers (staff dashboards) so waitlist cards update live.
    this.emitToClub(clubId, 'waitlist:position-updated', payload);
  }

  // Emit waitlist status change (seated, cancelled, etc.)
  emitWaitlistStatusChange(playerId: string | null | undefined, clubId: string, entry: any) {
    const payload = {
      playerId: playerId || entry?.playerId || null,
      clubId,
      entry: {
        id: entry.id,
        status: entry.status,
        tableNumber: entry.tableNumber,
        tableType: entry.tableType,
        createdAt: entry.createdAt
      }
    };

    if (playerId) {
      const clients = this.playerSubscriptions.get(playerId);
      if (clients && clients.size > 0) {
        clients.forEach(clientId => {
          this.server.to(clientId).emit('waitlist:status-changed', payload);
        });
        this.logger.log(`Emitted waitlist status change for player ${playerId} to ${clients.size} clients`);
      }
    }

    // Always notify club subscribers (staff dashboards).
    this.emitToClub(clubId, 'waitlist:status-changed', payload);

    if (playerId) {
      const st = String(entry?.status || '').toUpperCase();
      if (st === WaitlistStatus.SEATED) {
        void this.sendFcmPush(playerId, 'Table seat confirmed', `You are seated at table ${entry.tableNumber ?? ''} (${entry.tableType || 'game'}).`, {
          clubId,
          type: 'waitlist_seated',
          entryId: String(entry?.id || ''),
        });
      } else if (st === WaitlistStatus.CANCELLED || st === WaitlistStatus.NO_SHOW) {
        void this.sendFcmPush(playerId, 'Waitlist update', `Your waitlist status is now ${st}.`, {
          clubId,
          type: 'waitlist_status',
          entryId: String(entry?.id || ''),
        });
      }
    }
  }

  // Emit table available notification to all players on waitlist for that club
  emitTableAvailableNotification(clubId: string, table: any) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      this.emitToClub(clubId, 'table:available', {
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
    const createdAtIso = chatCreatedAtToIsoUtc(message.createdAt);
    const createdAtUtcMs = chatCreatedAtToUtcMs(message.createdAt);
    // Broadcast to club (for all staff to update their chat lists)
    const clubClients = this.clubSubscriptions.get(clubId);
    if (clubClients && clubClients.size > 0) {
      this.emitToClub(clubId, 'chat:new-message', {
        clubId,
        sessionId,
        message: {
          id: message.id,
          message: message.message,
          senderType: message.senderType,
          senderName: message.senderName,
          senderStaffId: message.senderStaff?.id,
          senderStaffUserId: message.senderStaff?.userId,
          senderStaffEmail: message.senderStaff?.email,
          createdAt: createdAtIso,
          createdAtUtcMs,
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
          senderStaffUserId: message.senderStaff?.userId,
          senderStaffEmail: message.senderStaff?.email,
          createdAt: createdAtIso,
          createdAtUtcMs,
          isRead: message.isRead
        }
      });
    }

    // Guaranteed delivery to player (never expose real staff names)
    if (playerId) {
      const isStaff = message.senderType === 'staff';
      this.emitToRecipientWithGuarantee('player', playerId, 'chat:new-message', {
        clubId,
        sessionId,
        playerId,
        message: {
          id: message.id,
          message: message.message,
          senderType: message.senderType,
          senderName: isStaff
            ? playerFacingStaffSenderLabel(message.senderStaff?.id)
            : message.senderName,
          createdAt: createdAtIso,
          createdAtUtcMs,
          isRead: message.isRead
        }
      });
      if (isStaff) {
        const preview = String(message.message || '').slice(0, 140);
        void this.sendFcmPush(playerId, 'Club message', preview || 'New reply in chat', {
          clubId,
          type: 'chat_reply',
          sessionId: String(sessionId),
        });
      }
    }
  }

  emitChatSessionUpdate(clubId: string, session: any, playerId?: string, recipientStaffUserId?: string) {
    // Broadcast to club (for staff)
    const clubClients = this.clubSubscriptions.get(clubId);
    if (clubClients && clubClients.size > 0) {
      this.emitToClub(clubId, 'chat:session-updated', {
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
      void this.sendFcmPush(playerId, 'Chat updated', `Chat status: ${session.status}`, {
        clubId,
        type: 'chat_session',
        sessionId: String(session.id),
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

  // Emit new buy-in request to ALL staff subscribed to this club
  emitBuyInRequest(clubId: string, request: any) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      this.emitToClub(clubId, 'buyin:new-request', {
        clubId,
        request: {
          id: request.id,
          playerId: request.player_id,
          playerName: request.player_name,
          tableNumber: request.table_number,
          seatNumber: request.seat_number,
          requestedAmount: Number(request.requested_amount),
          currentTableBalance: Number(request.current_table_balance || 0),
          requestedAt: request.requested_at,
          status: request.status,
        }
      });
      this.logger.log(`Emitted buyin:new-request for club ${clubId} to ${clients.size} clients`);
    }
  }

  // Emit new buy-out request (call time) to ALL staff subscribed to this club
  emitBuyOutRequest(clubId: string, request: any) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      this.emitToClub(clubId, 'buyout:new-request', {
        clubId,
        request: {
          id: request.id,
          playerId: request.player_id,
          playerName: request.player_name,
          tableNumber: request.table_number,
          seatNumber: request.seat_number,
          requestedAmount: Number(request.requested_amount || 0),
          currentTableBalance: Number(request.current_table_balance || 0),
          callTimeStartedAt: request.call_time_started_at,
          requestedAt: request.requested_at,
          status: request.status,
        }
      });
      this.logger.log(`Emitted buyout:new-request for club ${clubId} to ${clients.size} clients`);
    }
  }

  // Emit buy-in/buy-out request status change to player
  emitBuyRequestStatusChange(playerId: string, clubId: string, type: 'buyin' | 'buyout', request: any) {
    this.emitToRecipientWithGuarantee('player', playerId, `${type}:status-changed`, {
      clubId,
      playerId,
      type,
      request,
    });
    const label = type === 'buyin' ? 'Buy-in' : 'Buy-out';
    const st = String(request?.status ?? '');
    void this.sendFcmPush(playerId, `${label} update`, `${label} request is now ${st || 'updated'}.`, {
      clubId,
      type,
      requestId: String(request?.id ?? ''),
    });
  }

  emitTournamentBlindsUpdated(clubId: string, payload: { id: string; name: string; currentRound: number; currentSb: number; currentBb: number; structure: any }) {
    // Broadcast to all subscribers of this club (both admin and player clients)
    this.emitToClub(clubId, 'tournament:blinds-updated', { clubId, tournament: payload });
    this.logger.log(`Emitted tournament:blinds-updated for club ${clubId}, tournament ${payload.id} (Level ${payload.currentRound}: ${payload.currentSb}/${payload.currentBb})`);
    void this.notifyTournamentActivePlayersFcm(
      clubId,
      payload.id,
      'Blinds increased',
      `${payload.name}: Level ${payload.currentRound} — ${payload.currentSb}/${payload.currentBb}`,
      { type: 'tournament_blinds' },
    );
  }

  emitNewChatMessageDirect(clubId: string, sessionId: string, message: any, recipientStaffUserId: string) {
    const createdAtIso = chatCreatedAtToIsoUtc(message.createdAt);
    const createdAtUtcMs = chatCreatedAtToUtcMs(message.createdAt);
    this.emitToRecipientWithGuarantee('staff', recipientStaffUserId, 'chat:new-message-direct', {
      clubId,
      sessionId,
      recipientStaffUserId,
      message: {
        id: message.id,
        message: message.message,
        senderType: message.senderType,
        senderName: message.senderName,
        createdAt: createdAtIso,
        createdAtUtcMs,
        isRead: message.isRead,
        senderStaff: message.senderStaff,
        senderStaffId: message.senderStaff?.id,
        senderStaffUserId: message.senderStaff?.userId,
        senderStaffEmail: message.senderStaff?.email,
      }
    });
  }

  // ==================== CLUB-WIDE BROADCAST HELPER ====================

  private emitToClub(clubId: string, event: string, payload: any) {
    const clients = this.clubSubscriptions.get(clubId);
    if (clients && clients.size > 0) {
      clients.forEach(clientId => this.server.to(clientId).emit(event, payload));
      this.logger.log(`Emitted ${event} to club ${clubId} (${clients.size} clients)`);
    }
  }

  // ==================== FINANCIAL TRANSACTION EVENTS ====================

  emitTransactionCreated(clubId: string, playerId: string) {
    this.emitToRecipientWithGuarantee('player', playerId, 'transaction:new', { clubId, playerId });
    this.emitToClub(clubId, 'transaction:new', { clubId, playerId });
  }

  emitBalanceUpdated(clubId: string, playerId: string) {
    this.emitToRecipientWithGuarantee('player', playerId, 'balance:updated', { clubId, playerId });
    this.emitToClub(clubId, 'player:updated', { clubId, playerId });
  }

  // ==================== KYC / PLAYER EVENTS ====================

  emitKycStatusChanged(clubId: string, playerId: string, kycStatus: string) {
    this.emitToRecipientWithGuarantee('player', playerId, 'kyc:status-changed', { clubId, playerId, kycStatus });
    this.emitToClub(clubId, 'player:updated', { clubId, playerId });
    void this.sendFcmPush(playerId, 'KYC status updated', `Your verification status is now ${kycStatus}.`, {
      clubId,
      type: 'kyc',
    });
  }

  emitPlayerUpdated(clubId: string, playerId?: string) {
    this.emitToClub(clubId, 'player:updated', { clubId, playerId });
  }

  // ==================== OFFERS EVENTS ====================

  emitOfferUpdated(clubId: string) {
    this.emitToClub(clubId, 'offers:updated', { clubId });
    void this.sendFcmToClubDevices(clubId, 'New offers', 'Promotions were updated. Open the app to view.', { type: 'offers' });
  }

  // ==================== NOTIFICATION EVENTS ====================

  emitNotificationCreated(clubId: string, playerId?: string) {
    if (playerId) {
      this.emitToRecipientWithGuarantee('player', playerId, 'notification:new', { clubId, playerId });
    }
    this.emitToClub(clubId, 'notification:new', { clubId, playerId });
  }

  emitNotificationReadStatusChanged(clubId: string) {
    this.emitToClub(clubId, 'notification:read-status-changed', { clubId });
  }

  // ==================== PROFILE CHANGE REQUEST EVENTS ====================

  emitProfileChangeRequestUpdated(
    clubId: string,
    playerId: string,
    data?: { status?: string; fieldName?: string; newValue?: string; reviewNotes?: string }
  ) {
    this.emitToRecipientWithGuarantee('player', playerId, 'profile-request:updated', { clubId, playerId, ...data });
    this.emitToClub(clubId, 'profile-request:updated', { clubId, playerId, ...data });
    const extra = data?.fieldName ? ` — ${data.fieldName}` : '';
    void this.sendFcmPush(playerId, 'Profile / document request', `Status: ${data?.status || 'updated'}${extra}`, {
      clubId,
      type: 'profile_request',
    });
  }

  // ==================== LEAVE APPLICATION EVENTS ====================

  emitLeaveApplicationChanged(clubId: string) {
    this.emitToClub(clubId, 'leave:updated', { clubId });
  }

  // ==================== TOURNAMENT EVENTS ====================

  emitTournamentUpdated(clubId: string) {
    this.emitToClub(clubId, 'tournament:updated', { clubId });
  }

  emitTournamentPlayerUpdated(clubId: string, playerId?: string) {
    if (playerId) {
      this.emitToRecipientWithGuarantee('player', playerId, 'tournament:player-updated', { clubId, playerId });
    }
    this.emitToClub(clubId, 'tournament:player-updated', { clubId, playerId });
  }

  // ==================== FNB EVENTS ====================

  emitFnbOrderUpdated(
    clubId: string,
    detail?: { playerId?: string | null; orderNumber?: string | null; status?: string; stationName?: string | null },
  ) {
    const payload = {
      clubId,
      playerId: detail?.playerId ?? undefined,
      order: detail?.status
        ? {
            orderNumber: detail.orderNumber ?? undefined,
            status: detail.status,
            stationName: detail.stationName ?? undefined,
          }
        : undefined,
    };
    this.emitToClub(clubId, 'fnb:order-updated', payload);
    if (detail?.playerId) {
      this.emitToRecipientWithGuarantee('player', String(detail.playerId), 'fnb:order-updated', payload);
      const ord = detail.orderNumber || '';
      const st = detail.status || 'updated';
      const station = detail.stationName ? ` (${detail.stationName})` : '';
      void this.sendFcmPush(String(detail.playerId), 'F&B order', `Order ${ord}: ${st}${station}`, {
        clubId,
        type: 'fnb_order',
        status: String(st),
      });
    }
  }

  /** VIP product purchase or stock change — refresh player VIP UI and staff VIP Store. */
  emitVipStoreUpdated(clubId: string, playerId?: string) {
    this.emitToClub(clubId, 'vip:store-updated', { clubId, playerId });
    if (playerId) {
      this.emitToRecipientWithGuarantee('player', playerId, 'vip:store-updated', { clubId, playerId });
      void this.sendFcmPush(playerId, 'VIP rewards', 'Your VIP points or rewards were updated.', { clubId, type: 'vip' });
    } else {
      void this.sendFcmToClubDevices(clubId, 'VIP store', 'VIP catalog was updated. Check the app for new items or points.', {
        type: 'vip_catalog',
      });
    }
  }

  // ==================== STAFF EVENTS ====================

  emitStaffUpdated(clubId: string) {
    this.emitToClub(clubId, 'staff:updated', { clubId });
  }

  // ==================== BUY-IN / BUY-OUT STATUS CHANGE EVENTS (club-wide) ====================

  emitBuyInRequestChanged(clubId: string) {
    this.emitToClub(clubId, 'buyin:updated', { clubId });
  }

  emitBuyOutRequestChanged(clubId: string) {
    this.emitToClub(clubId, 'buyout:updated', { clubId });
  }

  // ==================== CREDIT REQUEST EVENTS (club-wide new request signal) ====================

  emitCreditRequestCreated(clubId: string, playerId: string) {
    this.emitToClub(clubId, 'credit:new-request', { clubId, playerId });
  }

  // ==================== MOBILE FCM PUSH NOTIFICATIONS ====================

  /** FCM to every device token registered for this club (see device_tokens.club_id). */
  async sendFcmToClubDevices(clubId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    return this.sendFcmPush(null, title, body, data, clubId);
  }

  /** Notify all players still active in a tournament (seated / not exited). */
  notifyTournamentActivePlayersFcm(
    clubId: string,
    tournamentId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ): void {
    void this.pushFcmToActiveTournamentPlayers(clubId, tournamentId, title, body, data);
  }

  private async pushFcmToActiveTournamentPlayers(
    clubId: string,
    tournamentId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    try {
      const rows: { pid: string }[] = await this.dataSource.query(
        `SELECT DISTINCT player_id::text AS pid FROM tournament_players
         WHERE tournament_id = $1
           AND COALESCE(is_active, false) = true
           AND COALESCE(is_exited, false) = false`,
        [tournamentId],
      );
      for (const r of rows) {
        if (!r?.pid) continue;
        await this.sendFcmPush(r.pid, title, body, { clubId, tournamentId, ...data });
      }
    } catch (err) {
      this.logger.error(`pushFcmToActiveTournamentPlayers failed: ${err}`);
    }
  }

  /**
   * Send an FCM push via Supabase Edge: one player (playerUuid), legacy integer playerId, all devices in a club (clubScopeId), or all devices globally.
   * Non-fatal on failure.
   */
  async sendFcmPush(
    playerUuid: string | null,
    title: string,
    body: string,
    data?: Record<string, string>,
    clubScopeId?: string | null,
  ): Promise<void> {
    const fcmUrl = process.env.FCM_SEND_FUNCTION_URL?.trim();
    const fcmKey = process.env.FCM_SEND_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!fcmUrl || !fcmKey) return;

    try {
      const payload: Record<string, unknown> = { title, body: body ?? '', data: data ?? {} };
      if (playerUuid) {
        payload.playerUuid = playerUuid;
      } else if (clubScopeId) {
        payload.clubId = clubScopeId;
      }

      await fetch(fcmUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fcmKey}` },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      this.logger.error(`sendFcmPush failed: ${err}`);
    }
  }
}




























