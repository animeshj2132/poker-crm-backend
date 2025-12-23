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

  @Column({ type: 'int' })
  tableNumber!: number;

  @Column({ type: 'varchar' })
  tableType!: TableType;

  @Column({ type: 'int' })
  maxSeats!: number;

  @Column({ type: 'int', default: 0 })
  currentSeats!: number;

  @Column({ type: 'varchar', default: TableStatus.AVAILABLE })
  status!: TableStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minBuyIn!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxBuyIn!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', nullable: true })
  reservedFor!: string | null; // Player ID or name

  @Column({ type: 'timestamp', nullable: true })
  reservedUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

