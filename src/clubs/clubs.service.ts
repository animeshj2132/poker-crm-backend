import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Club } from './club.entity';
import { Tenant } from '../tenants/tenant.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { ClubRole } from '../common/rbac/roles';
import { FinancialTransaction, TransactionType, TransactionStatus } from './entities/financial-transaction.entity';

@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(UserClubRole) private readonly userClubRoleRepo: Repository<UserClubRole>,
    @InjectRepository(FinancialTransaction) private readonly transactionsRepo: Repository<FinancialTransaction>,
    @InjectDataSource() private readonly dataSource: DataSource
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
   * Get club revenue, rake, and tips data from real transactions
   */
  async getClubRevenue(clubId: string) {
    const club = await this.findById(clubId);
    if (!club) throw new NotFoundException('Club not found');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Format dates
    const formatDate = (date: Date) => date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    const formatTime = (date: Date) => date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatFull = (date: Date) => date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Query today's transactions
    const todayTransactions = await this.transactionsRepo.find({
      where: {
        club: { id: clubId },
        createdAt: Between(todayStart, todayEnd),
        status: TransactionStatus.COMPLETED
      }
    });

    // Query yesterday's transactions
    const yesterdayTransactions = await this.transactionsRepo.find({
      where: {
        club: { id: clubId },
        createdAt: Between(yesterdayStart, yesterdayEnd),
        status: TransactionStatus.COMPLETED
      }
    });

    // Calculate today's revenue (DEPOSIT and BUY_IN transactions)
    const todayRevenue = todayTransactions
      .filter(t => (t.type === TransactionType.DEPOSIT || t.type === TransactionType.BUY_IN))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Calculate today's rake
    const todayRake = todayTransactions
      .filter(t => t.type === TransactionType.RAKE)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Calculate today's tips
    const todayTips = todayTransactions
      .filter(t => t.type === TransactionType.TIP)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Calculate yesterday's revenue
    const yesterdayRevenue = yesterdayTransactions
      .filter(t => (t.type === TransactionType.DEPOSIT || t.type === TransactionType.BUY_IN))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Calculate yesterday's rake
    const yesterdayRake = yesterdayTransactions
      .filter(t => t.type === TransactionType.RAKE)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Calculate yesterday's tips
    const yesterdayTips = yesterdayTransactions
      .filter(t => t.type === TransactionType.TIP)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    return {
      clubId: club.id,
      clubName: club.name,
      previousDay: {
        revenue: Number(yesterdayRevenue.toFixed(2)),
        rake: Number(yesterdayRake.toFixed(2)),
        tips: Number(yesterdayTips.toFixed(2)),
        date: formatDate(yesterday),
        time: formatTime(yesterday),
        lastUpdated: formatFull(yesterday)
      },
      currentDay: {
        revenue: Number(todayRevenue.toFixed(2)),
        rake: Number(todayRake.toFixed(2)),
        tips: Number(todayTips.toFixed(2)),
        date: formatDate(now),
        time: formatTime(now),
        lastUpdated: formatFull(now)
      },
      tipHoldPercent: 0.15 // 15% of tips go to club
    };
  }

  /**
   * Find all clubs with tenant information (Master Admin)
   */
  async findAllWithTenants() {
    return await this.clubsRepo.find({
      relations: ['tenant'],
      order: {
        createdAt: 'DESC'
      }
    });
  }


  /**
   * Update club status (Master Admin)
   */
  async updateClubStatus(clubId: string, status: string, reason?: string) {
    const club = await this.findById(clubId);
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    club.status = status;
    if (reason) {
      club.subscriptionNotes = `Status changed to ${status}: ${reason}`;
    }

    return await this.clubsRepo.save(club);
  }

  /**
   * Update club subscription (Master Admin)
   */
  async updateClubSubscription(clubId: string, data: any) {
    const club = await this.findById(clubId);
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (data.subscriptionPrice !== undefined) {
      club.subscriptionPrice = data.subscriptionPrice;
    }
    if (data.subscriptionStatus) {
      club.subscriptionStatus = data.subscriptionStatus;
    }
    if (data.lastPaymentDate) {
      club.lastPaymentDate = new Date(data.lastPaymentDate);
    }
    if (data.subscriptionNotes) {
      club.subscriptionNotes = data.subscriptionNotes;
    }

    return await this.clubsRepo.save(club);
  }

  /**
   * Update club terms and conditions (Master Admin)
   */
  async updateClubTerms(clubId: string, termsAndConditions: string) {
    const club = await this.findById(clubId);
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    club.termsAndConditions = termsAndConditions;
    return await this.clubsRepo.save(club);
  }

  /**
   * Update club rummy enabled status (Master Admin)
   */
  async updateClubRummyEnabled(clubId: string, rummyEnabled: boolean) {
    const club = await this.findById(clubId);
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    club.rummyEnabled = rummyEnabled;
    return await this.clubsRepo.save(club);
  }

  /**
   * Factory Reset - Delete all club data
   * WARNING: This is destructive and irreversible
   */
  async factoryReset(clubId: string) {
    const club = await this.findById(clubId);
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Use a transaction to ensure all deletions happen atomically
    try {
      await this.dataSource.transaction(async (manager) => {
        // Delete in reverse order of dependencies
        
        // 1. Delete chat messages
        await manager.query('DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE club_id = $1)', [clubId]);
      
        // 2. Delete chat sessions
        await manager.query('DELETE FROM chat_sessions WHERE club_id = $1', [clubId]);
      
      // 3. Delete FNB orders
      await manager.query('DELETE FROM fnb_orders WHERE club_id = $1', [clubId]);
      
      // 4. Delete menu items
      await manager.query('DELETE FROM menu_items WHERE club_id = $1', [clubId]);
      
      // 5. Delete inventory items
      await manager.query('DELETE FROM inventory_items WHERE club_id = $1', [clubId]);
      
      // 6. Delete suppliers
      await manager.query('DELETE FROM suppliers WHERE club_id = $1', [clubId]);
      
      // 7. Delete kitchen stations
      await manager.query('DELETE FROM kitchen_stations WHERE club_id = $1', [clubId]);
      
      // 8. Delete menu categories
      await manager.query('DELETE FROM menu_categories WHERE club_id = $1', [clubId]);
      
      // 9. Delete affiliate transactions
      await manager.query('DELETE FROM affiliate_transactions WHERE affiliate_id IN (SELECT id FROM affiliates WHERE club_id = $1)', [clubId]);
      
      // 10. Delete affiliates
      await manager.query('DELETE FROM affiliates WHERE club_id = $1', [clubId]);
      
      // 11. Delete bonuses
      await manager.query('DELETE FROM player_bonuses WHERE club_id = $1', [clubId]);
      await manager.query('DELETE FROM staff_bonuses WHERE club_id = $1', [clubId]);
      
      // 12. Delete tip settings
      await manager.query('DELETE FROM tip_settings WHERE club_id = $1', [clubId]);
      
      // 13. Delete dealer cashouts
      await manager.query('DELETE FROM dealer_cashouts WHERE club_id = $1', [clubId]);
      
      // 14. Delete dealer tips
      await manager.query('DELETE FROM dealer_tips WHERE club_id = $1', [clubId]);
      
      // 15. Delete salary payments
      await manager.query('DELETE FROM salary_payments WHERE club_id = $1', [clubId]);
      
      // 16. Delete shifts
      await manager.query('DELETE FROM shifts WHERE club_id = $1', [clubId]);
      
      // 17. Delete tournaments and tournament players
      await manager.query('DELETE FROM tournament_players WHERE tournament_id IN (SELECT id FROM tournaments WHERE club_id = $1)', [clubId]);
      await manager.query('DELETE FROM tournaments WHERE club_id = $1', [clubId]);
      
      // 18. Delete tables
      await manager.query('DELETE FROM tables WHERE club_id = $1', [clubId]);
      
      // 19. Delete waitlist entries
      await manager.query('DELETE FROM waitlist_entries WHERE club_id = $1', [clubId]);
      
      // 20. Delete financial transactions
      await manager.query('DELETE FROM financial_transactions WHERE club_id = $1', [clubId]);
      
      // 21. Delete credit requests
      await manager.query('DELETE FROM credit_requests WHERE club_id = $1', [clubId]);
      
      // 22. Delete VIP products
      await manager.query('DELETE FROM vip_products WHERE club_id = $1', [clubId]);
      
      // 23. Delete push notifications
      await manager.query('DELETE FROM push_notifications WHERE club_id = $1', [clubId]);
      
      // 24. Delete club settings
      await manager.query('DELETE FROM club_settings WHERE club_id = $1', [clubId]);
      
      // 25. Delete players
      await manager.query('DELETE FROM players WHERE club_id = $1', [clubId]);
      
      // 26. Delete staff
      await manager.query('DELETE FROM staff WHERE club_id = $1', [clubId]);
      
      // 27. Delete audit logs (keep the factory reset log that was created before this)
      await manager.query('DELETE FROM audit_logs WHERE club_id = $1 AND action_type != $2', [clubId, 'factory_reset']);
      
      // 28. Delete user club roles
      await manager.query('DELETE FROM user_club_roles WHERE club_id = $1', [clubId]);
    });
    } catch (error) {
      console.error('Factory reset error:', error);
      throw new BadRequestException(`Factory reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      message: 'All club data has been wiped successfully',
    };
  }
}



