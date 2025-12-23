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
  PRIVATE = 'PRIVATE'
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

