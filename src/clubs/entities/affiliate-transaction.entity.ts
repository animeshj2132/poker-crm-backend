import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Affiliate } from './affiliate.entity';
import { Club } from '../club.entity';

export enum TransactionType {
  PAYMENT = 'payment',
  BONUS = 'bonus',
  ADJUSTMENT = 'adjustment',
  COMMISSION = 'commission'
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}

@Entity({ name: 'affiliate_transactions' })
export class AffiliateTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'affiliate_id' })
  affiliateId!: string;

  @ManyToOne(() => Affiliate)
  @JoinColumn({ name: 'affiliate_id' })
  affiliate!: Affiliate;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @ManyToOne(() => Club)
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  // Original amount before any override (optional)
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'original_amount', nullable: true })
  originalAmount?: number | null;

  @Column({ type: 'varchar', length: 50, name: 'transaction_type', default: TransactionType.PAYMENT })
  transactionType!: TransactionType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Reason for overriding this transaction (if any)
  @Column({ type: 'text', nullable: true, name: 'override_reason' })
  overrideReason?: string | null;

  // User who performed the override (if any)
  @Column({ type: 'uuid', nullable: true, name: 'overridden_by' })
  overriddenBy?: string | null;

  // When the override was performed (if any)
  @Column({ type: 'timestamp', nullable: true, name: 'overridden_at' })
  overriddenAt?: Date | null;

  // Flag indicating if this transaction has been overridden
  @Column({ type: 'boolean', name: 'is_overridden', default: false })
  isOverridden!: boolean;

  @Column({ type: 'varchar', length: 50, default: TransactionStatus.COMPLETED })
  status!: TransactionStatus;

  @Column({ type: 'uuid', nullable: true, name: 'processed_by' })
  processedBy?: string;

  @Column({ type: 'timestamp', default: () => 'NOW()', name: 'processed_at' })
  processedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

