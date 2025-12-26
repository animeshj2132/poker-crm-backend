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

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  CLOSED = 'CLOSED'
}

export enum TableType {
  CASH = 'CASH',
  TOURNAMENT = 'TOURNAMENT',
  HIGH_STAKES = 'HIGH_STAKES',
  PRIVATE = 'PRIVATE',
  RUMMY = 'RUMMY'
}

@Entity({ name: 'tables' })
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ name: 'table_number', type: 'int' })
  tableNumber!: number;

  @Column({ name: 'table_type', type: 'varchar' })
  tableType!: TableType;

  @Column({ name: 'max_seats', type: 'int' })
  maxSeats!: number;

  @Column({ name: 'current_seats', type: 'int', default: 0 })
  currentSeats!: number;

  @Column({ type: 'varchar', default: TableStatus.AVAILABLE })
  status!: TableStatus;

  @Column({ name: 'min_buy_in', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minBuyIn!: number | null;

  @Column({ name: 'max_buy_in', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxBuyIn!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'reserved_for', type: 'varchar', nullable: true })
  reservedFor!: string | null; // Player ID or name

  @Column({ name: 'reserved_until', type: 'timestamp', nullable: true })
  reservedUntil!: Date | null;

  // Rummy-specific fields (nullable, so poker tables are unaffected)
  @Column({ name: 'rummy_variant', type: 'varchar', length: 100, nullable: true })
  rummyVariant!: string | null;

  @Column({ name: 'points_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pointsValue!: number | null;

  @Column({ name: 'number_of_deals', type: 'int', nullable: true })
  numberOfDeals!: number | null;

  @Column({ name: 'drop_points', type: 'int', nullable: true })
  dropPoints!: number | null;

  @Column({ name: 'max_points', type: 'int', nullable: true })
  maxPoints!: number | null;

  @Column({ name: 'deal_duration', type: 'int', nullable: true })
  dealDuration!: number | null;

  @Column({ name: 'entry_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  entryFee!: number | null;

  @Column({ name: 'min_players', type: 'int', nullable: true })
  minPlayers!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

