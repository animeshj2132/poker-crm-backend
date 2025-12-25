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
import { KitchenStation } from './kitchen-station.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  updatedBy: string;
}

@Entity({ name: 'fnb_orders' })
export class FnbOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Order number is assigned only after acceptance
  @Column({ type: 'varchar', name: 'order_number', nullable: true })
  orderNumber!: string | null;

  @Column({ type: 'varchar', name: 'player_name' })
  playerName!: string;

  @Column({ type: 'varchar', name: 'player_id', nullable: true })
  playerId!: string | null;

  @Column({ type: 'varchar', name: 'table_number' })
  tableNumber!: string;

  @Column({ type: 'json' })
  items!: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'varchar', default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true, name: 'special_instructions' })
  specialInstructions!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'processed_by' })
  processedBy!: string | null;

  // Acceptance/Rejection fields
  @Column({ type: 'boolean', nullable: true, name: 'is_accepted' })
  isAccepted!: boolean | null;

  @Column({ type: 'text', nullable: true, name: 'rejected_reason' })
  rejectedReason!: string | null;

  // Kitchen Station assignment
  @Column({ type: 'uuid', nullable: true, name: 'station_id' })
  stationId!: string | null;

  @ManyToOne(() => KitchenStation, { nullable: true })
  @JoinColumn({ name: 'station_id' })
  station!: KitchenStation | null;

  @Column({ type: 'varchar', nullable: true, name: 'station_name' })
  stationName!: string | null;

  @Column({ type: 'boolean', default: false, name: 'sent_to_chef' })
  sentToChef!: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'chef_assigned' })
  chefAssigned!: string | null;

  // Invoice fields (generated only after delivery)
  @Column({ type: 'varchar', nullable: true, name: 'invoice_number' })
  invoiceNumber!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'invoice_generated_at' })
  invoiceGeneratedAt!: Date | null;

  @Column({ type: 'json', nullable: true, name: 'status_history' })
  statusHistory!: StatusHistoryEntry[] | null;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}












