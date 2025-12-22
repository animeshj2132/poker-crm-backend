import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { UserClubRole } from '../users/user-club-role.entity';

@Entity({ name: 'clubs' })
export class Club {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'logo_url' })
  logoUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'video_url' })
  videoUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'skin_color' })
  skinColor!: string | null;

  @Column({ type: 'text', nullable: true, name: 'gradient' })
  gradient!: string | null;

  @Column({ type: 'varchar', length: 6, unique: true, nullable: true })
  code!: string | null; // Unique 6-digit club code

  @ManyToOne(() => Tenant, (tenant) => tenant.clubs, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UserClubRole, (ucr) => ucr.club)
  userRoles!: UserClubRole[];
}

