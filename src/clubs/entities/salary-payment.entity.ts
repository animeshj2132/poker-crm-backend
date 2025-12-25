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

export enum PayPeriod {
  WEEKLY = 'Weekly',
  BI_WEEKLY = 'Bi-weekly',
  MONTHLY = 'Monthly'
}

export enum PaymentStatus {
  PROCESSED = 'Processed',
  PAID = 'Paid',
  CANCELLED = 'Cancelled'
}

@Entity({ name: 'salary_payments' })
export class SalaryPayment {
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

  @Column({ type: 'varchar', name: 'pay_period' })
  payPeriod!: PayPeriod;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'base_salary' })
  baseSalary!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'overtime_hours', default: 0 })
  overtimeHours!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'overtime_amount', default: 0 })
  overtimeAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductions!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'gross_amount' })
  grossAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'net_amount' })
  netAmount!: number;

  @Column({ type: 'date', name: 'payment_date' })
  paymentDate!: Date;

  @Column({ type: 'date', name: 'period_start_date' })
  periodStartDate!: Date;

  @Column({ type: 'date', name: 'period_end_date' })
  periodEndDate!: Date;

  @Column({ type: 'varchar', default: PaymentStatus.PROCESSED })
  status!: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', name: 'processed_by', nullable: true })
  processedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

