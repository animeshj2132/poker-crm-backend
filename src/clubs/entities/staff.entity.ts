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

export enum StaffRole {
  GRE = 'GRE',
  DEALER = 'Dealer',
  CASHIER = 'Cashier',
  HR = 'HR',
  MANAGER = 'Manager',
  FNB = 'FNB'
}

export enum StaffStatus {
  ACTIVE = 'Active',
  ON_BREAK = 'On Break',
  DEACTIVATED = 'Deactivated'
}

@Entity({ name: 'staff' })
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  role!: StaffRole;

  @Column({ type: 'varchar', default: StaffStatus.ACTIVE })
  status!: StaffStatus;

  @Column({ type: 'varchar', nullable: true, name: 'employee_id' })
  employeeId!: string | null;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

