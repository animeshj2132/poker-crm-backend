import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ChatSession, ChatSessionType, ChatSessionStatus } from '../entities/chat-session.entity';
import { ChatMessage, MessageSenderType } from '../entities/chat-message.entity';
import { Staff } from '../entities/staff.entity';
import { Player } from '../entities/player.entity';
import { Club } from '../club.entity';
import { CreateStaffChatSessionDto } from '../dto/create-staff-chat-session.dto';
import { CreatePlayerChatSessionDto } from '../dto/create-player-chat-session.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { UpdateChatSessionDto } from '../dto/update-chat-session.dto';
import { User } from '../../users/user.entity';
import { UserTenantRole } from '../../users/user-tenant-role.entity';
import { UserClubRole } from '../../users/user-club-role.entity';
import { TenantRole, ClubRole } from '../../common/rbac/roles';
import { StaffStatus, StaffRole } from '../entities/staff.entity';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserTenantRole)
    private readonly userTenantRoleRepo: Repository<UserTenantRole>,
    @InjectRepository(UserClubRole)
    private readonly userClubRoleRepo: Repository<UserClubRole>,
  ) {}

  // ==================== STAFF CHAT ====================

  /**
   * Get or create a staff entry for a user (Super Admin/Admin) if they don't exist in staff table
   */
  private async getOrCreateStaffForUser(userId: string, clubId: string): Promise<Staff> {
    // Get user info first
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ['tenantRoles', 'tenantRoles.tenant', 'clubRoles', 'clubRoles.club']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is Super Admin or Admin
    const club = await this.clubRepo.findOne({ 
      where: { id: clubId },
      relations: ['tenant']
    });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const isSuperAdmin = user.tenantRoles?.some(r => r.tenant?.id === club.tenant.id && r.role === TenantRole.SUPER_ADMIN);
    const isAdmin = user.clubRoles?.some(r => r.club?.id === clubId && r.role === ClubRole.ADMIN);

    if (!isSuperAdmin && !isAdmin) {
      throw new NotFoundException('User is not a Super Admin or Admin for this club');
    }

    // Check if user already has a staff entry by email
    let staff = await this.staffRepo.findOne({
      where: { 
        email: user.email,
        club: { id: clubId }
      }
    });

    if (staff) {
      return staff;
    }

    // Create a virtual staff entry for the user
    staff = this.staffRepo.create({
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      role: isSuperAdmin ? StaffRole.SUPER_ADMIN : StaffRole.ADMIN,
      phone: '',
      club: club as any,
      status: StaffStatus.ACTIVE,
      employeeId: `USER-${userId.substring(0, 8)}`,
      tempPassword: false,
      passwordHash: null
    });
    
    return await this.staffRepo.save(staff);
  }

  /**
   * Get all chatable users for a club (staff + Super Admin + Admin users)
   */
  async getChatableUsers(clubId: string, tenantId?: string): Promise<any[]> {
    const club = await this.clubRepo.findOne({ 
      where: { id: clubId },
      relations: ['tenant']
    });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Get all staff members
    const staffMembers = await this.staffRepo.find({
      where: { club: { id: clubId }, status: StaffStatus.ACTIVE },
      select: ['id', 'name', 'email', 'role', 'customRoleName', 'status']
    });

    // Get Super Admin users from tenant
    const superAdminUsers = await this.userTenantRoleRepo.find({
      where: { 
        tenant: { id: tenantId || club.tenant.id },
        role: TenantRole.SUPER_ADMIN
      },
      relations: ['user']
    });

    // Get Admin users from club
    const adminUsers = await this.userClubRoleRepo.find({
      where: { 
        club: { id: clubId },
        role: ClubRole.ADMIN
      },
      relations: ['user']
    });

    // Combine and format
    const users = [
      ...superAdminUsers.map(role => ({
        id: role.user.id,
        displayName: role.user.displayName,
        email: role.user.email,
        roles: [{ role: 'SUPER_ADMIN' }],
        isUser: true
      })),
      ...adminUsers.map(role => ({
        id: role.user.id,
        displayName: role.user.displayName,
        email: role.user.email,
        roles: [{ role: 'ADMIN' }],
        isUser: true
      }))
    ];

    // Remove duplicates (in case user has both Super Admin and Admin roles)
    const uniqueUsers = users.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    return uniqueUsers;
  }

  async createStaffChatSession(
    clubId: string,
    initiatorUserId: string,
    dto: CreateStaffChatSessionDto
  ): Promise<ChatSession> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Get or create staff entry for initiator (handles both staff and users)
    let initiator = await this.staffRepo.findOne({
      where: { id: initiatorUserId, club: { id: clubId } }
    });
    
    if (!initiator) {
      // Check if it's a user (Super Admin/Admin) and create staff entry
      initiator = await this.getOrCreateStaffForUser(initiatorUserId, clubId);
    }

    // Get or create staff entry for recipient
    let recipient = await this.staffRepo.findOne({
      where: { id: dto.recipientStaffId, club: { id: clubId } }
    });
    
    if (!recipient) {
      // Check if it's a user (Super Admin/Admin) and create staff entry
      recipient = await this.getOrCreateStaffForUser(dto.recipientStaffId, clubId);
    }

    if (initiator.id === recipient.id) {
      throw new BadRequestException('Cannot create chat session with yourself');
    }

    // Check if session already exists
    const existing = await this.sessionRepo.findOne({
      where: [
        {
          club: { id: clubId },
          sessionType: ChatSessionType.STAFF,
          staffInitiator: { id: initiator.id },
          staffRecipient: { id: recipient.id },
          status: ChatSessionStatus.OPEN
        },
        {
          club: { id: clubId },
          sessionType: ChatSessionType.STAFF,
          staffInitiator: { id: recipient.id },
          staffRecipient: { id: initiator.id },
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
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
    role?: string
  ): Promise<{ sessions: any[], total: number, page: number, totalPages: number }> {
    // Get or create staff entry for user if they're not in staff table
    let staff = await this.staffRepo.findOne({
      where: { id: userId, club: { id: clubId } }
    });
    
    if (!staff) {
      // Try to get or create staff entry for user (Super Admin/Admin)
      try {
        staff = await this.getOrCreateStaffForUser(userId, clubId);
      } catch (error) {
        // If user is not found or not Super Admin/Admin, return empty
        return { sessions: [], total: 0, page, totalPages: 0 };
      }
    }

    const staffId = staff.id;

    const query = this.sessionRepo.createQueryBuilder('session')
      .leftJoinAndSelect('session.club', 'club')
      .leftJoinAndSelect('session.staffInitiator', 'initiator')
      .leftJoinAndSelect('session.staffRecipient', 'recipient')
      .where('club.id = :clubId', { clubId })
      .andWhere('session.sessionType = :type', { type: ChatSessionType.STAFF })
      .andWhere('(initiator.id = :staffId OR recipient.id = :staffId)', { staffId })
      // Filter out sessions archived by current user
      .andWhere(
        '(initiator.id = :staffId AND session.archivedByInitiator = false) OR (recipient.id = :staffId AND session.archivedByRecipient = false)',
        { staffId }
      );

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
    senderUserId: string,
    dto: SendMessageDto
  ): Promise<ChatMessage> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, club: { id: clubId } },
      relations: ['staffInitiator', 'staffRecipient', 'player']
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    // Get or create staff entry for sender
    let sender = await this.staffRepo.findOne({
      where: { id: senderUserId, club: { id: clubId } }
    });
    
    if (!sender) {
      // Check if it's a user (Super Admin/Admin) and create staff entry
      sender = await this.getOrCreateStaffForUser(senderUserId, clubId);
    }

    // Verify sender is part of the session
    if (session.sessionType === ChatSessionType.STAFF) {
      if (
        !session.staffInitiator || !session.staffRecipient ||
        (session.staffInitiator.id !== sender.id &&
        session.staffRecipient.id !== sender.id)
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
    userId: string,
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

    // Get or create staff entry for user
    let staff = await this.staffRepo.findOne({
      where: { id: userId, club: { id: clubId } }
    });
    
    if (!staff) {
      try {
        staff = await this.getOrCreateStaffForUser(userId, clubId);
      } catch (error) {
        throw new ForbiddenException('You do not have access to this chat');
      }
    }

    const staffId = staff.id;

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

  async archiveChatSession(
    clubId: string,
    sessionId: string,
    userId: string
  ): Promise<ChatSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, club: { id: clubId } },
      relations: ['staffInitiator', 'staffRecipient']
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.sessionType !== ChatSessionType.STAFF) {
      throw new BadRequestException('Can only archive staff chat sessions');
    }

    // Get or create staff entry for user
    let staff = await this.staffRepo.findOne({
      where: { id: userId, club: { id: clubId } }
    });
    
    if (!staff) {
      staff = await this.getOrCreateStaffForUser(userId, clubId);
    }

    const staffId = staff.id;

    // Archive based on whether user is initiator or recipient
    if (session.staffInitiator?.id === staffId) {
      session.archivedByInitiator = true;
    } else if (session.staffRecipient?.id === staffId) {
      session.archivedByRecipient = true;
    } else {
      throw new ForbiddenException('You are not part of this chat session');
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


