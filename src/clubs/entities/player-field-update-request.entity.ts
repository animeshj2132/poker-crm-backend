import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { Player } from './player.entity';
import { Club } from '../club.entity';

export enum UpdateRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Entity('player_profile_change_requests')
export class PlayerFieldUpdateRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player_id' })
  player!: Player;

  @Column({ name: 'player_id' })
  playerId!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ name: 'club_id' })
  clubId!: string;

  @Column({ type: 'text', name: 'field_name' })
  fieldName!: string; // 'name', 'phoneNumber', 'email', etc.

  @Column({ type: 'text', name: 'current_value', nullable: true })
  currentValue!: string | null;

  @Column({ type: 'text', name: 'requested_value' })
  requestedValue!: string;

  @Column({ type: 'text', default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewer_id' })
  reviewerId!: string | null; // Staff ID who approved/rejected

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'reviewed_at' })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
