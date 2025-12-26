import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index
} from 'typeorm';
import { PushNotification } from './push-notification.entity';
import { Club } from '../club.entity';

@Entity({ name: 'notification_read_status' })
@Index(['notification', 'recipientId', 'recipientType'], { unique: true })
export class NotificationReadStatus {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PushNotification, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification!: PushNotification;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'uuid', name: 'recipient_id' })
  recipientId!: string; // Player ID or Staff ID

  @Column({ type: 'varchar', name: 'recipient_type' })
  recipientType!: 'player' | 'staff'; // Type of recipient

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

