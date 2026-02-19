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
  BUY_IN = 'Buy In',
  CLUB_BUY_IN = 'Club Buy In',
  CLUB_BUY_OUT = 'Club Buy Out',
  TABLE_BUY_IN = 'Table Buy In',
  TABLE_BUY_OUT = 'Table Buy Out',
  DEBIT = 'Debit',
}

/**
 * Standard wallet balance SQL fragment.
 * Wallet = real money not on a table. Credit is NOT included (it's table-only money repaid via Debit).
 */
export const WALLET_BALANCE_SQL = `
  COALESCE(SUM(
    CASE
      WHEN UPPER(type) IN ('DEPOSIT', 'CLUB BUY IN', 'TABLE BUY OUT', 'BONUS', 'REFUND') THEN amount
      WHEN UPPER(type) IN ('WITHDRAWAL', 'CLUB BUY OUT', 'TABLE BUY IN', 'CASHOUT', 'DEBIT', 'BUY IN') THEN -amount
      ELSE 0
    END
  ), 0)
`;

/**
 * Credit used = total Credit transactions minus total Debit (credit payback) transactions.
 */
export const CREDIT_BALANCE_SQL = `
  COALESCE(SUM(
    CASE
      WHEN UPPER(type) = 'CREDIT' THEN amount
      WHEN UPPER(type) = 'DEBIT' THEN -amount
      ELSE 0
    END
  ), 0)
`;

export enum TransactionStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  FAILED = 'Failed'
}

export enum GameType {
  POKER = 'poker',
  RUMMY = 'rummy',
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

  @Column({ type: 'varchar', nullable: true, name: 'game_type' })
  gameType!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'original_amount' })
  originalAmount?: number;

  @Column({ type: 'text', nullable: true, name: 'override_reason' })
  overrideReason?: string;

  @Column({ type: 'uuid', nullable: true, name: 'overridden_by' })
  overriddenBy?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'overridden_at' })
  overriddenAt?: Date;

  @Column({ type: 'boolean', default: false, name: 'is_overridden' })
  isOverridden!: boolean;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

