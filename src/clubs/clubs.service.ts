import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from './club.entity';
import { Tenant } from '../tenants/tenant.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { ClubRole } from '../common/rbac/roles';

@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(UserClubRole) private readonly userClubRoleRepo: Repository<UserClubRole>
  ) {}

  /**
   * Generate a unique 6-digit club code
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists: boolean;
    
    do {
      // Generate random 6-digit code (000000 to 999999)
      code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const existing = await this.clubsRepo.findOne({ where: { code } });
      exists = !!existing;
    } while (exists);
    
    return code;
  }

  async create(tenantId: string, name: string) {
    // Validate inputs
    if (!name || !name.trim()) {
      throw new BadRequestException('Club name is required');
    }
    if (name.trim().length < 2) {
      throw new BadRequestException('Club name must be at least 2 characters long');
    }
    if (name.trim().length > 200) {
      throw new BadRequestException('Club name cannot exceed 200 characters');
    }

    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Check for duplicate club name in same tenant
    const existingClub = await this.clubsRepo.findOne({
      where: { tenant: { id: tenantId }, name: name.trim() }
    });
    if (existingClub) {
      throw new ConflictException(`A club with name "${name}" already exists in this tenant`);
    }

    // Generate unique 6-digit code
    const code = await this.generateUniqueCode();
    
    const club = this.clubsRepo.create({ 
      name: name.trim(), 
      tenant,
      code
    });
    return this.clubsRepo.save(club);
  }

  async createWithBranding(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      logoUrl?: string;
      videoUrl?: string;
      skinColor?: string;
      gradient?: string;
    }
  ) {
    // Validate inputs
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Club name is required');
    }
    if (data.name.trim().length < 2) {
      throw new BadRequestException('Club name must be at least 2 characters long');
    }
    if (data.name.trim().length > 200) {
      throw new BadRequestException('Club name cannot exceed 200 characters');
    }

    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Check for duplicate club name in same tenant
    const existingClub = await this.clubsRepo.findOne({
      where: { tenant: { id: tenantId }, name: data.name.trim() }
    });
    if (existingClub) {
      throw new ConflictException(`A club with name "${data.name}" already exists in this tenant`);
    }

    // Generate unique 6-digit code
    const code = await this.generateUniqueCode();
    
    const club = this.clubsRepo.create({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      videoUrl: data.videoUrl?.trim() || null,
      skinColor: data.skinColor?.trim() || null,
      gradient: data.gradient?.trim() || null,
      tenant,
      code
    });
    return this.clubsRepo.save(club);
  }

  listByTenant(tenantId: string) {
    return this.clubsRepo.find({ where: { tenant: { id: tenantId } } });
  }

  async findById(id: string) {
    return this.clubsRepo.findOne({ where: { id }, relations: ['tenant'] });
  }

  /**
   * Find club by unique 6-digit code
   */
  async findByCode(code: string) {
    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return null;
    }
    return this.clubsRepo.findOne({ 
      where: { code: code.trim() }, 
      relations: ['tenant'] 
    });
  }

  async validateClubBelongsToTenant(clubId: string, tenantId: string) {
    const club = await this.findById(clubId);
    if (!club) throw new NotFoundException('Club not found');
    if (club.tenant.id !== tenantId) {
      throw new ForbiddenException('Club does not belong to this tenant');
    }
    return club;
  }

  async listClubAdmins(clubId: string) {
    const roles = await this.userClubRoleRepo.find({
      where: { club: { id: clubId }, role: ClubRole.ADMIN },
      relations: ['user']
    });
    return roles.map((r) => ({
      id: r.user.id,
      email: r.user.email,
      displayName: r.user.displayName,
      roleId: r.id
    }));
  }

  /**
   * List all users for a club with their roles
   */
  async listClubUsers(clubId: string) {
    const roles = await this.userClubRoleRepo.find({
      where: { club: { id: clubId } },
      relations: ['user']
    });

    // Group by user (a user can have multiple roles)
    const userMap = new Map<string, {
      id: string;
      email: string;
      displayName: string | null;
      roles: Array<{ role: string; roleId: string }>;
    }>();

    for (const role of roles) {
      const userId = role.user.id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: role.user.id,
          email: role.user.email,
          displayName: role.user.displayName,
          roles: []
        });
      }
      userMap.get(userId)!.roles.push({
        role: role.role,
        roleId: role.id
      });
    }

    return Array.from(userMap.values());
  }

  /**
   * Get club revenue, rake, and tips data
   * TODO: Replace with real data from game transactions
   */
  async getClubRevenue(clubId: string) {
    const club = await this.findById(clubId);
    if (!club) throw new NotFoundException('Club not found');

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Format dates
    const formatDate = (date: Date) => date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    const formatTime = (date: Date) => date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatFull = (date: Date) => date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // TODO: Replace with actual database queries for revenue/rake/tips
    // For now, return mock data structure
    // In production, this should query:
    // - Game transactions for revenue
    // - Rake calculations from games
    // - Tips from transactions
    
    return {
      clubId: club.id,
      clubName: club.name,
      previousDay: {
        revenue: 125000, // Total revenue from games
        rake: 12500,     // 10% rake
        tips: 3750,      // Tips collected
        date: formatDate(yesterday),
        time: formatTime(yesterday),
        lastUpdated: formatFull(yesterday)
      },
      currentDay: {
        revenue: 45230,  // Total revenue from games today
        rake: 4523,      // 10% rake
        tips: 1357,      // Tips collected today
        date: formatDate(now),
        time: formatTime(now),
        lastUpdated: formatFull(now)
      },
      tipHoldPercent: 0.15 // 15% of tips go to club
    };
  }
}



