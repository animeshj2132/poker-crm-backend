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

@Entity({ name: 'kitchen_stations' })
export class KitchenStation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200, name: 'station_name' })
  stationName!: string;

  @Column({ type: 'int', name: 'station_number' })
  stationNumber!: number;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'chef_name' })
  chefName!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'chef_id' })
  chefId!: string | null;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'chef_id' })
  chef!: Staff | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'int', default: 0, name: 'orders_completed' })
  ordersCompleted!: number;

  @Column({ type: 'int', default: 0, name: 'orders_pending' })
  ordersPending!: number;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

