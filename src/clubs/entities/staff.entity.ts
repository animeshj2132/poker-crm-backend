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
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  HR = 'HR',
  GRE = 'GRE',
  CASHIER = 'Cashier',
  AFFILIATE = 'Affiliate',
  DEALER = 'Dealer',
  FNB = 'FNB',
  STAFF = 'Staff' // Custom role - name defined in custom_role_name field
}

export enum StaffStatus {
  ACTIVE = 'Active',
  ON_BREAK = 'On Break',
  SUSPENDED = 'Suspended',
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

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'password_hash' })
  passwordHash!: string | null;

  @Column({ type: 'boolean', default: true, name: 'temp_password' })
  tempPassword!: boolean;

  @Column({ type: 'text', nullable: true, name: 'aadhar_document_url' })
  aadharDocumentUrl!: string | null;

  @Column({ type: 'text', nullable: true, name: 'pan_document_url' })
  panDocumentUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true, name: 'affiliate_code' })
  affiliateCode!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'custom_role_name' })
  customRoleName!: string | null;

  @Column({ type: 'text', nullable: true, name: 'suspended_reason' })
  suspendedReason!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'suspended_at' })
  suspendedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'suspended_by' })
  suspendedBy!: string | null;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

