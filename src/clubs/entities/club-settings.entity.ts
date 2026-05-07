import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique
} from 'typeorm';
import { Club } from '../club.entity';

@Entity({ name: 'club_settings' })
@Unique(['club', 'key'])
export class ClubSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Club, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text', nullable: true })
  value!: string | null;

  @Column({ name: 'json_value', type: 'jsonb', nullable: true })
  jsonValue!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

