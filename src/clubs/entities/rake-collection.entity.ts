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
import { Table } from './table.entity';
import { User } from '../../users/user.entity';

@Entity({ name: 'rake_collections' })
@Index(['club', 'sessionDate'])
@Index(['table', 'sessionDate'])
export class RakeCollection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @ManyToOne(() => Table, { nullable: false })
  @JoinColumn({ name: 'table_id' })
  table!: Table;

  @Column({ name: 'table_number', type: 'int' })
  tableNumber!: number;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate!: Date;

  @Column({ name: 'chip_denomination', type: 'varchar', length: 500, nullable: true })
  chipDenomination!: string | null;

  @Column({ name: 'total_rake_amount', type: 'decimal', precision: 10, scale: 2 })
  totalRakeAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'collected_by' })
  collectedBy!: User | null;

  @Column({ name: 'collected_by_name', type: 'varchar', length: 200, nullable: true })
  collectedByName!: string | null;

  @Column({ name: 'collected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  collectedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}






