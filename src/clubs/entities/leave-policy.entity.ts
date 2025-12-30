import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique
} from 'typeorm';
import { Club } from '../club.entity';
import { StaffRole } from './staff.entity';

@Entity({ name: 'leave_policies' })
@Unique(['clubId', 'role'])
export class LeavePolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @ManyToOne(() => Club)
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'varchar', name: 'role' })
  role!: StaffRole;

  @Column({ type: 'integer', name: 'leaves_per_year', default: 0 })
  leavesPerYear!: number;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy?: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

