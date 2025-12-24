import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>
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
}

