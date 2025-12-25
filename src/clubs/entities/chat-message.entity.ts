import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { Staff } from './staff.entity';
import { Player } from './player.entity';

export enum MessageSenderType {
  STAFF = 'staff',
  PLAYER = 'player'
}

@Entity({ name: 'chat_messages' })
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ChatSession, { nullable: false })
  @JoinColumn({ name: 'session_id' })
  session!: ChatSession;

  @Column({ type: 'varchar', length: 20, name: 'sender_type' })
  senderType!: MessageSenderType;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'sender_staff_id' })
  senderStaff!: Staff | null;

  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'sender_player_id' })
  senderPlayer!: Player | null;

  @Column({ type: 'varchar', length: 200, name: 'sender_name' })
  senderName!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

