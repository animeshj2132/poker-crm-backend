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

  @Column({ type: 'varchar', length: 50, name: 'transaction_type', default: TransactionType.PAYMENT })
  transactionType!: TransactionType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

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

