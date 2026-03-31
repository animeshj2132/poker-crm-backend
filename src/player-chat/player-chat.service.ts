import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';
import { ChatSession, ChatSessionType, ChatSessionStatus } from '../clubs/entities/chat-session.entity';
import { ChatMessage, MessageSenderType } from '../clubs/entities/chat-message.entity';
import { Club } from '../clubs/club.entity';
import { EventsService } from '../events/events.service';
import { playerFacingStaffSenderLabel } from './player-chat-display.util';

@Injectable()
export class PlayerChatService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
    private readonly clubsService: ClubsService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Get chat history from unified chat system
   */
  async getChatHistory(
    playerId: string,
    clubId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Find player's chat session
      const session = await this.sessionRepo.findOne({
        where: {
          club: { id: clubId },
          player: { id: playerId },
          sessionType: ChatSessionType.PLAYER
        }
      });

      if (!session) {
        return {
          messages: [],
          total: 0,
          limit,
          offset,
          session: null,
        };
      }

      // Get messages for this session
      const messages = await this.messageRepo.find({
        where: { session: { id: session.id } },
        relations: ['senderStaff', 'senderPlayer'],
        order: { createdAt: 'ASC' },
        take: limit,
        skip: offset
      });

      const total = await this.messageRepo.count({
        where: { session: { id: session.id } }
      });

      return {
        messages: messages.map(msg => ({
          id: msg.id,
          message: msg.message,
          sender: msg.senderType === MessageSenderType.PLAYER ? 'player' : 'staff',
          sender_name:
            msg.senderType === MessageSenderType.STAFF
              ? playerFacingStaffSenderLabel(msg.senderStaff?.id)
              : msg.senderName,
          timestamp: msg.createdAt.toISOString(),
          createdAtUtcMs: msg.createdAt.getTime(),
          isFromStaff: msg.senderType === MessageSenderType.STAFF
        })),
        total,
        limit,
        offset,
        session: {
          id: session.id,
          status: session.status,
        },
      };
    } catch (err) {
      console.error('Get chat history error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get chat history');
    }
  }

  /**
   * Send message from player - creates/updates session and stores message
   */
  async sendMessage(playerId: string, clubId: string, message: string, playerName?: string) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      if (message.length > 1000) {
        throw new BadRequestException('Message cannot exceed 1000 characters');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const club = await this.clubRepo.findOne({ where: { id: clubId } });
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Find or create chat session for this player
      let session = await this.sessionRepo.findOne({
        where: {
          club: { id: clubId },
          player: { id: playerId },
          sessionType: ChatSessionType.PLAYER,
          status: Not(ChatSessionStatus.CLOSED)
        },
        relations: ['player', 'club']
      });

      // Create session if it doesn't exist
      if (!session) {
        session = this.sessionRepo.create({
          club,
          player,
          sessionType: ChatSessionType.PLAYER,
          subject: message.substring(0, 100), // Use first 100 chars as subject
          status: ChatSessionStatus.OPEN
        });
        session = await this.sessionRepo.save(session);
      } else {
        // Update last message time
        session.lastMessageAt = new Date();
        await this.sessionRepo.save(session);
      }

      // Create message
      const chatMessage = this.messageRepo.create({
        session,
        senderType: MessageSenderType.PLAYER,
        senderPlayer: player,
        senderName: playerName || player.name,
        message: message,
        isRead: false // Staff messages are unread by default
      });

      const savedMessage = await this.messageRepo.save(chatMessage);

      // Emit real-time event for player message to staff
      try {
        this.eventsService.emitNewChatMessage(clubId, session.id, savedMessage, playerId);
        this.eventsService.emitChatSessionUpdate(clubId, session, playerId);
      } catch (err) {
        // Non-critical - log but don't fail
        console.error('Failed to emit chat events:', err);
      }

      return {
        success: true,
        messageId: savedMessage.id,
        sessionId: session.id,
        timestamp: savedMessage.createdAt.toISOString(),
        sessionStatus: session.status,
        message: {
          id: savedMessage.id,
          message: savedMessage.message,
          sender: 'player' as const,
          sender_name: savedMessage.senderName,
          timestamp: savedMessage.createdAt.toISOString(),
          isFromStaff: false,
        },
      };
    } catch (err) {
      console.error('Send message error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to send message');
    }
  }

  /**
   * Get all chat sessions for a player (including closed), with pagination
   */
  async getPlayerSessions(
    playerId: string,
    clubId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const query = this.sessionRepo.createQueryBuilder('session')
        .leftJoinAndSelect('session.club', 'club')
        .leftJoinAndSelect('session.player', 'player')
        .leftJoinAndSelect('session.assignedStaff', 'assignedStaff')
        .where('club.id = :clubId', { clubId })
        .andWhere('player.id = :playerId', { playerId })
        .andWhere('session.sessionType = :type', { type: ChatSessionType.PLAYER });

      const total = await query.getCount();
      const sessions = await query
        .orderBy('session.lastMessageAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      const sessionsWithMeta = await Promise.all(
        sessions.map(async (session) => {
          const messageCount = await this.messageRepo.count({
            where: { session: { id: session.id } }
          });

          const lastMessage = await this.messageRepo.findOne({
            where: { session: { id: session.id } },
            order: { createdAt: 'DESC' }
          });

          return {
            id: session.id,
            subject: session.subject,
            status: session.status,
            messageCount,
            lastMessage: lastMessage?.message || null,
            lastMessageSender: lastMessage?.senderType === MessageSenderType.STAFF ? 'staff' : 'player',
            assignedStaffName: null,
            createdAt: session.createdAt.toISOString(),
            lastMessageAt: session.lastMessageAt.toISOString(),
            closedAt: session.closedAt?.toISOString() || null,
          };
        })
      );

      return {
        sessions: sessionsWithMeta,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      console.error('Get player sessions error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get sessions');
    }
  }

  /**
   * Get messages for a specific session (used for viewing closed ticket history)
   */
  async getSessionMessages(
    playerId: string,
    clubId: string,
    sessionId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(sessionId)) {
        throw new BadRequestException('Invalid session ID format');
      }

      const session = await this.sessionRepo.findOne({
        where: {
          id: sessionId,
          club: { id: clubId },
          player: { id: playerId },
          sessionType: ChatSessionType.PLAYER
        },
        relations: ['player']
      });

      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      const total = await this.messageRepo.count({
        where: { session: { id: sessionId } }
      });

      const messages = await this.messageRepo.find({
        where: { session: { id: sessionId } },
        relations: ['senderStaff', 'senderPlayer'],
        order: { createdAt: 'ASC' },
        take: limit,
        skip: (page - 1) * limit
      });

      // Mark staff messages as read when player views
      await this.messageRepo.update(
        {
          session: { id: sessionId },
          isRead: false,
          senderType: MessageSenderType.STAFF
        },
        {
          isRead: true,
          readAt: new Date()
        }
      );

      return {
        messages: messages.map(msg => ({
          id: msg.id,
          message: msg.message,
          sender: msg.senderType === MessageSenderType.PLAYER ? 'player' : 'staff',
          sender_name:
            msg.senderType === MessageSenderType.STAFF
              ? playerFacingStaffSenderLabel(msg.senderStaff?.id)
              : msg.senderName,
          timestamp: msg.createdAt.toISOString(),
          createdAtUtcMs: msg.createdAt.getTime(),
          isFromStaff: msg.senderType === MessageSenderType.STAFF
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      console.error('Get session messages error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get session messages');
    }
  }

  /**
   * Get active chat session from unified chat system
   */
  async getActiveSession(playerId: string, clubId: string) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Find active session
      const session = await this.sessionRepo.findOne({
        where: {
          club: { id: clubId },
          player: { id: playerId },
          sessionType: ChatSessionType.PLAYER,
          status: Not(ChatSessionStatus.CLOSED)
        },
        relations: ['player', 'club', 'assignedStaff']
      });

      if (!session) {
        return {
          session: null,
          status: 'none'
        };
      }

      if (!session.player) {
        throw new NotFoundException('Player not found in session');
      }

      return {
        session: {
          id: session.id,
          playerId: session.player.id,
          clubId: session.club.id,
          playerName: session.player.name,
          subject: session.subject,
          status: session.status,
          assignedStaffId: session.assignedStaff?.id,
          assignedStaffName: null,
          createdAt: session.createdAt.toISOString(),
          lastMessageAt: session.lastMessageAt.toISOString()
        },
        status: session.status === ChatSessionStatus.CLOSED ? 'closed' : 'active'
      };
    } catch (err) {
      console.error('Get active session error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get session');
    }
  }
}







