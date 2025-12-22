import {
  Column,
  CreateDateColumn,
  Entity,
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
  club!: Club;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text', nullable: true })
  value!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  jsonValue!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

