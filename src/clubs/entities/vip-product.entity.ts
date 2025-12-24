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

@Entity({ name: 'vip_products' })
export class VipProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'integer' })
  points!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl!: string | null; // Legacy field, kept for backward compatibility

  @Column({ type: 'jsonb', default: '[]', nullable: false })
  images!: Array<{ url: string }>; // Up to 3 images

  @Column({ type: 'integer', default: 0 })
  stock!: number; // Available stock

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean; // Whether product is available for redemption

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

