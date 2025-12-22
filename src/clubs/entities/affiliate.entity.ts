import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Club } from '../club.entity';
import { User } from '../../users/user.entity';
import { Player } from './player.entity';

@Entity({ name: 'affiliates' })
@Index(['club', 'code'], { unique: true })
@Index(['club', 'user'], { unique: true })
export class Affiliate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', unique: true, length: 20 })
  code!: string; // Unique affiliate code

  @Column({ type: 'varchar', length: 200, nullable: true })
  name!: string | null; // Display name for affiliate

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0, name: 'commission_rate' })
  commissionRate!: number; // Commission percentage (default 5%)

  @Column({ type: 'varchar', default: 'Active' })
  status!: string; // Active, Inactive, Suspended

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_commission' })
  totalCommission!: number; // Total commission earned

  @Column({ type: 'int', default: 0, name: 'total_referrals' })
  totalReferrals!: number; // Total number of players referred

  @OneToMany(() => Player, player => player.affiliate)
  players!: Player[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

