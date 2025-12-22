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

export enum TransactionType {
  DEPOSIT = 'Deposit',
  CASHOUT = 'Cashout',
  WITHDRAWAL = 'Withdrawal',
  BONUS = 'Bonus',
  CREDIT = 'Credit',
  REFUND = 'Refund',
  RAKE = 'Rake',
  TIP = 'Tip',
  BUY_IN = 'Buy In'
}

export enum TransactionStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  FAILED = 'Failed'
}

@Entity({ name: 'financial_transactions' })
export class FinancialTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  type!: TransactionType;

  @Column({ type: 'varchar', name: 'player_id' })
  playerId!: string;

  @Column({ type: 'varchar', name: 'player_name' })
  playerName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

