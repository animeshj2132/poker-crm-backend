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
import { Staff } from './staff.entity';

export enum TipStatus {
  PENDING = 'Pending',
  PROCESSED = 'Processed',
  PAID = 'Paid'
}

@Entity({ name: 'dealer_tips' })
export class DealerTips {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @ManyToOne(() => Club)
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'uuid', name: 'dealer_id' })
  dealerId!: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'dealer_id' })
  dealer!: Staff;

  @Column({ type: 'date', name: 'tip_date' })
  tipDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_tips' })
  totalTips!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'club_hold_percentage', default: 15 })
  clubHoldPercentage!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'club_hold_amount', default: 0 })
  clubHoldAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'dealer_share_percentage', default: 85 })
  dealerSharePercentage!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'dealer_share_amount', default: 0 })
  dealerShareAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'floor_manager_percentage', default: 5 })
  floorManagerPercentage!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'floor_manager_amount', default: 0 })
  floorManagerAmount!: number;

  @Column({ type: 'varchar', default: TipStatus.PENDING })
  status!: TipStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', name: 'processed_by', nullable: true })
  processedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

