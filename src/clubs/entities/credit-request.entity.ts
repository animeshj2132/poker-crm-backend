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

export enum CreditRequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  DENIED = 'Denied'
}

@Entity({ name: 'credit_requests' })
export class CreditRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'player_id' })
  playerId!: string;

  @Column({ type: 'varchar', name: 'player_name' })
  playerName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', default: CreditRequestStatus.PENDING })
  status!: CreditRequestStatus;

  @Column({ default: false, name: 'visible_to_player' })
  visibleToPlayer!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'credit_limit' })
  limit!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

