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
  TOURNAMENT_WIN = 'Tournament Win',
  RAKE = 'Rake',
  TIP = 'Tip',
  BUY_IN = 'Buy In',
  REGISTER = 'Register',
  CLUB_BUY_IN = 'Club Buy In',
  CLUB_BUY_OUT = 'Club Buy Out',
  TABLE_BUY_IN = 'Table Buy In',
  TABLE_BUY_OUT = 'Table Buy Out',
  DEBIT = 'Debit',
}

/**
 * Standard wallet balance SQL fragment.
 * Wallet = real money not on a table. Credit is NOT included (it's table-only money repaid via Debit).
 * Table Buy In rows paired with a Credit line (notes contain WBPAIRCL2T) are activity-only — do not subtract from wallet.
 */
export const WALLET_BALANCE_SQL = `
  COALESCE(SUM(
    CASE
      WHEN UPPER(type) IN ('DEPOSIT', 'CLUB BUY IN', 'TABLE BUY OUT', 'BONUS', 'REFUND', 'TOURNAMENT WIN') THEN amount
      WHEN UPPER(type) IN ('TABLE BUY IN', 'BUY IN') AND strpos(COALESCE(notes, ''), 'WBPAIRCL2T') > 0 THEN 0
      /* Club buy-in repayment debits free credit headroom; they must not reduce wallet cash. */
      WHEN UPPER(type) = 'DEBIT' AND strpos(lower(COALESCE(notes, '')), 'credit line repayment') > 0 THEN 0
      WHEN UPPER(type) IN ('WITHDRAWAL', 'CLUB BUY OUT', 'TABLE BUY IN', 'CASHOUT', 'DEBIT', 'BUY IN', 'REGISTER') THEN -amount
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

/**
 * Table Buy In rows whose notes contain this substring are paired with a `Credit` row for the same draw:
 * they must not change wallet cash (chips are on the Credit txn). Used in WALLET_BALANCE_SQL and session chip math.
 */
export const TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER = 'WBPAIRCL2T';

/** Inner CASE arms for session table chip totals (use inside SUM(CASE ... END)). */
export const SESSION_TABLE_CHIPS_SUM_CASE_INNER = `WHEN UPPER(TRIM(type)) = 'CREDIT' THEN amount
      WHEN UPPER(TRIM(type)) IN ('BUY IN', 'TABLE BUY IN')
        AND strpos(COALESCE(notes, ''), '${TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER}') = 0 THEN amount
      WHEN UPPER(TRIM(type)) IN ('TABLE BUY OUT') THEN -amount
      ELSE 0`;

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

