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
import { Player } from './player.entity';

@Entity({ name: 'player_bonuses' })
export class PlayerBonus {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @ManyToOne(() => Club)
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'uuid', name: 'player_id' })
  playerId!: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'player_id' })
  player!: Player;

  @Column({ type: 'varchar', length: 100, name: 'bonus_type' })
  bonusType!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'bonus_amount' })
  bonusAmount!: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'uuid', name: 'processed_by', nullable: true })
  processedBy?: string;

  @Column({ type: 'timestamp', name: 'processed_at', default: () => 'CURRENT_TIMESTAMP' })
  processedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

