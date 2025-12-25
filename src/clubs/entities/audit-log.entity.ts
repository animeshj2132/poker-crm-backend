import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Club } from '../club.entity';
import { Staff } from './staff.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club)
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff?: Staff;

  @Column({ type: 'uuid', nullable: true, name: 'staff_id' })
  staffId?: string;

  @Column({ type: 'varchar', length: 255, name: 'staff_name' })
  staffName!: string;

  @Column({ type: 'varchar', length: 100, name: 'staff_role' })
  staffRole!: string;

  @Column({ type: 'varchar', length: 100, name: 'action_type' })
  actionType!: string;

  @Column({ type: 'varchar', length: 50, name: 'action_category' })
  actionCategory!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'target_type' })
  targetType?: string;

  @Column({ type: 'uuid', nullable: true, name: 'target_id' })
  targetId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'target_name' })
  targetName?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent?: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;
}
