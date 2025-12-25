import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionType, ChatSessionStatus } from '../entities/chat-session.entity';
import { ChatMessage, MessageSenderType } from '../entities/chat-message.entity';
import { Staff } from '../entities/staff.entity';
import { Player } from '../entities/player.entity';
import { Club } from '../club.entity';
import { CreateStaffChatSessionDto } from '../dto/create-staff-chat-session.dto';
import { CreatePlayerChatSessionDto } from '../dto/create-player-chat-session.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { UpdateChatSessionDto } from '../dto/update-chat-session.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
  ) {}

  // ==================== STAFF CHAT ====================

  async createStaffChatSession(
    clubId: string,
    initiatorStaffId: string,
    dto: CreateStaffChatSessionDto
  ): Promise<ChatSession> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const initiator = await this.staffRepo.findOne({
      where: { id: initiatorStaffId, club: { id: clubId } }
    });
    if (!initiator) {
      throw new NotFoundException('Initiator staff not found');
    }

    const recipient = await this.staffRepo.findOne({
      where: { id: dto.recipientStaffId, club: { id: clubId } }
    });
    if (!recipient) {
      throw new NotFoundException('Recipient staff not found');
    }

    if (initiatorStaffId === dto.recipientStaffId) {
      throw new BadRequestException('Cannot create chat session with yourself');
    }

    // Check if session already exists
    const existing = await this.sessionRepo.findOne({
      where: [
        {
          club: { id: clubId },
          sessionType: ChatSessionType.STAFF,
          staffInitiator: { id: initiatorStaffId },
          staffRecipient: { id: dto.recipientStaffId },
          status: ChatSessionStatus.OPEN
        },
        {
          club: { id: clubId },
          sessionType: ChatSessionType.STAFF,
          staffInitiator: { id: dto.recipientStaffId },
          staffRecipient: { id: initiatorStaffId },
          status: ChatSessionStatus.OPEN
        }
      ]
    });

    if (existing) {
      return existing;
    }

    const session = this.sessionRepo.create({
      club,
      sessionType: ChatSessionType.STAFF,
      staffInitiator: initiator,
      staffRecipient: recipient,
      subject: dto.subject || null,
      status: ChatSessionStatus.OPEN
    });

    return await this.sessionRepo.save(session);
  }

  async getStaffChatSessions(
    clubId: string,
    staffId: string,
    page = 1,
    limit = 10,
    search?: string,
    role?: string
  ): Promise<{ sessions: any[], total: number, page: number, totalPages: number }> {
    const query = this.sessionRepo.createQueryBuilder('session')
      .leftJoinAndSelect('session.club', 'club')
      .leftJoinAndSelect('session.staffInitiator', 'initiator')
      .leftJoinAndSelect('session.staffRecipient', 'recipient')
      .where('club.id = :clubId', { clubId })
      .andWhere('session.sessionType = :type', { type: ChatSessionType.STAFF })
      .andWhere('(initiator.id = :staffId OR recipient.id = :staffId)', { staffId });

    if (search) {
      query.andWhere(
        '(initiator.name ILIKE :search OR recipient.name ILIKE :search OR initiator.email ILIKE :search OR recipient.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (role) {
      query.andWhere('(initiator.role = :role OR recipient.role = :role)', { role });
    }

    const total = await query.getCount();
    const sessions = await query
      .orderBy('session.lastMessageAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get unread count for each session
    const sessionsWithUnread = await Promise.all(
      sessions.map(async (session) => {
        if (!session.staffInitiator || !session.staffRecipient) {
          return { ...session, unreadCount: 0, otherStaff: null };
        }
        
        const otherStaffId = session.staffInitiator.id === staffId 
          ? session.staffRecipient.id 
          : session.staffInitiator.id;
        
        const unreadCount = await this.messageRepo.count({
          where: {
            session: { id: session.id },
            senderStaff: { id: otherStaffId },
            isRead: false
          }
        });

        return {
          ...session,
          unreadCount,
          otherStaff: session.staffInitiator.id === staffId ? session.staffRecipient : session.staffInitiator
        };
      })
    );

    return {
      sessions: sessionsWithUnread,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ==================== PLAYER CHAT ====================

  async createPlayerChatSession(
    clubId: string,
    dto: CreatePlayerChatSessionDto
  ): Promise<ChatSession> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const player = await this.playerRepo.findOne({
      where: { id: dto.playerId, club: { id: clubId } }
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const session = this.sessionRepo.create({
      club,
      sessionType: ChatSessionType.PLAYER,
      player,
      subject: dto.subject,
      status: ChatSessionStatus.OPEN
    });

    return await this.sessionRepo.save(session);
  }

  async getPlayerChatSessions(
    clubId: string,
    page = 1,
    limit = 10,
    status?: ChatSessionStatus,
    search?: string
  ): Promise<{ sessions: any[], total: number, page: number, totalPages: number }> {
    const query = this.sessionRepo.createQueryBuilder('session')
      .leftJoinAndSelect('session.club', 'club')
      .leftJoinAndSelect('session.player', 'player')
      .leftJoinAndSelect('session.assignedStaff', 'assignedStaff')
      .where('club.id = :clubId', { clubId })
      .andWhere('session.sessionType = :type', { type: ChatSessionType.PLAYER });

    if (status) {
      query.andWhere('session.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(player.name ILIKE :search OR player.email ILIKE :search OR session.subject ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await query.getCount();
    const sessions = await query
      .orderBy('session.lastMessageAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get unread count for each session
    const sessionsWithUnread = await Promise.all(
      sessions.map(async (session) => {
        const unreadCount = await this.messageRepo.count({
          where: {
            session: { id: session.id },
            senderType: MessageSenderType.PLAYER,
            isRead: false
          }
        });

        const lastMessage = await this.messageRepo.findOne({
          where: { session: { id: session.id } },
          order: { createdAt: 'DESC' }
        });

        return {
          ...session,
          unreadCount,
          lastMessage: lastMessage?.message || null
        };
      })
    );

    return {
      sessions: sessionsWithUnread,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ==================== MESSAGES ====================

  async sendMessage(
    clubId: string,
    sessionId: string,
    senderStaffId: string,
    dto: SendMessageDto
  ): Promise<ChatMessage> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, club: { id: clubId } },
      relations: ['staffInitiator', 'staffRecipient', 'player']
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const sender = await this.staffRepo.findOne({
      where: { id: senderStaffId, club: { id: clubId } }
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Verify sender is part of the session
    if (session.sessionType === ChatSessionType.STAFF) {
      if (
        !session.staffInitiator || !session.staffRecipient ||
        (session.staffInitiator.id !== senderStaffId &&
        session.staffRecipient.id !== senderStaffId)
      ) {
        throw new ForbiddenException('You are not part of this chat session');
      }
    }

    const message = this.messageRepo.create({
      session,
      senderType: MessageSenderType.STAFF,
      senderStaff: sender,
      senderName: sender.name,
      message: dto.message
    });

    return await this.messageRepo.save(message);
  }

  async getSessionMessages(
    clubId: string,
    sessionId: string,
    staffId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: ChatMessage[], total: number, page: number, totalPages: number }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, club: { id: clubId } },
      relations: ['staffInitiator', 'staffRecipient']
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    // Verify access
    if (session.sessionType === ChatSessionType.STAFF) {
      if (
        !session.staffInitiator || !session.staffRecipient ||
        (session.staffInitiator.id !== staffId &&
        session.staffRecipient.id !== staffId)
      ) {
        throw new ForbiddenException('You do not have access to this chat');
      }
    }

    const query = this.messageRepo.createQueryBuilder('message')
      .leftJoinAndSelect('message.session', 'session')
      .leftJoinAndSelect('message.senderStaff', 'senderStaff')
      .leftJoinAndSelect('message.senderPlayer', 'senderPlayer')
      .where('session.id = :sessionId', { sessionId });

    const total = await query.getCount();
    const messages = await query
      .orderBy('message.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Mark messages as read
    await this.messageRepo.update(
      {
        session: { id: sessionId },
        isRead: false,
        senderStaff: { id: Not(staffId) }
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateChatSession(
    clubId: string,
    sessionId: string,
    dto: UpdateChatSessionDto
  ): Promise<ChatSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, club: { id: clubId } }
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (dto.status) {
      session.status = dto.status;
      if (dto.status === ChatSessionStatus.CLOSED) {
        session.closedAt = new Date();
      }
    }

    if (dto.assignedStaffId) {
      const staff = await this.staffRepo.findOne({
        where: { id: dto.assignedStaffId, club: { id: clubId } }
      });
      if (!staff) {
        throw new NotFoundException('Assigned staff not found');
      }
      session.assignedStaff = staff;
    }

    return await this.sessionRepo.save(session);
  }

  async getUnreadCounts(clubId: string, staffId: string): Promise<{ staffChats: number, playerChats: number }> {
    const staffChatsUnread = await this.messageRepo.createQueryBuilder('message')
      .leftJoin('message.session', 'session')
      .leftJoin('session.staffInitiator', 'initiator')
      .leftJoin('session.staffRecipient', 'recipient')
      .where('session.clubId = :clubId', { clubId })
      .andWhere('session.sessionType = :staffType', { staffType: ChatSessionType.STAFF })
      .andWhere('(initiator.id = :staffId OR recipient.id = :staffId)', { staffId })
      .andWhere('message.isRead = false')
      .andWhere('message.senderStaffId != :staffId', { staffId })
      .getCount();

    const playerChatsUnread = await this.messageRepo.createQueryBuilder('message')
      .leftJoin('message.session', 'session')
      .where('session.clubId = :clubId', { clubId })
      .andWhere('session.sessionType = :playerType', { playerType: ChatSessionType.PLAYER })
      .andWhere('message.isRead = false')
      .andWhere('message.senderType = :playerSenderType', { playerSenderType: MessageSenderType.PLAYER })
      .getCount();

    return {
      staffChats: staffChatsUnread,
      playerChats: playerChatsUnread
    };
  }
}

// Import Not for marking messages as read
import { Not } from 'typeorm';

