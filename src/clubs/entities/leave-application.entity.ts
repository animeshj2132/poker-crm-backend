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

export enum LeaveStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled'
}

@Entity({ name: 'leave_applications' })
export class LeaveApplication {
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

  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: Date;

  @Column({ type: 'integer', name: 'number_of_days' })
  numberOfDays!: number;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', default: LeaveStatus.PENDING })
  status!: LeaveStatus;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedBy?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt?: Date | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'rejected_at' })
  rejectedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

