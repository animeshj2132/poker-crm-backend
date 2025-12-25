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

@Entity({ name: 'shifts' })
export class Shift {
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

  @Column({ type: 'date', name: 'shift_date' })
  shiftDate!: Date;

  @Column({ type: 'timestamp', name: 'shift_start_time' })
  shiftStartTime!: Date;

  @Column({ type: 'timestamp', name: 'shift_end_time' })
  shiftEndTime!: Date;

  @Column({ type: 'boolean', name: 'is_off_day', default: false })
  isOffDay!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

