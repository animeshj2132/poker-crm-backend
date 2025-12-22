import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { UserTenantRole } from './user-tenant-role.entity';
import { UserClubRole } from './user-club-role.entity';

@Entity({ name: 'users_v1' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true, name: 'display_name' })
  displayName!: string | null;

  @Column({ type: 'varchar', nullable: true, select: false, name: 'password_hash' })
  passwordHash!: string | null;

  @Column({ default: false, name: 'must_reset_password' })
  mustResetPassword!: boolean;

  @Column({ default: false, name: 'is_master_admin' })
  isMasterAdmin!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UserTenantRole, (utr) => utr.user)
  tenantRoles!: UserTenantRole[];

  @OneToMany(() => UserClubRole, (ucr) => ucr.user)
  clubRoles!: UserClubRole[];
}



