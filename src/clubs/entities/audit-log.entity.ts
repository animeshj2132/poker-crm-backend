import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Club } from '../club.entity';

export enum AuditLogAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  DENY = 'DENY',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  OVERRIDE = 'OVERRIDE'
}

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  action!: AuditLogAction;

  @Column({ type: 'varchar' })
  entityType!: string; // e.g., 'staff', 'credit_request', 'transaction', 'user'

  @Column({ type: 'varchar', nullable: true })
  entityId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  userEmail!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => Club, { nullable: true })
  club!: Club | null;

  @CreateDateColumn()
  createdAt!: Date;
}

