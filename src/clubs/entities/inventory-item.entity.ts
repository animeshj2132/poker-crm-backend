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

@Entity({ name: 'inventory_items' })
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  category!: string;

  // Allow decimal stock values (e.g. 2.5 / 3.5 units)
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'current_stock' })
  currentStock!: number;

  // Allow decimal minimum stock thresholds
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'min_stock' })
  minStock!: number;

  @Column({ type: 'varchar', nullable: true })
  supplier!: string | null;

  @Column({ type: 'date', nullable: true, name: 'last_restocked' })
  lastRestocked!: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost!: number | null;

  @Column({ type: 'varchar', nullable: true })
  unit!: string | null;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}




















