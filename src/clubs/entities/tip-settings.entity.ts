import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Club } from '../club.entity';
import { Staff } from './staff.entity';

@Entity({ name: 'tip_settings' })
export class TipSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @ManyToOne(() => Club)
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'uuid', name: 'dealer_id', nullable: true })
  dealerId?: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'dealer_id' })
  dealer?: Staff;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'club_hold_percentage', default: 15 })
  clubHoldPercentage!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'dealer_share_percentage', default: 85 })
  dealerSharePercentage!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'floor_manager_percentage', default: 5 })
  floorManagerPercentage!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;
}

