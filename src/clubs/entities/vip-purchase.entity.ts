import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Club } from '../club.entity';
import { Player } from './player.entity';
import { VipProduct } from './vip-product.entity';

@Entity({ name: 'vip_purchases' })
export class VipPurchase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player_id' })
  player!: Player;

  @ManyToOne(() => VipProduct, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product!: VipProduct;

  @Column({ type: 'text', name: 'product_title' })
  productTitle!: string;

  @Column({ type: 'integer', name: 'points_spent' })
  pointsSpent!: number;

  @Column({ type: 'text', default: 'completed' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
