import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PushNotification, NotificationTargetType, NotificationType } from '../entities/push-notification.entity';
import { Club } from '../club.entity';
import { NotificationReadStatus } from '../entities/notification-read-status.entity';
import { Staff, StaffRole } from '../entities/staff.entity';
import { Player } from '../entities/player.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class PushNotificationsService {
  constructor(
    @InjectRepository(PushNotification) private readonly notificationsRepo: Repository<PushNotification>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(NotificationReadStatus) private readonly readStatusRepo: Repository<NotificationReadStatus>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Player) private readonly playersRepo: Repository<Player>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>
  ) {}

  async create(clubId: string, data: {
    title: string;
    details?: string;
    imageUrl?: string;
    videoUrl?: string;
    targetType?: NotificationTargetType;
    customPlayerIds?: string[];
    customStaffIds?: string[];
    notificationType?: NotificationType;
    scheduledAt?: Date;
    createdBy?: string;
  }) {
    // Validate inputs
    if (!data.title || !data.title.trim()) {
      throw new BadRequestException('Notification title is required');
    }
    if (data.title.trim().length < 2) {
      throw new BadRequestException('Notification title must be at least 2 characters long');
    }
    if (data.title.trim().length > 255) {
      throw new BadRequestException('Notification title cannot exceed 255 characters');
    }
    if (data.details && data.details.trim().length > 5000) {
      throw new BadRequestException('Details cannot exceed 5000 characters');
    }
    if (data.imageUrl && data.imageUrl.trim().length > 500) {
      throw new BadRequestException('Image URL cannot exceed 500 characters');
    }
    if (data.videoUrl && data.videoUrl.trim().length > 500) {
      throw new BadRequestException('Video URL cannot exceed 500 characters');
    }
    if (data.targetType === NotificationTargetType.CUSTOM_GROUP && (!data.customPlayerIds || data.customPlayerIds.length === 0)) {
      throw new BadRequestException('Custom player IDs are required when target type is custom_group');
    }
    if (data.targetType === NotificationTargetType.STAFF_CUSTOM && (!data.customStaffIds || data.customStaffIds.length === 0)) {
      throw new BadRequestException('Custom staff IDs are required when target type is staff_custom');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const notification = this.notificationsRepo.create({
      title: data.title.trim(),
      details: data.details?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      videoUrl: data.videoUrl?.trim() || null,
      targetType: data.targetType || NotificationTargetType.ALL_PLAYERS,
      customPlayerIds: data.customPlayerIds || null,
      customStaffIds: data.customStaffIds || null,
      notificationType: data.notificationType || NotificationType.PLAYER,
      scheduledAt: data.scheduledAt || null,
      createdBy: data.createdBy || null,
      club
    });

    return this.notificationsRepo.save(notification);
  }

  async findAll(clubId: string, notificationType?: NotificationType) {
    const where: any = { club: { id: clubId } };
    if (notificationType) {
      where.notificationType = notificationType;
    }
    return this.notificationsRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, clubId: string) {
    const notification = await this.notificationsRepo.findOne({
      where: { id, club: { id: clubId } }
    });
    if (!notification) throw new NotFoundException('Push notification not found');
    return notification;
  }

  async update(id: string, clubId: string, data: Partial<{
    title: string;
    details: string;
    imageUrl: string;
    videoUrl: string;
    targetType: NotificationTargetType;
    customPlayerIds: string[];
    isActive: boolean;
    scheduledAt: Date;
  }>) {
    const notification = await this.findOne(id, clubId);

    if (data.title !== undefined) {
      if (!data.title || !data.title.trim()) {
        throw new BadRequestException('Notification title cannot be empty');
      }
      if (data.title.trim().length < 2) {
        throw new BadRequestException('Notification title must be at least 2 characters long');
      }
      if (data.title.trim().length > 255) {
        throw new BadRequestException('Notification title cannot exceed 255 characters');
      }
      data.title = data.title.trim();
    }

    if (data.details !== undefined) {
      if (data.details && data.details.trim().length > 5000) {
        throw new BadRequestException('Details cannot exceed 5000 characters');
      }
      data.details = (data.details?.trim() || undefined) as any;
    }

    if (data.imageUrl !== undefined) {
      if (data.imageUrl && data.imageUrl.trim().length > 500) {
        throw new BadRequestException('Image URL cannot exceed 500 characters');
      }
      data.imageUrl = (data.imageUrl?.trim() || undefined) as any;
    }

    if (data.videoUrl !== undefined) {
      if (data.videoUrl && data.videoUrl.trim().length > 500) {
        throw new BadRequestException('Video URL cannot exceed 500 characters');
      }
      data.videoUrl = (data.videoUrl?.trim() || undefined) as any;
    }

    if (data.targetType === NotificationTargetType.CUSTOM_GROUP && (!data.customPlayerIds || data.customPlayerIds.length === 0)) {
      throw new BadRequestException('Custom player IDs are required when target type is custom_group');
    }

    Object.assign(notification, data);
    return this.notificationsRepo.save(notification);
  }

  async remove(id: string, clubId: string) {
    const notification = await this.findOne(id, clubId);
    await this.notificationsRepo.remove(notification);
  }

  async markAsSent(id: string, clubId: string) {
    const notification = await this.findOne(id, clubId);
    notification.sentAt = new Date();
    return this.notificationsRepo.save(notification);
  }

  /**
   * Send notification to recipients and create read status entries
   */
  async sendNotification(id: string, clubId: string) {
    const notification = await this.findOne(id, clubId);

    if (notification.sentAt) {
      throw new BadRequestException('Notification has already been sent');
    }

    // Get recipient IDs based on target type
    let recipientIds: string[] = [];
    const recipientType = notification.notificationType === NotificationType.PLAYER ? 'player' : 'staff';

    if (notification.notificationType === NotificationType.PLAYER) {
      // Player notifications
      switch (notification.targetType) {
        case NotificationTargetType.ALL_PLAYERS:
          const allPlayers = await this.playersRepo.find({
            where: { club: { id: clubId }, status: 'Active' },
            select: ['id']
          });
          recipientIds = allPlayers.map(p => p.id);
          break;

        case NotificationTargetType.CUSTOM_GROUP:
          recipientIds = notification.customPlayerIds || [];
          break;

        // Add other player target types as needed
        default:
          recipientIds = notification.customPlayerIds || [];
      }
    } else {
      // Staff notifications
      const staffQuery: any = { club: { id: clubId }, status: 'Active' };

      switch (notification.targetType) {
        case NotificationTargetType.ALL_STAFF:
          // Exclude affiliates
          staffQuery.role = In([
            StaffRole.ADMIN,
            StaffRole.MANAGER,
            StaffRole.CASHIER,
            StaffRole.DEALER,
            StaffRole.HR,
            StaffRole.FNB,
            StaffRole.GRE,
            StaffRole.STAFF
          ]);
          break;

        case NotificationTargetType.STAFF_ADMIN:
          staffQuery.role = StaffRole.ADMIN;
          break;

        case NotificationTargetType.STAFF_MANAGER:
          staffQuery.role = StaffRole.MANAGER;
          break;

        case NotificationTargetType.STAFF_CASHIER:
          staffQuery.role = StaffRole.CASHIER;
          break;

        case NotificationTargetType.STAFF_DEALER:
          staffQuery.role = StaffRole.DEALER;
          break;

        case NotificationTargetType.STAFF_HR:
          staffQuery.role = StaffRole.HR;
          break;

        case NotificationTargetType.STAFF_FNB:
          staffQuery.role = StaffRole.FNB;
          break;

        case NotificationTargetType.STAFF_GRE:
          staffQuery.role = StaffRole.GRE;
          break;

        case NotificationTargetType.STAFF_CUSTOM:
          // For custom staff, customStaffIds contains staff IDs, we need to convert to user IDs
          if (notification.customStaffIds && notification.customStaffIds.length > 0) {
            const customStaff = await this.staffRepo.find({
              where: { id: In(notification.customStaffIds), club: { id: clubId } },
              select: ['email']
            });
            const customStaffEmails = customStaff.map(s => s.email).filter(Boolean);
            if (customStaffEmails.length > 0) {
              const users = await this.usersRepo.find({
                where: { email: In(customStaffEmails) },
                select: ['id']
              });
              recipientIds = users.map(u => u.id);
            }
          }
          break;

        default:
          staffQuery.role = In([
            StaffRole.ADMIN,
            StaffRole.MANAGER,
            StaffRole.CASHIER,
            StaffRole.DEALER,
            StaffRole.HR,
            StaffRole.FNB,
            StaffRole.GRE,
            StaffRole.STAFF
          ]);
      }

      if (notification.targetType !== NotificationTargetType.STAFF_CUSTOM) {
        const staff = await this.staffRepo.find({
          where: staffQuery,
          select: ['email']
        });
        
        // Get user IDs by matching staff emails with user emails
        const staffEmails = staff.map(s => s.email).filter(Boolean);
        if (staffEmails.length > 0) {
          const users = await this.usersRepo.find({
            where: { email: In(staffEmails) },
            select: ['id']
          });
          recipientIds = users.map(u => u.id);
        }
      }
    }

    // Create read status entries for all recipients
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const readStatusEntries = recipientIds.map(recipientId => 
      this.readStatusRepo.create({
        notification,
        club,
        recipientId,
        recipientType,
        isRead: false,
        readAt: null
      })
    );

    if (readStatusEntries.length > 0) {
      await this.readStatusRepo.save(readStatusEntries);
    }

    // Mark notification as sent
    notification.sentAt = new Date();
    await this.notificationsRepo.save(notification);

    return {
      success: true,
      recipientCount: recipientIds.length,
      sentAt: notification.sentAt
    };
  }

  /**
   * Get notifications for a specific staff member or player
   */
  async getInboxNotifications(clubId: string, recipientId: string, recipientType: 'player' | 'staff') {
    const readStatuses = await this.readStatusRepo.find({
      where: {
        club: { id: clubId },
        recipientId,
        recipientType
      },
      relations: ['notification'],
      order: { createdAt: 'DESC' }
    });

    return {
      notifications: readStatuses.map(status => ({
        id: status.notification.id,
        title: status.notification.title,
        details: status.notification.details,
        imageUrl: status.notification.imageUrl,
        videoUrl: status.notification.videoUrl,
        isRead: status.isRead,
        readAt: status.readAt,
        sentAt: status.notification.sentAt,
        createdAt: status.notification.createdAt
      })),
      total: readStatuses.length,
      page: 1,
      limit: 10
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(clubId: string, recipientId: string, recipientType: 'player' | 'staff'): Promise<number> {
    return this.readStatusRepo.count({
      where: {
        club: { id: clubId },
        recipientId,
        recipientType,
        isRead: false
      }
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(clubId: string, notificationId: string, recipientId: string, recipientType: 'player' | 'staff') {
    const readStatus = await this.readStatusRepo.findOne({
      where: {
        notification: { id: notificationId },
        club: { id: clubId },
        recipientId,
        recipientType
      }
    });

    if (!readStatus) {
      throw new NotFoundException('Notification not found');
    }

    if (!readStatus.isRead) {
      readStatus.isRead = true;
      readStatus.readAt = new Date();
      await this.readStatusRepo.save(readStatus);
    }

    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(clubId: string, recipientId: string, recipientType: 'player' | 'staff') {
    await this.readStatusRepo.update(
      {
        club: { id: clubId },
        recipientId,
        recipientType,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    return { success: true };
  }
}



