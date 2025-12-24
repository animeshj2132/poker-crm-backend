import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushNotification, NotificationTargetType, NotificationType } from '../entities/push-notification.entity';
import { Club } from '../club.entity';

@Injectable()
export class PushNotificationsService {
  constructor(
    @InjectRepository(PushNotification) private readonly notificationsRepo: Repository<PushNotification>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>
  ) {}

  async create(clubId: string, data: {
    title: string;
    details?: string;
    imageUrl?: string;
    videoUrl?: string;
    targetType?: NotificationTargetType;
    customPlayerIds?: string[];
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

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const notification = this.notificationsRepo.create({
      title: data.title.trim(),
      details: data.details?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      videoUrl: data.videoUrl?.trim() || null,
      targetType: data.targetType || NotificationTargetType.ALL_PLAYERS,
      customPlayerIds: data.customPlayerIds || null,
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
}

