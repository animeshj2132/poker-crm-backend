import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { TenantRole } from '../common/rbac/roles';

@Entity({ name: 'user_tenant_roles' })
@Unique(['user', 'tenant', 'role'])
export class UserTenantRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.tenantRoles, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Tenant, (tenant) => tenant.userRoles, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar' })
  role!: TenantRole;
}



