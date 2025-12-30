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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}







