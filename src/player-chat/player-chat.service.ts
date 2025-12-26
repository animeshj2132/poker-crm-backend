import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';
import { ChatSession, ChatSessionType, ChatSessionStatus } from '../clubs/entities/chat-session.entity';
import { ChatMessage, MessageSenderType } from '../clubs/entities/chat-message.entity';
import { Club } from '../clubs/club.entity';

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
          offset
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
          sender_name: msg.senderName,
          timestamp: msg.createdAt.toISOString(),
          isFromStaff: msg.senderType === MessageSenderType.STAFF
        })),
        total,
        limit,
        offset
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

      return {
        success: true,
        messageId: savedMessage.id,
        sessionId: session.id,
        timestamp: savedMessage.createdAt.toISOString(),
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
          assignedStaffName: session.assignedStaff?.name,
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







