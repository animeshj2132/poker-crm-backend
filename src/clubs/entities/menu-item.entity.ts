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

export enum MenuItemAvailability {
  AVAILABLE = 'available',
  LIMITED = 'limited',
  OUT_OF_STOCK = 'out_of_stock'
}

@Entity({ name: 'menu_items' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  category!: string;

  @Column({ type: 'boolean', default: false, name: 'is_custom_category' })
  isCustomCategory!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'varchar', nullable: true })
  supplier!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: MenuItemAvailability.AVAILABLE
  })
  availability!: MenuItemAvailability;

  @Column({ type: 'varchar', nullable: true, name: 'image_url_1', length: 2048 })
  imageUrl1!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'image_url_2', length: 2048 })
  imageUrl2!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'image_url_3', length: 2048 })
  imageUrl3!: string | null;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}












