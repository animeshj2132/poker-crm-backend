import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Club } from '../club.entity';
import { Staff } from './staff.entity';

@Entity({ name: 'roster_templates' })
@Index(['clubId', 'staffId'], { unique: true })
export class RosterTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @ManyToOne(() => Club)
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'uuid', name: 'staff_id' })
  staffId!: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff!: Staff;

  @Column({ type: 'varchar', length: 200, name: 'staff_name' })
  staffName!: string;

  @Column({ type: 'varchar', length: 50, name: 'staff_role' })
  staffRole!: string;

  // Weekly off days (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  @Column({ type: 'jsonb', name: 'off_days', default: [] })
  offDays!: number[];

  // Default shift timings
  @Column({ type: 'time', name: 'default_shift_start_time', default: '18:00:00' })
  defaultShiftStartTime!: string;

  @Column({ type: 'time', name: 'default_shift_end_time', default: '02:00:00' })
  defaultShiftEndTime!: string;

  @Column({ type: 'boolean', name: 'shift_crosses_midnight', default: true })
  shiftCrossesMidnight!: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
