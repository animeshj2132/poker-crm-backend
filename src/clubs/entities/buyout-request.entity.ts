import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Club } from '../club.entity';
import { Player } from './player.entity';
import { Table } from './table.entity';
import { User } from '../../users/user.entity';

export enum BuyOutRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Entity({ name: 'buyout_requests' })
@Index(['club', 'status'])
@Index(['player', 'status'])
export class BuyOutRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player_id' })
  player!: Player;

  @ManyToOne(() => Table, { nullable: true })
  @JoinColumn({ name: 'table_id' })
  table!: Table | null;

  @Column({ name: 'table_number', type: 'int', nullable: true })
  tableNumber!: number | null;

  @Column({ name: 'seat_number', type: 'int', nullable: true })
  seatNumber!: number | null;

  @Column({ name: 'requested_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  requestedAmount!: number | null;

  @Column({ name: 'current_table_balance', type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentTableBalance!: number | null;

  @Column({ type: 'varchar', length: 20, default: BuyOutRequestStatus.PENDING })
  status!: BuyOutRequestStatus;

  @Column({ name: 'call_time_started_at', type: 'timestamp', nullable: true })
  callTimeStartedAt!: Date | null;

  @Column({ name: 'requested_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requestedAt!: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy!: User | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}


