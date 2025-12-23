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
import { Affiliate } from './affiliate.entity';

@Entity({ name: 'players' })
@Index(['club', 'email'], { unique: true })
@Index(['club', 'panCard'], { unique: true, where: 'pan_card IS NOT NULL' }) // Unique PAN per club
@Index(['affiliate'])
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @ManyToOne(() => Affiliate, { nullable: true })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate!: Affiliate | null; // Null if signed up without affiliate code

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 200 })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'pan_card' })
  panCard!: string | null; // PAN card number (unique per club)

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'player_id' })
  playerId!: string | null; // Internal player ID

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_spent' })
  totalSpent!: number; // Total amount spent by player

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_commission' })
  totalCommission!: number; // Total commission generated for affiliate

  @Column({ type: 'varchar', default: 'Active' })
  status!: string; // Active, Inactive, Suspended

  @Column({ type: 'varchar', length: 20, default: 'pending', name: 'kyc_status' })
  kycStatus!: string; // pending, approved, rejected, verified

  @Column({ type: 'timestamp', nullable: true, name: 'kyc_approved_at' })
  kycApprovedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'kyc_approved_by' })
  kycApprovedBy!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'kyc_documents' })
  kycDocuments!: any | null; // Store document URLs and metadata

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', nullable: true, name: 'password_hash' })
  passwordHash!: string | null; // For player authentication

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname!: string | null; // Player's display nickname

  @Column({ type: 'boolean', default: false, name: 'credit_enabled' })
  creditEnabled!: boolean; // Whether credit is enabled for this player

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'credit_limit' })
  creditLimit!: number; // Approved credit limit for this player

  @Column({ type: 'uuid', nullable: true, name: 'credit_enabled_by' })
  creditEnabledBy!: string | null; // User who enabled credit

  @Column({ type: 'timestamp', nullable: true, name: 'credit_enabled_at' })
  creditEnabledAt!: Date | null; // When credit was enabled

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

