import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Club } from '../clubs/club.entity';
import { UserTenantRole } from '../users/user-tenant-role.entity';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true, name: 'branding_json' })
  brandingJson!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'logo_url' })
  logoUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'favicon_url' })
  faviconUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'primary_color' })
  primaryColor!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'secondary_color' })
  secondaryColor!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  theme!: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true, name: 'custom_domain' })
  customDomain!: string | null;

  @Column({ default: true, name: 'white_label' })
  whiteLabel!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Club, (club) => club.tenant)
  clubs!: Club[];

  @OneToMany(() => UserTenantRole, (utr) => utr.tenant)
  userRoles!: UserTenantRole[];
}

