import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Club } from '../club.entity';
import { Staff } from './staff.entity';

@Entity({ name: 'dealer_cashouts' })
export class DealerCashout {
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

  @Column({ type: 'date', name: 'cashout_date' })
  cashoutDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', name: 'processed_by', nullable: true })
  processedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

