import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Club } from '../clubs/club.entity';
import { UserTenantRole } from '../users/user-tenant-role.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Club)
    private readonly clubsRepo: Repository<Club>,
    @InjectRepository(UserTenantRole)
    private readonly userTenantRoleRepo: Repository<UserTenantRole>,
  ) {}

  async create(name: string) {
    // Validate inputs
    if (!name || !name.trim()) {
      throw new BadRequestException('Tenant name is required');
    }
    if (name.trim().length < 2) {
      throw new BadRequestException('Tenant name must be at least 2 characters long');
    }
    if (name.trim().length > 200) {
      throw new BadRequestException('Tenant name cannot exceed 200 characters');
    }

    const existing = await this.tenantsRepo.findOne({ where: { name: name.trim() } });
    if (existing) throw new ConflictException('Tenant name already exists');
    const tenant = this.tenantsRepo.create({ name: name.trim() });
    return this.tenantsRepo.save(tenant);
  }

  async findAll() {
    try {
      return await this.tenantsRepo.find();
    } catch (err) {
      console.error('Error in TenantsService.findAll():', err);
      throw err;
    }
  }

  async findById(id: string) {
    return await this.tenantsRepo.findOne({ where: { id } });
  }

  async findByName(name: string) {
    if (!name || !name.trim()) {
      return null;
    }
    return await this.tenantsRepo.findOne({ where: { name: name.trim() } });
  }

  async updateBranding(
    tenantId: string,
    data: Partial<{
      logoUrl: string;
      faviconUrl: string;
      primaryColor: string;
      secondaryColor: string;
      theme: Record<string, unknown>;
      customDomain: string;
      whiteLabel: boolean;
    }>
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Validate custom domain if provided
    if (data.customDomain !== undefined) {
      if (data.customDomain && data.customDomain.trim()) {
        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(data.customDomain.trim())) {
          throw new BadRequestException('Invalid custom domain format');
        }
        const domainHolder = await this.tenantsRepo.findOne({ where: { customDomain: data.customDomain.trim() } });
        if (domainHolder && domainHolder.id !== tenantId) {
          throw new ConflictException('Custom domain already in use');
        }
        data.customDomain = data.customDomain.trim();
      } else {
        data.customDomain = undefined as any;
      }
    }

    // Validate color format if provided
    if (data.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) {
      throw new BadRequestException('Primary color must be a valid hex color (e.g., #FF5733)');
    }
    if (data.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.secondaryColor)) {
      throw new BadRequestException('Secondary color must be a valid hex color (e.g., #FF5733)');
    }

    Object.assign(tenant, data);
    return this.tenantsRepo.save(tenant);
  }

  async deleteTenantPermanently(
    tenantId: string,
    options?: { forceDeleteActiveClubs?: boolean }
  ) {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const forceDeleteActiveClubs = !!options?.forceDeleteActiveClubs;

    const tenantClubs = await this.clubsRepo.find({
      where: { tenant: { id: tenantId } },
      relations: ['tenant'],
    });

    const activeClubs = tenantClubs.filter(
      (club) => String(club.status || '').toLowerCase() === 'active'
    );
    if (activeClubs.length > 0 && !forceDeleteActiveClubs) {
      const activeNames = activeClubs.map((club) => club.name).join(', ');
      throw new BadRequestException(
        `Cannot delete tenant while active club(s) exist: ${activeNames}. Suspend/kill first, or retry with force delete override.`
      );
    }

    const invalidStatusClubs = tenantClubs.filter((club) => {
      const status = String(club.status || '').toLowerCase();
      return status !== 'suspended' && status !== 'killed';
    });
    if (invalidStatusClubs.length > 0 && !forceDeleteActiveClubs) {
      const invalidNames = invalidStatusClubs.map((club) => `${club.name} (${club.status})`).join(', ');
      throw new BadRequestException(
        `Tenant can only be permanently deleted when all clubs are suspended or killed. Invalid status found: ${invalidNames}. You can use force delete override if required.`
      );
    }

    try {
      await this.tenantsRepo.manager.transaction(async (manager) => {
        const clubIds = tenantClubs.map((club) => club.id);
        await this.cleanupDependentRowsForTenant(manager, tenantId, clubIds);

        await manager
          .createQueryBuilder()
          .delete()
          .from(UserTenantRole)
          .where('tenant_id = :tenantId', { tenantId })
          .execute();

        if (clubIds.length > 0) {
          await manager
            .createQueryBuilder()
            .delete()
            .from(Club)
            .where('tenant_id = :tenantId', { tenantId })
            .execute();
        }

        await manager
          .createQueryBuilder()
          .delete()
          .from(Tenant)
          .where('id = :tenantId', { tenantId })
          .execute();
      });
    } catch (error) {
      throw new BadRequestException(
        'Unable to permanently delete tenant. Ensure all tenant clubs are suspended/killed and no active operational records depend on them.'
      );
    }

    return {
      success: true,
      message: `Tenant "${tenant.name}" deleted permanently`,
      tenantId,
      deletedClubsCount: tenantClubs.length,
      forceDeleteApplied: forceDeleteActiveClubs,
    };
  }

  private async cleanupDependentRowsForTenant(
    manager: DataSource['manager'],
    tenantId: string,
    clubIds: string[],
  ) {
    if (clubIds.length > 0) {
      const clubScopedTables = await manager.query(
        `SELECT DISTINCT table_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND column_name = 'club_id'`
      );

      const excludedClubTables = new Set(['clubs']);
      for (const row of clubScopedTables) {
        const tableName = String(row.table_name || '');
        if (!tableName || excludedClubTables.has(tableName)) continue;
        await manager.query(
          `DELETE FROM "${tableName}" WHERE club_id = ANY($1::uuid[])`,
          [clubIds]
        );
      }
    }

    const tenantScopedTables = await manager.query(
      `SELECT DISTINCT table_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND column_name = 'tenant_id'`
    );

    const excludedTenantTables = new Set(['tenants', 'clubs', 'user_tenant_roles']);
    for (const row of tenantScopedTables) {
      const tableName = String(row.table_name || '');
      if (!tableName || excludedTenantTables.has(tableName)) continue;
      await manager.query(
        `DELETE FROM "${tableName}" WHERE tenant_id = $1`,
        [tenantId]
      );
    }
  }
}

