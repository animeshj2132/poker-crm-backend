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

export enum AttendanceStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  INCOMPLETE = 'incomplete'
}

@Entity({ name: 'attendance_tracking' })
@Index(['club', 'date'])
@Index(['staff', 'date'])
export class AttendanceTracking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @ManyToOne(() => Staff, { nullable: false })
  @JoinColumn({ name: 'staff_id' })
  staff!: Staff;

  @Column({ name: 'login_time', type: 'timestamp' })
  loginTime!: Date;

  @Column({ name: 'logout_time', type: 'timestamp', nullable: true })
  logoutTime!: Date | null;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ name: 'total_hours', type: 'decimal', precision: 5, scale: 2, nullable: true })
  totalHours!: number | null;

  @Column({ type: 'varchar', length: 20, default: AttendanceStatus.ACTIVE })
  status!: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Hours beyond scheduled shift (manual or computed); default 0 */
  @Column({ name: 'overtime_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  overtimeHours!: string;

  /** Higher wins when multiple roles mark same day: 3 tenant super, 2 club super, 1 HR/Admin/Manager */
  @Column({ name: 'marked_by_tier', type: 'int', default: 0 })
  markedByTier!: number;

  @Column({ name: 'marked_by_user_id', type: 'uuid', nullable: true })
  markedByUserId!: string | null;

  /** True when attendance was for a roster off day (overtime / extra work day) */
  @Column({ name: 'worked_roster_off_day', type: 'boolean', default: false })
  workedRosterOffDay!: boolean;

  @Column({ name: 'last_edit_reason', type: 'text', nullable: true })
  lastEditReason!: string | null;

  @Column({ name: 'last_edited_by_user_id', type: 'uuid', nullable: true })
  lastEditedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}









