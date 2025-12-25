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
import { Staff } from './staff.entity';
import { Player } from './player.entity';

export enum ChatSessionType {
  STAFF = 'staff',
  PLAYER = 'player'
}

export enum ChatSessionStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

@Entity({ name: 'chat_sessions' })
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'varchar', length: 20, name: 'session_type' })
  sessionType!: ChatSessionType;

  // For staff chat
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staff_initiator_id' })
  staffInitiator!: Staff | null;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staff_recipient_id' })
  staffRecipient!: Staff | null;

  // For player chat
  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player_id' })
  player!: Player | null;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff!: Staff | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null;

  @Column({ type: 'varchar', length: 20, default: ChatSessionStatus.OPEN })
  status!: ChatSessionStatus;

  @Column({ type: 'timestamp', name: 'last_message_at', default: () => 'NOW()' })
  lastMessageAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'closed_at' })
  closedAt!: Date | null;
}

