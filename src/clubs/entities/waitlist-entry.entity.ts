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

export enum WaitlistStatus {
  PENDING = 'PENDING',
  SEATED = 'SEATED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

@Entity({ name: 'waitlist_entries' })
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'varchar', name: 'player_name' })
  playerName!: string;

  @Column({ type: 'varchar', nullable: true, name: 'player_id' })
  playerId!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'phone_number' })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'int', default: 1, name: 'party_size' })
  partySize!: number;

  @Column({ type: 'varchar', default: WaitlistStatus.PENDING })
  status!: WaitlistStatus;

  @Column({ type: 'int', nullable: true, name: 'table_number' })
  tableNumber!: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'table_type' })
  tableType!: string | null; // e.g., 'cash', 'tournament', 'high-stakes'

  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher number = higher priority

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'seated_at' })
  seatedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt!: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'seated_by' })
  seatedBy!: string | null; // User ID who seated them

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

