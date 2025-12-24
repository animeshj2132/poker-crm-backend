import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Club } from '../club.entity';

export enum NotificationTargetType {
  ALL_PLAYERS = 'all_players',
  NEW_SIGNUPS = 'new_signups',
  VIP_PLAYERS = 'vip_players',
  TABLES_PLAYERS = 'tables_players',
  WAITLIST_PLAYERS = 'waitlist_players',
  CUSTOM_GROUP = 'custom_group',
  ALL_STAFF = 'all_staff',
}

export enum NotificationType {
  PLAYER = 'player',
  STAFF = 'staff',
}

@Entity({ name: 'push_notifications' })
export class PushNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'video_url' })
  videoUrl!: string | null;

  @Column({ type: 'varchar', default: NotificationTargetType.ALL_PLAYERS, name: 'target_type' })
  targetType!: NotificationTargetType;

  @Column({ type: 'jsonb', nullable: true, name: 'custom_player_ids' })
  customPlayerIds!: string[] | null; // For custom_group target type

  @Column({ type: 'varchar', default: NotificationType.PLAYER, name: 'notification_type' })
  notificationType!: NotificationType; // 'player' or 'staff'

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt!: Date | null; // For scheduled notifications

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt!: Date | null; // When notification was actually sent

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy!: string | null; // User ID who created the notification

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

