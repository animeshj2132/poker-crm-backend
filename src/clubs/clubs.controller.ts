import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Headers, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { CreateClubUserDto } from './dto/create-club-user.dto';
import { ClubsService } from './clubs.service';
import { UsersService } from '../users/users.service';
import { RolesGuard } from '../common/rbac/roles.guard';
import { Roles } from '../common/rbac/roles.decorator';
import { ClubRole, GlobalRole, TenantRole } from '../common/rbac/roles';
import { StorageService } from '../storage/storage.service';
import { StaffService } from './services/staff.service';
import { CreditRequestsService } from './services/credit-requests.service';
import { FinancialTransactionsService } from './services/financial-transactions.service';
import { VipProductsService } from './services/vip-products.service';
import { ClubSettingsService } from './services/club-settings.service';
import { AuditLogsService } from './services/audit-logs.service';
import { StaffRole, StaffStatus } from './entities/staff.entity';
import { CreditRequestStatus } from './entities/credit-request.entity';
import { TransactionType, TransactionStatus } from './entities/financial-transaction.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateCreditRequestDto } from './dto/create-credit-request.dto';
import { ApproveCreditDto } from './dto/approve-credit.dto';
import { UpdateCreditVisibilityDto } from './dto/update-credit-visibility.dto';
import { UpdateCreditLimitDto } from './dto/update-credit-limit.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateVipProductDto } from './dto/create-vip-product.dto';
import { UpdateVipProductDto } from './dto/update-vip-product.dto';
import { SetClubSettingDto } from './dto/set-club-setting.dto';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { AssignSeatDto } from './dto/assign-seat.dto';
import { WaitlistSeatingService } from './services/waitlist-seating.service';
import { AnalyticsService } from './services/analytics.service';
import { WaitlistStatus } from './entities/waitlist-entry.entity';
import { TableStatus, TableType } from './entities/table.entity';
import { AffiliatesService } from './services/affiliates.service';
import { CreateAffiliateDto } from './dto/create-affiliate.dto';
import { CreatePlayerDto } from './dto/create-player.dto';
import { ApprovePlayerDto } from './dto/approve-player.dto';
import { SuspendPlayerDto } from './dto/suspend-player.dto';
import { RejectPlayerDto } from './dto/reject-player.dto';
import { ApproveFieldUpdateDto } from './dto/approve-field-update.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { VerifyClubCodeDto } from './dto/verify-club-code.dto';
import { Player } from './entities/player.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransaction } from './entities/financial-transaction.entity';
import { Affiliate } from './entities/affiliate.entity';
import { FnbService } from './services/fnb.service';
import { CreateFnbOrderDto } from './dto/create-fnb-order.dto';
import { UpdateFnbOrderDto } from './dto/update-fnb-order.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { OrderStatus } from './entities/fnb-order.entity';

@Controller('clubs')
export class ClubsController {
  constructor(
    private readonly clubsService: ClubsService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
    private readonly creditRequestsService: CreditRequestsService,
    private readonly financialTransactionsService: FinancialTransactionsService,
    private readonly vipProductsService: VipProductsService,
    private readonly clubSettingsService: ClubSettingsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly waitlistSeatingService: WaitlistSeatingService,
    private readonly analyticsService: AnalyticsService,
    private readonly affiliatesService: AffiliatesService,
    private readonly fnbService: FnbService,
    @InjectRepository(Player) private readonly playersRepo: Repository<Player>,
    @InjectRepository(FinancialTransaction) private readonly transactionsRepo: Repository<FinancialTransaction>,
    @InjectRepository(Affiliate) private readonly affiliatesRepo: Repository<Affiliate>
  ) {}

  /**
   * Verify club code (public endpoint for players)
   * POST /api/clubs/verify-code
   */
  @Post('verify-code')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyClubCode(@Body() dto: VerifyClubCodeDto) {
    try {
      // Edge case: Validate DTO exists
      if (!dto) {
        return {
          valid: false,
          message: 'Request body is required'
        };
      }

      // Edge case: Validate code exists and is string
      if (!dto.code || typeof dto.code !== 'string') {
        return {
          valid: false,
          message: 'Club code is required and must be a string'
        };
      }

      // Edge case: Trim and validate code format
      const trimmedCode = dto.code.trim();
      if (!trimmedCode) {
        return {
          valid: false,
          message: 'Club code cannot be empty'
        };
      }

      // Edge case: Validate code length
      if (trimmedCode.length !== 6) {
        return {
          valid: false,
          message: 'Club code must be exactly 6 digits'
        };
      }

      // Edge case: Validate code contains only digits
      if (!/^\d{6}$/.test(trimmedCode)) {
        return {
          valid: false,
          message: 'Club code must contain only digits'
        };
      }

      // Edge case: Prevent SQL injection (code is already validated as digits only, but double-check)
      const dangerousChars = [';', '--', '/*', '*/', "'", '"', '\\', '<', '>', '&', '|', '`'];
      for (const char of dangerousChars) {
        if (trimmedCode.includes(char)) {
          return {
            valid: false,
            message: 'Invalid club code format'
          };
        }
      }

      // Edge case: Check for all zeros or all same digits (optional validation)
      if (/^0{6}$/.test(trimmedCode)) {
        return {
          valid: false,
          message: 'Invalid club code'
        };
      }

      // Edge case: Database query with error handling
      let club;
      try {
        club = await this.clubsService.findByCode(trimmedCode);
      } catch (dbError) {
        console.error('Database error in verifyClubCode:', dbError);
        return {
          valid: false,
          message: 'Unable to verify club code. Please try again.'
        };
      }
      
      // Edge case: Club not found
      if (!club) {
        return {
          valid: false,
          message: 'Invalid club code'
        };
      }

      // Edge case: Club exists but code is null/undefined (shouldn't happen but check anyway)
      if (!club.code || typeof club.code !== 'string') {
        return {
          valid: false,
          message: 'Club code not configured'
        };
      }

      // Edge case: Code mismatch (shouldn't happen but verify)
      if (club.code !== trimmedCode) {
        return {
          valid: false,
          message: 'Invalid club code'
        };
      }

      // Edge case: Tenant validation
      if (!club.tenant) {
        return {
          valid: false,
          message: 'Club configuration error'
        };
      }
      if (!club.tenant.id) {
        return {
          valid: false,
          message: 'Club configuration error'
        };
      }

      // Edge case: Club name validation
      if (!club.name || typeof club.name !== 'string') {
        return {
          valid: false,
          message: 'Club configuration error'
        };
      }

      // Edge case: Verify tenant exists
      if (!club.tenant || !club.tenant.id) {
        return {
          valid: false,
          message: 'Club configuration error'
        };
      }

      // Edge case: Validate club ID exists
      if (!club.id) {
        return {
          valid: false,
          message: 'Club configuration error'
        };
      }

      return {
        valid: true,
        clubId: club.id,
        clubName: club.name.trim(),
        tenantId: club.tenant.id,
        tenantName: (club.tenant.name || '').trim()
      };
    } catch (e) {
      // Edge case: Catch any unexpected errors
      console.error('Unexpected error in verifyClubCode:', e);
      return {
        valid: false,
        message: 'Unable to verify club code. Please try again.'
      };
    }
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(TenantRole.SUPER_ADMIN, GlobalRole.MASTER_ADMIN)
  async list(@Headers('x-tenant-id') tenantId?: string) {
    try {
      // Edge case: Super Admin requires tenant-id
      // Master Admin can optionally filter by tenant-id
      if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new BadRequestException('x-tenant-id header is required and must be a non-empty string');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      const clubs = await this.clubsService.listByTenant(tenantId.trim());
      // Edge case: Return empty array if no clubs, not null
      return clubs || [];
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException) {
      throw e;
      }
      throw new BadRequestException(`Failed to list clubs: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateClubDto
  ) {
    try {
      // Edge case: Validate tenant ID
      if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new BadRequestException('x-tenant-id header is required and must be a non-empty string');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Edge case: Validate club name
      if (!dto || !dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
        throw new BadRequestException('Club name is required and must be a non-empty string');
      }

      if (dto.name.trim().length < 2) {
        throw new BadRequestException('Club name must be at least 2 characters long');
      }

      if (dto.name.trim().length > 200) {
        throw new BadRequestException('Club name cannot exceed 200 characters');
      }

      return await this.clubsService.create(tenantId.trim(), dto.name.trim());
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ConflictException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create club: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/logo-upload-url')
  @Roles(TenantRole.SUPER_ADMIN)
  async createClubLogoUploadUrl(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ) {
    try {
      // Edge case: Validate tenant ID
      if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new BadRequestException('x-tenant-id header is required and must be a non-empty string');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(id);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Edge case: Validate club belongs to tenant
      await this.clubsService.validateClubBelongsToTenant(id, tenantId.trim());

      const path = `tenants/${tenantId.trim()}/clubs/${id}/logo.png`;
      return await this.storageService.createSignedUploadUrl(path);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create logo upload URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/admins')
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async assignAdmin(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: AssignAdminDto
  ) {
    try {
      // Edge case: Validate tenant ID
      if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new BadRequestException('x-tenant-id header is required and must be a non-empty string');
      }

      // Edge case: Validate email
      if (!dto || !dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
        throw new BadRequestException('Email is required and must be a non-empty string');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email.trim())) {
        throw new BadRequestException('Invalid email format');
      }

      // Edge case: Validate display name if provided
      let displayName = null;
      if (dto.displayName) {
        if (typeof dto.displayName !== 'string') {
          throw new BadRequestException('Display name must be a string');
        }
        displayName = dto.displayName.trim() || null;
        if (displayName && displayName.length > 100) {
          throw new BadRequestException('Display name cannot exceed 100 characters');
        }
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Edge case: Validate club belongs to tenant
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());

      let user = await this.usersService.findByEmail(dto.email.trim().toLowerCase());
      if (!user) {
        user = await this.usersService.createUser(dto.email.trim().toLowerCase(), displayName);
      }

      await this.usersService.assignClubRole(user.id, clubId, ClubRole.ADMIN);
      return { message: 'Admin assigned successfully', userId: user.id };
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ConflictException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to assign admin: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/admins')
  @Roles(TenantRole.SUPER_ADMIN)
  async listAdmins(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate tenant ID
      if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new BadRequestException('x-tenant-id header is required and must be a non-empty string');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Edge case: Validate club belongs to tenant
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());

      const admins = await this.clubsService.listClubAdmins(clubId);
      // Edge case: Return empty array if no admins, not null
      return admins || [];
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to list admins: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Delete(':id/admins/:userId')
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAdmin(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ) {
    try {
      // Edge case: Validate tenant ID
      if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new BadRequestException('x-tenant-id header is required and must be a non-empty string');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Edge case: Validate user exists
      const targetUser = await this.usersService.findById(userId);
      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      // Edge case: Validate club belongs to tenant
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());

      // Note: removeClubRole will handle the case where the role doesn't exist

      await this.usersService.removeClubRole(userId, clubId, ClubRole.ADMIN);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to remove admin: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(TenantRole.SUPER_ADMIN, GlobalRole.MASTER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.STAFF, ClubRole.AFFILIATE, ClubRole.CASHIER, ClubRole.GRE)
  async getClub(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users (Admin, Manager, etc.), validate they can only access their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only access your assigned club');
      }
      }

      return club;
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get club: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/revenue')
  @Roles(TenantRole.SUPER_ADMIN, GlobalRole.MASTER_ADMIN)
  async getClubRevenue(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim()) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      const revenue = await this.clubsService.getClubRevenue(clubId);
      // Edge case: Return 0 if revenue is null/undefined
      return revenue || { total: 0, transactions: [] };
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get club revenue: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a club-scoped user (Admin, Manager, HR, Staff, Affiliate, Cashier, GRE)
   * Super Admin can create users for their clubs
   */
  @Post(':id/users')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.HR)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createClubUser(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateClubUserDto
  ) {
    try {
      // Edge case: Validate email format
      if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
        throw new BadRequestException('Email is required and must be a non-empty string');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email.trim())) {
        throw new BadRequestException('Invalid email format');
      }

      // Edge case: Validate role
      if (!dto.role || typeof dto.role !== 'string') {
        throw new BadRequestException('Role is required');
      }
      if (!Object.values(ClubRole).includes(dto.role)) {
        throw new BadRequestException(`Invalid club role. Must be one of: ${Object.values(ClubRole).join(', ')}`);
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users (Admin, HR), validate they can only create users for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only create users for your assigned club');
      }

      // Edge case: Validate display name if provided
      let displayName = null;
      if (dto.displayName) {
        if (typeof dto.displayName !== 'string') {
          throw new BadRequestException('Display name must be a string');
        }
        displayName = dto.displayName.trim() || null;
        if (displayName && displayName.length > 100) {
          throw new BadRequestException('Display name cannot exceed 100 characters');
        }
      }
      
      const result = await this.usersService.createClubUser(
        dto.email.trim().toLowerCase(),
        displayName,
        clubId,
        dto.role
      );

      return {
        message: result.roleAlreadyAssigned 
          ? 'User already has this role for this club'
          : result.isExistingUser
          ? 'User assigned to club successfully'
          : 'User created and assigned to club successfully',
        user: result.user,
        tempPassword: result.tempPassword, // Only for new users
        clubId: result.clubId,
        role: result.role,
        isExistingUser: result.isExistingUser,
        roleAlreadyAssigned: result.roleAlreadyAssigned
      };
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ConflictException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create club user: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * List all users for a club (all roles)
   */
  @Get(':id/users')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.HR)
  async listClubUsers(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for HR)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users (HR) must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for HR role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (HR), validate they can only view users for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view users for your assigned club');
      }

      // Edge case: Error handling for database query
      let users;
      try {
        users = await this.clubsService.listClubUsers(clubId);
      } catch (dbError) {
        console.error('Database error fetching club users:', dbError);
        throw new BadRequestException('Unable to fetch club users. Please try again.');
      }

      // Edge case: Return empty array if no users, not null
      return users || [];
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to list club users: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a role from a user in a club
   */
  @Delete(':id/users/:userId/roles/:role')
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeClubUserRole(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('role') role: string
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      if (!role || !role.trim()) {
        throw new BadRequestException('Role is required');
      }
      if (!Object.values(ClubRole).includes(role as ClubRole)) {
        throw new BadRequestException('Invalid club role');
      }
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      await this.usersService.removeClubRole(userId, clubId, role as ClubRole);
    } catch (e) {
      throw e;
    }
  }

  // ========== Staff Management ==========
  @Get(':id/staff')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.STAFF)
  async listStaff(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users (Admin, Manager, HR, STAFF - read-only), validate they can only access their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only access staff from your assigned club');
      }

      const staff = await this.staffService.findAll(clubId);
      // Edge case: Return empty array if no staff, not null
      return staff || [];
    } catch (e) {
      // Re-throw known exceptions, wrap unknown errors
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to list staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/staff/:staffId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR)
  async getStaff(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and staffId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(staffId)) {
        throw new BadRequestException('Invalid staff ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/HR)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER, HR), validate they can only view staff for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view staff for your assigned club');
      }

      // Edge case: Error handling for database query
      let staff;
      try {
        staff = await this.staffService.findOne(staffId, clubId);
      } catch (dbError) {
        console.error('Database error fetching staff:', dbError);
        if (dbError instanceof NotFoundException) {
          throw dbError;
        }
        throw new BadRequestException('Unable to fetch staff. Please try again.');
      }

      if (!staff) {
        throw new NotFoundException('Staff not found');
      }

      // Edge case: Validate staff belongs to club
      if (staff.club && staff.club.id !== clubId) {
        throw new ForbiddenException('Staff does not belong to this club');
      }

      // Edge case: Validate staff data integrity
      if (!staff.id || !staff.name) {
        throw new BadRequestException('Staff data is incomplete or corrupted');
      }

      // Edge case: Validate staff has valid role
      if (!staff.role || !Object.values(StaffRole).includes(staff.role)) {
        console.warn(`Staff ${staffId} has invalid role: ${staff.role}`);
      }

      // Edge case: Validate staff has valid status
      if (!staff.status || !Object.values(StaffStatus).includes(staff.status)) {
        console.warn(`Staff ${staffId} has invalid status: ${staff.status}`);
      }

      // Edge case: Sanitize response data
      return {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        status: staff.status,
        employeeId: staff.employeeId || null,
        club: {
          id: staff.club?.id || clubId,
          name: staff.club?.name || null
        },
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/staff')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createStaff(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateStaffDto
  ) {
    try {
      // Edge case: Validate all required fields
      if (!dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
        throw new BadRequestException('Staff name is required and must be a non-empty string');
      }

      if (!dto.role || typeof dto.role !== 'string') {
        throw new BadRequestException('Staff role is required');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users, validate they can only create staff for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only create staff for your assigned club');
      }

      // Edge case: Validate employeeId format if provided
      if (dto.employeeId && typeof dto.employeeId === 'string' && dto.employeeId.trim()) {
        if (dto.employeeId.trim().length > 50) {
          throw new BadRequestException('Employee ID cannot exceed 50 characters');
        }
        // Validate employee ID format (alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9\-_]+$/.test(dto.employeeId.trim())) {
          throw new BadRequestException('Employee ID can only contain letters, numbers, hyphens, and underscores');
        }
      }

      return await this.staffService.create(clubId, dto.name, dto.role, dto.employeeId);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ConflictException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/staff/:staffId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  async updateStaff(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Body() dto: UpdateStaffDto
  ) {
    try {
      // Edge case: Validate at least one field is provided
      if (!dto || Object.keys(dto).length === 0) {
        throw new BadRequestException('At least one field must be provided for update');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users, validate they can only update staff from their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only update staff from your assigned club');
      }

      // Edge case: Validate staff exists before update
      const existingStaff = await this.staffService.findOne(staffId, clubId);
      if (!existingStaff) {
        throw new NotFoundException('Staff member not found');
      }

      // Edge case: Validate employeeId format if provided
      if (dto.employeeId !== undefined && dto.employeeId !== null) {
        if (typeof dto.employeeId === 'string' && dto.employeeId.trim()) {
          if (dto.employeeId.trim().length > 50) {
            throw new BadRequestException('Employee ID cannot exceed 50 characters');
          }
          if (!/^[a-zA-Z0-9\-_]+$/.test(dto.employeeId.trim())) {
            throw new BadRequestException('Employee ID can only contain letters, numbers, hyphens, and underscores');
          }
        }
      }

      return await this.staffService.update(staffId, clubId, dto);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ConflictException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to update staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Delete(':id/staff/:staffId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStaff(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users, validate they can only delete staff from their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only delete staff from your assigned club');
      }

      // Edge case: Validate staff exists before deletion
      const existingStaff = await this.staffService.findOne(staffId, clubId);
      if (!existingStaff) {
        throw new NotFoundException('Staff member not found');
      }

      await this.staffService.remove(staffId, clubId);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to delete staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ========== Credit Requests ==========
  @Get(':id/credit-requests')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  async listCreditRequests(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('status') status?: string
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate they can only access credit requests from their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access credit requests from your assigned club');
        }
      }
      
      // Edge case: Validate status if provided
      if (status && typeof status === 'string' && status.trim()) {
        if (!Object.values(CreditRequestStatus).includes(status.trim() as CreditRequestStatus)) {
          throw new BadRequestException(`Invalid credit request status. Must be one of: ${Object.values(CreditRequestStatus).join(', ')}`);
        }
      }
      
      const requests = await this.creditRequestsService.findAll(clubId, status?.trim() as CreditRequestStatus);
      // Edge case: Return empty array if no requests, not null
      return requests || [];
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to list credit requests: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/credit-requests')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createCreditRequest(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateCreditRequestDto
  ) {
    try {
      // Edge case: Validate required fields
      if (!dto.playerName || typeof dto.playerName !== 'string' || !dto.playerName.trim()) {
        throw new BadRequestException('Player name is required and must be a non-empty string');
      }
      if (dto.playerName.trim().length < 2) {
        throw new BadRequestException('Player name must be at least 2 characters long');
      }
      if (dto.playerName.trim().length > 100) {
        throw new BadRequestException('Player name cannot exceed 100 characters');
      }

      // Edge case: Validate amount
      if (dto.amount === null || dto.amount === undefined) {
        throw new BadRequestException('Amount is required');
      }
      const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('Requested amount must be a positive number');
      }
      if (amount > 10000000) {
        throw new BadRequestException('Requested amount cannot exceed ₹10,000,000');
      }

      // Note: CreateCreditRequestDto doesn't have playerEmail or playerPhone fields

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users, validate they can only create requests for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only create credit requests for your assigned club');
      }

      return await this.creditRequestsService.create(clubId, {
        playerId: dto.playerId.trim(),
        playerName: dto.playerName.trim(),
        amount: amount,
        notes: dto.notes?.trim() || undefined
      });
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create credit request: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/credit-requests/:requestId/approve')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  async approveCreditRequest(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto?: ApproveCreditDto
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate UUID format for requestId
      if (!uuidRegex.test(requestId)) {
        throw new BadRequestException('Invalid credit request ID format');
      }

      // Edge case: Validate tenant ID if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: CASHIER must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for CASHIER role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        try {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (CASHIER), validate they can only approve requests for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only approve credit requests for your assigned club');
        }
      }

      // Edge case: Validate credit limit if provided
      if (dto && dto.limit !== undefined && dto.limit !== null) {
        const limit = typeof dto.limit === 'string' ? parseFloat(dto.limit) : Number(dto.limit);
        if (isNaN(limit) || limit <= 0) {
          throw new BadRequestException('Credit limit must be a positive number');
        }
        if (limit > 10000000) {
          throw new BadRequestException('Credit limit cannot exceed ₹10,000,000');
        }
      }

      // Edge case: Validate credit request exists
      let creditRequest;
      try {
        creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
      } catch (dbError) {
        console.error('Database error fetching credit request:', dbError);
        throw new BadRequestException('Unable to fetch credit request. Please try again.');
      }
      if (!creditRequest) {
        throw new NotFoundException('Credit request not found');
      }

      // Edge case: Validate request belongs to club
      if ((creditRequest as any).club?.id !== clubId) {
        throw new ForbiddenException('Credit request does not belong to this club');
      }

      // Edge case: Validate request is in pending status
      if (creditRequest.status !== CreditRequestStatus.PENDING) {
        throw new BadRequestException(`Cannot approve credit request. Current status: ${creditRequest.status}`);
      }

      // Edge case: Validate credit limit calculation
      let creditLimit: number | undefined = undefined;
      if (dto?.limit !== undefined && dto?.limit !== null) {
        creditLimit = typeof dto.limit === 'string' ? parseFloat(dto.limit) : Number(dto.limit);
        if (isNaN(creditLimit) || creditLimit <= 0) {
          throw new BadRequestException('Credit limit must be a positive number');
        }
        if (creditLimit > 10000000) {
          throw new BadRequestException('Credit limit cannot exceed ₹10,000,000');
        }
        if (!isFinite(creditLimit)) {
          throw new BadRequestException('Credit limit must be a finite number');
        }
      }

      // Edge case: Error handling for approve operation
      let approvedRequest;
      try {
        approvedRequest = await this.creditRequestsService.approve(requestId, clubId, creditLimit);
      } catch (approveError) {
        console.error('Error approving credit request:', approveError);
        if (approveError instanceof BadRequestException || approveError instanceof ConflictException || approveError instanceof NotFoundException) {
          throw approveError;
        }
        throw new BadRequestException('Unable to approve credit request. Please try again.');
      }

      // Edge case: Validate approved request
      if (!approvedRequest || !approvedRequest.id) {
        throw new BadRequestException('Credit request approval failed. Please try again.');
      }

      return approvedRequest;
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to approve credit request: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/credit-requests/:requestId/deny')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  async denyCreditRequest(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate UUID format for requestId
      if (!uuidRegex.test(requestId)) {
        throw new BadRequestException('Invalid credit request ID format');
      }

      // Edge case: Validate tenant ID if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: CASHIER must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for CASHIER role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        try {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (CASHIER), validate they can only deny requests for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only deny credit requests for your assigned club');
        }
      }

      // Edge case: Validate credit request exists
      let creditRequest;
      try {
        creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
      } catch (dbError) {
        console.error('Database error fetching credit request:', dbError);
        throw new BadRequestException('Unable to fetch credit request. Please try again.');
      }
      if (!creditRequest) {
        throw new NotFoundException('Credit request not found');
      }

      // Edge case: Validate request belongs to club
      if ((creditRequest as any).club?.id !== clubId) {
        throw new ForbiddenException('Credit request does not belong to this club');
      }

      // Edge case: Validate request is in pending status
      if (creditRequest.status !== CreditRequestStatus.PENDING) {
        throw new BadRequestException(`Cannot deny credit request. Current status: ${creditRequest.status}`);
      }

      // Edge case: Error handling for deny operation
      let deniedRequest;
      try {
        deniedRequest = await this.creditRequestsService.deny(requestId, clubId);
      } catch (denyError) {
        console.error('Error denying credit request:', denyError);
        if (denyError instanceof BadRequestException || denyError instanceof ConflictException || denyError instanceof NotFoundException) {
          throw denyError;
        }
        throw new BadRequestException('Unable to deny credit request. Please try again.');
      }

      // Edge case: Validate denied request
      if (!deniedRequest || !deniedRequest.id) {
        throw new BadRequestException('Credit request denial failed. Please try again.');
      }

      return deniedRequest;
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to deny credit request: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/credit-requests/:requestId/visibility')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateCreditVisibility(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: UpdateCreditVisibilityDto
  ) {
    try {
      // Edge case: Validate tenant ID if provided
      if (tenantId && typeof tenantId !== 'string') {
        throw new BadRequestException('x-tenant-id header must be a string');
      }

      // Edge case: Validate request body
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException('Request body is required');
      }

      // Edge case: Validate visible field
      if (dto.visible === undefined || dto.visible === null) {
        throw new BadRequestException('Visible field is required');
      }
      if (typeof dto.visible !== 'boolean') {
        throw new BadRequestException('Visible field must be a boolean');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate they can only update requests for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only update credit requests for your assigned club');
        }
      }

      // Edge case: Validate credit request exists
      const creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
      if (!creditRequest) {
        throw new NotFoundException('Credit request not found');
      }

      return await this.creditRequestsService.updateVisibility(requestId, clubId, dto.visible);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to update credit visibility: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/credit-requests/:requestId/limit')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateCreditLimit(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: UpdateCreditLimitDto
  ) {
    try {
      // Edge case: Validate tenant ID if provided
      if (tenantId && typeof tenantId !== 'string') {
        throw new BadRequestException('x-tenant-id header must be a string');
      }

      // Edge case: Validate request body
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException('Request body is required');
      }

      // Edge case: Validate limit
      if (dto.limit === null || dto.limit === undefined) {
        throw new BadRequestException('Credit limit is required');
      }
      const limit = typeof dto.limit === 'string' ? parseFloat(dto.limit) : Number(dto.limit);
      if (isNaN(limit) || limit <= 0) {
        throw new BadRequestException('Credit limit must be a positive number');
      }
      if (limit > 10000000) {
        throw new BadRequestException('Credit limit cannot exceed ₹10,000,000');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate they can only update requests for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only update credit requests for your assigned club');
        }
      }

      // Edge case: Validate credit request exists
      const creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
      if (!creditRequest) {
        throw new NotFoundException('Credit request not found');
      }

      // Edge case: Validate request is approved
      if (creditRequest.status !== CreditRequestStatus.APPROVED) {
        throw new BadRequestException(`Cannot update limit. Credit request must be approved. Current status: ${creditRequest.status}`);
      }

      return await this.creditRequestsService.updateLimit(requestId, clubId, limit);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to update credit limit: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ========== Financial Transactions ==========
  @Get(':id/transactions')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  async listTransactions(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('status') status?: TransactionStatus
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users, validate they can only access transactions from their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access transactions from your assigned club');
        }
      }
      
      // Edge case: Validate status if provided
      if (status && typeof status === 'string' && !Object.values(TransactionStatus).includes(status)) {
        throw new BadRequestException(`Invalid transaction status. Must be one of: ${Object.values(TransactionStatus).join(', ')}`);
      }
      
      const transactions = await this.financialTransactionsService.findAll(clubId, status);
      // Edge case: Return empty array if no transactions, not null
      return transactions || [];
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to list transactions: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/transactions')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createTransaction(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateTransactionDto
  ) {
    try {
      // Edge case: Validate required fields
      if (!dto.playerName || typeof dto.playerName !== 'string' || !dto.playerName.trim()) {
        throw new BadRequestException('Player name is required and must be a non-empty string');
      }
      if (dto.playerName.trim().length < 2 || dto.playerName.trim().length > 100) {
        throw new BadRequestException('Player name must be between 2 and 100 characters');
      }

      // Edge case: Validate transaction type
      if (!dto.type || typeof dto.type !== 'string') {
        throw new BadRequestException('Transaction type is required');
      }
      if (!Object.values(TransactionType).includes(dto.type)) {
        throw new BadRequestException(`Invalid transaction type. Must be one of: ${Object.values(TransactionType).join(', ')}`);
      }

      // Edge case: Validate amount
      if (dto.amount === null || dto.amount === undefined) {
        throw new BadRequestException('Amount is required');
      }
      const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('Amount must be a positive number');
      }
      if (amount > 10000000) {
        throw new BadRequestException('Amount cannot exceed ₹10,000,000');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }
      
      // For club-scoped users, validate they can only create transactions for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only create transactions for your assigned club');
        }
      }

      return await this.financialTransactionsService.create(clubId, {
        ...dto,
        playerName: dto.playerName.trim(),
        amount: amount
      });
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create transaction: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/transactions/:transactionId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  async updateTransaction(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() dto: UpdateTransactionDto
  ) {
    try {
      // Edge case: Validate at least one field is provided
      if (!dto || typeof dto !== 'object' || Object.keys(dto).length === 0) {
        throw new BadRequestException('At least one field must be provided for update');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate they can only update transactions for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only update transactions for your assigned club');
        }
      }

      // Edge case: Validate transaction exists
      const transaction = await this.financialTransactionsService.findOne(transactionId, clubId);
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Edge case: Validate amount if provided
      if (dto.amount !== undefined && dto.amount !== null) {
        const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new BadRequestException('Amount must be a positive number');
        }
        if (amount > 10000000) {
          throw new BadRequestException('Amount cannot exceed ₹10,000,000');
        }
      }

      // Edge case: Validate status if provided
      if (dto.status !== undefined && dto.status !== null) {
        if (typeof dto.status !== 'string' || !Object.values(TransactionStatus).includes(dto.status)) {
          throw new BadRequestException(`Invalid transaction status. Must be one of: ${Object.values(TransactionStatus).join(', ')}`);
        }
      }

      // Note: UpdateTransactionDto only allows updating amount, notes, and status
      // Transaction type cannot be updated
      // Edge case: Validate amount if provided
      if (dto.amount !== undefined && dto.amount !== null) {
        const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new BadRequestException('Amount must be a positive number');
        }
      }

      // Edge case: Validate notes if provided
      if (dto.notes !== undefined && dto.notes !== null) {
        if (typeof dto.notes !== 'string') {
          throw new BadRequestException('Notes must be a string');
        }
        if (dto.notes.trim().length > 500) {
          throw new BadRequestException('Notes cannot exceed 500 characters');
        }
      }

      return await this.financialTransactionsService.update(transactionId, clubId, {
        amount: dto.amount,
        notes: dto.notes?.trim(),
        status: dto.status
      });
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to update transaction: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/transactions/:transactionId/cancel')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  async cancelTransaction(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate they can only cancel transactions for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only cancel transactions for your assigned club');
        }
      }

      // Edge case: Validate transaction exists
      const transaction = await this.financialTransactionsService.findOne(transactionId, clubId);
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Edge case: Validate transaction can be cancelled
      if (transaction.status === TransactionStatus.CANCELLED) {
        throw new BadRequestException('Transaction is already cancelled');
      }

      if (transaction.status === TransactionStatus.COMPLETED) {
        throw new BadRequestException('Cannot cancel a completed transaction');
      }

      return await this.financialTransactionsService.cancel(transactionId, clubId);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to cancel transaction: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ========== VIP Products ==========
  @Get(':id/vip-products')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async listVipProducts(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate they can only access VIP products from their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access VIP products from your assigned club');
        }
      }

      const products = await this.vipProductsService.findAll(clubId);
      // Edge case: Return empty array if no products, not null
      return products || [];
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to list VIP products: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/vip-products')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createVipProduct(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateVipProductDto
  ) {
    try {
      // Edge case: Validate request body
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException('Request body is required');
      }

      // Edge case: Validate product title
      if (!dto.title || typeof dto.title !== 'string' || !dto.title.trim()) {
        throw new BadRequestException('Product title is required and must be a non-empty string');
      }
      if (dto.title.trim().length < 2 || dto.title.trim().length > 200) {
        throw new BadRequestException('Product title must be between 2 and 200 characters');
      }

      // Edge case: Validate points
      if (dto.points === null || dto.points === undefined) {
        throw new BadRequestException('Points is required');
      }
      const points = typeof dto.points === 'string' ? parseInt(dto.points, 10) : Number(dto.points);
      if (isNaN(points) || points < 1) {
        throw new BadRequestException('Points must be at least 1');
      }
      if (points > 10000000) {
        throw new BadRequestException('Points cannot exceed 10,000,000');
      }

      // Edge case: Validate description if provided
      if (dto.description && typeof dto.description === 'string' && dto.description.trim().length > 1000) {
        throw new BadRequestException('Description cannot exceed 1000 characters');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate they can only create VIP products for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only create VIP products for your assigned club');
        }
      }

      return await this.vipProductsService.create(clubId, {
        title: dto.title.trim(),
        points: points,
        description: dto.description?.trim() || undefined,
        imageUrl: dto.imageUrl?.trim() || undefined
      });
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create VIP product: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/vip-products/:productId')
  @Roles(TenantRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  async updateVipProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: UpdateVipProductDto
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      return this.vipProductsService.update(productId, clubId, dto);
    } catch (e) {
      throw e;
    }
  }

  @Delete(':id/vip-products/:productId')
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVipProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      await this.vipProductsService.remove(productId, clubId);
    } catch (e) {
      throw e;
    }
  }

  // ========== Club Settings ==========
  @Get(':id/settings')
  @Roles(TenantRole.SUPER_ADMIN)
  async getClubSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      return this.clubSettingsService.getAllSettings(clubId);
    } catch (e) {
      throw e;
    }
  }

  @Put(':id/settings/:key')
  @Roles(TenantRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async setClubSetting(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('key') key: string,
    @Body() dto: SetClubSettingDto
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      return this.clubSettingsService.setSetting(clubId, key.trim(), dto.value);
    } catch (e) {
      throw e;
    }
  }

  // ========== Audit Logs ==========

  // ========== Dashboard Stats ==========
  @Get(':id/stats')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getClubStats(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only view stats for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view stats for your assigned club');
      }

      // Edge case: Error handling for database queries
      let staff: any[] = [];
      let creditRequests: any[] = [];
      let transactions: any[] = [];
      try {
        [staff, creditRequests, transactions] = await Promise.all([
        this.staffService.findAll(clubId).catch(() => []),
        this.creditRequestsService.findAll(clubId).catch(() => []),
        this.financialTransactionsService.findAll(clubId).catch(() => [])
      ]);
      } catch (dbError) {
        console.error('Database error fetching stats:', dbError);
        throw new BadRequestException('Unable to fetch club stats. Please try again.');
      }

      // Edge case: Validate arrays
      if (!Array.isArray(staff)) staff = [];
      if (!Array.isArray(creditRequests)) creditRequests = [];
      if (!Array.isArray(transactions)) transactions = [];

      return {
        totalStaff: staff.length,
        activeStaff: staff.filter(s => s && s.status === StaffStatus.ACTIVE).length,
        pendingCredit: creditRequests.filter(cr => cr && cr.status === CreditRequestStatus.PENDING).length,
        openOverrides: transactions.filter(t => t && t.status !== TransactionStatus.COMPLETED && t.status !== TransactionStatus.CANCELLED).length
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get club stats: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ========== Waitlist & Seating APIs ==========

  @Post(':id/waitlist')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createWaitlistEntry(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateWaitlistEntryDto
  ) {
    try {
      // Edge case: Validate required fields
      if (!dto.playerName || typeof dto.playerName !== 'string' || !dto.playerName.trim()) {
        throw new BadRequestException('Player name is required and must be a non-empty string');
      }
      if (dto.playerName.trim().length < 2 || dto.playerName.trim().length > 100) {
        throw new BadRequestException('Player name must be between 2 and 100 characters');
      }

      // Note: CreateWaitlistEntryDto uses phoneNumber, not playerPhone

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users, validate they can only create waitlist entries for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only create waitlist entries for your assigned club');
      }

      return await this.waitlistSeatingService.createWaitlistEntry(clubId, {
        playerName: dto.playerName.trim(),
        playerId: dto.playerId?.trim(),
        phoneNumber: dto.phoneNumber?.trim(),
        email: dto.email?.trim(),
        partySize: dto.partySize,
        priority: dto.priority,
        notes: dto.notes?.trim(),
        tableType: dto.tableType?.trim()
      });
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/waitlist')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE, ClubRole.STAFF)
  async getWaitlist(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('status') status?: WaitlistStatus
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate status if provided
      if (status !== undefined && status !== null) {
        const validStatuses = Object.values(WaitlistStatus);
        if (!validStatuses.includes(status)) {
          throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER, GRE, STAFF), validate they can only view waitlist for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view waitlist for your assigned club');
      }

      // Edge case: Error handling for database query
      let waitlist;
      try {
        waitlist = await this.waitlistSeatingService.getWaitlist(clubId, status);
      } catch (dbError) {
        console.error('Database error fetching waitlist:', dbError);
        throw new BadRequestException('Unable to fetch waitlist. Please try again.');
      }

      return waitlist || [];
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get waitlist: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/waitlist/:entryId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  async getWaitlistEntry(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and entryId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(entryId)) {
        throw new BadRequestException('Invalid waitlist entry ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER, GRE), validate they can only view waitlist entries for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view waitlist entries for your assigned club');
      }

      // Edge case: Error handling for database query
      let entry;
      try {
        entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to fetch waitlist entry. Please try again.');
      }

      if (!entry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Validate entry belongs to club
      if (entry.club && entry.club.id !== clubId) {
        throw new ForbiddenException('Waitlist entry does not belong to this club');
      }

      return entry;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/waitlist/:entryId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateWaitlistEntry(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Body() dto: UpdateWaitlistEntryDto
  ) {
    try {
      // Edge case: Validate UUID format for clubId and entryId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(entryId)) {
        throw new BadRequestException('Invalid waitlist entry ID format');
      }

      // Edge case: Validate request body
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException('Request body is required');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER, GRE), validate they can only update waitlist entries for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only update waitlist entries for your assigned club');
      }

      // Edge case: Validate waitlist entry exists and belongs to club before updating
      let existingEntry;
      try {
        existingEntry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to verify waitlist entry. Please try again.');
      }
      if (!existingEntry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Validate entry belongs to club
      if (existingEntry.club && existingEntry.club.id !== clubId) {
        throw new ForbiddenException('Waitlist entry does not belong to this club');
      }

      // Edge case: Validate entry status (cannot update SEATED or CANCELLED entries)
      if (existingEntry.status && (existingEntry.status === WaitlistStatus.SEATED || existingEntry.status === WaitlistStatus.CANCELLED)) {
        throw new BadRequestException(`Cannot update waitlist entry. Current status is: ${existingEntry.status}`);
      }

      // Edge case: Validate party size if provided
      if (dto.partySize !== undefined && dto.partySize !== null) {
        if (typeof dto.partySize !== 'number' || dto.partySize < 1 || dto.partySize > 20) {
          throw new BadRequestException('Party size must be between 1 and 20');
        }
      }

      // Edge case: Validate priority if provided
      if (dto.priority !== undefined && dto.priority !== null) {
        if (typeof dto.priority !== 'number' || dto.priority < 0 || dto.priority > 100) {
          throw new BadRequestException('Priority must be between 0 and 100');
        }
      }

      // Edge case: Error handling for update operation
      let updatedEntry;
      try {
        updatedEntry = await this.waitlistSeatingService.updateWaitlistEntry(clubId, entryId, dto);
      } catch (dbError) {
        console.error('Database error updating waitlist entry:', dbError);
        if (dbError instanceof NotFoundException || dbError instanceof BadRequestException) {
          throw dbError;
        }
        throw new BadRequestException('Unable to update waitlist entry. Please try again.');
      }

      if (!updatedEntry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Validate updated entry
      if (!updatedEntry.id || updatedEntry.id !== entryId) {
        throw new BadRequestException('Update operation failed. Entry ID mismatch.');
      }

      return updatedEntry;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to update waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/waitlist/:entryId/cancel')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.GRE)
  @HttpCode(HttpStatus.OK)
  async cancelWaitlistEntry(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and entryId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(entryId)) {
        throw new BadRequestException('Invalid waitlist entry ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users (GRE) must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for GRE role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (GRE), validate they can only cancel waitlist entries for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only cancel waitlist entries for your assigned club');
      }

      // Edge case: Validate waitlist entry exists
      let entry;
      try {
        entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to verify waitlist entry. Please try again.');
      }
      if (!entry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Validate entry belongs to club
      if (entry.club && entry.club.id !== clubId) {
        throw new ForbiddenException('Waitlist entry does not belong to this club');
      }

      // Edge case: Check if entry can be cancelled (must be PENDING)
      if (!entry.status || entry.status !== WaitlistStatus.PENDING) {
        throw new BadRequestException(`Cannot cancel waitlist entry. Current status: ${entry.status || 'Unknown'}. Only PENDING entries can be cancelled.`);
      }

      // Edge case: Check if entry is already cancelled
      if (entry.cancelledAt) {
        throw new ConflictException('Waitlist entry is already cancelled');
      }

      // Edge case: Error handling for cancel operation
      let cancelledEntry;
      try {
        cancelledEntry = await this.waitlistSeatingService.cancelWaitlistEntry(clubId, entryId);
      } catch (cancelError) {
        console.error('Database error cancelling waitlist entry:', cancelError);
        if (cancelError instanceof NotFoundException || cancelError instanceof BadRequestException || cancelError instanceof ConflictException) {
          throw cancelError;
        }
        throw new BadRequestException('Unable to cancel waitlist entry. Please try again.');
      }

      if (!cancelledEntry) {
        throw new NotFoundException('Waitlist entry not found or cancellation failed');
      }

      return cancelledEntry;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
      throw e;
      }
      throw new BadRequestException(`Failed to cancel waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Delete(':id/waitlist/:entryId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.GRE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWaitlistEntry(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and entryId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(entryId)) {
        throw new BadRequestException('Invalid waitlist entry ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users (GRE) must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for GRE role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (GRE), validate they can only delete waitlist entries for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only delete waitlist entries for your assigned club');
      }

      // Edge case: Validate waitlist entry exists before deletion
      let entry;
      try {
        entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to verify waitlist entry. Please try again.');
      }
      if (!entry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Validate entry belongs to club
      if (entry.club && entry.club.id !== clubId) {
        throw new ForbiddenException('Waitlist entry does not belong to this club');
      }

      // Edge case: Check if entry can be deleted (should not be SEATED)
      if (entry.status && entry.status === WaitlistStatus.SEATED) {
        throw new ConflictException('Cannot delete waitlist entry for seated player. Please unseat first.');
      }

      // Edge case: Check if entry is already deleted/cancelled (optional - for soft delete scenarios)
      if (entry.status && entry.status === WaitlistStatus.CANCELLED) {
        // Allow deletion of cancelled entries, but log it
        console.log(`Deleting already cancelled waitlist entry: ${entryId}`);
      }

      // Edge case: Error handling for delete operation
      try {
      await this.waitlistSeatingService.deleteWaitlistEntry(clubId, entryId);
      } catch (deleteError) {
        console.error('Database error deleting waitlist entry:', deleteError);
        if (deleteError instanceof NotFoundException || deleteError instanceof ConflictException) {
          throw deleteError;
        }
        throw new BadRequestException('Unable to delete waitlist entry. Please try again.');
      }
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
      throw e;
      }
      throw new BadRequestException(`Failed to delete waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/waitlist/:entryId/assign-seat')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async assignSeat(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Body() dto: AssignSeatDto
  ) {
    try {
      // Edge case: Validate UUID format for clubId, entryId, and tableId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(entryId)) {
        throw new BadRequestException('Invalid waitlist entry ID format');
      }
      if (!dto.tableId || !uuidRegex.test(dto.tableId)) {
        throw new BadRequestException('Invalid table ID format');
      }

      // Edge case: Validate request body
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException('Request body is required');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate user-id header (for tracking who assigned the seat)
      const seatedBy = dto.seatedBy || userId;
      if (!seatedBy || typeof seatedBy !== 'string' || !seatedBy.trim()) {
        throw new BadRequestException('x-user-id header or seatedBy field is required');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER, GRE), validate they can only assign seats for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only assign seats for your assigned club');
      }

      // Edge case: Validate waitlist entry exists and belongs to club
      let entry;
      try {
        entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to verify waitlist entry. Please try again.');
      }
      if (!entry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Validate entry belongs to club
      if (entry.club && entry.club.id !== clubId) {
        throw new ForbiddenException('Waitlist entry does not belong to this club');
      }

      // Edge case: Validate entry status (must be PENDING)
      if (entry.status && entry.status !== WaitlistStatus.PENDING) {
        throw new BadRequestException(`Cannot assign seat. Waitlist entry status is: ${entry.status}`);
      }

      // Edge case: Validate table exists and belongs to club
      let table;
      try {
        table = await this.waitlistSeatingService.getTable(clubId, dto.tableId);
      } catch (dbError) {
        console.error('Database error fetching table:', dbError);
        throw new BadRequestException('Unable to verify table. Please try again.');
      }
      if (!table) {
        throw new NotFoundException('Table not found');
      }

      // Edge case: Validate table belongs to club
      if (table.club && table.club.id !== clubId) {
        throw new ForbiddenException('Table does not belong to this club');
      }

      // Edge case: Validate table has enough seats
      const partySize = entry.partySize || 1;
      if (table.currentSeats + partySize > table.maxSeats) {
        throw new BadRequestException(`Table only has ${table.maxSeats - table.currentSeats} available seats. Party size is ${partySize}.`);
      }

      // Edge case: Validate table status (must be AVAILABLE or RESERVED)
      if (table.status && table.status !== TableStatus.AVAILABLE && table.status !== TableStatus.RESERVED) {
        throw new BadRequestException(`Table is ${table.status.toLowerCase()}. Cannot assign seat.`);
      }

      // Edge case: Validate seatedBy format (should be UUID or valid string)
      if (seatedBy.trim().length < 1 || seatedBy.trim().length > 200) {
        throw new BadRequestException('seatedBy must be between 1 and 200 characters');
      }

      // Edge case: Error handling for assign seat operation
      let assignedEntry;
      try {
        assignedEntry = await this.waitlistSeatingService.assignSeat(clubId, entryId, dto.tableId, seatedBy.trim());
      } catch (dbError) {
        console.error('Database error assigning seat:', dbError);
        if (dbError instanceof NotFoundException || dbError instanceof BadRequestException || dbError instanceof ConflictException) {
          throw dbError;
        }
        throw new BadRequestException('Unable to assign seat. Please try again.');
      }

      if (!assignedEntry) {
        throw new NotFoundException('Waitlist entry not found or assignment failed');
      }

      // Edge case: Validate assigned entry
      if (!assignedEntry.id || assignedEntry.status !== WaitlistStatus.SEATED) {
        throw new BadRequestException('Seat assignment failed. Entry was not properly seated.');
      }

      return assignedEntry;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
      throw e;
      }
      throw new BadRequestException(`Failed to assign seat: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/waitlist/:entryId/unseat')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @HttpCode(HttpStatus.OK)
  async unseatPlayer(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and entryId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(entryId)) {
        throw new BadRequestException('Invalid waitlist entry ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER, GRE), validate they can only unseat players for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only unseat players for your assigned club');
      }

      // Edge case: Validate waitlist entry exists and belongs to club
      let entry;
      try {
        entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to verify waitlist entry. Please try again.');
      }
      if (!entry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Validate entry belongs to club
      if (entry.club && entry.club.id !== clubId) {
        throw new ForbiddenException('Waitlist entry does not belong to this club');
      }

      // Edge case: Validate entry status (must be SEATED)
      if (!entry.status || entry.status !== WaitlistStatus.SEATED) {
        throw new BadRequestException(`Cannot unseat player. Waitlist entry status is: ${entry.status || 'Unknown'}. Only SEATED entries can be unseated.`);
      }

      // Edge case: Validate entry has a table assigned
      if (!entry.tableNumber) {
        throw new BadRequestException('Waitlist entry does not have a table assigned. Cannot unseat.');
      }

      // Edge case: Error handling for unseat operation
      let unseatedEntry;
      try {
        unseatedEntry = await this.waitlistSeatingService.unseatPlayer(clubId, entryId);
      } catch (dbError) {
        console.error('Database error unseating player:', dbError);
        if (dbError instanceof NotFoundException || dbError instanceof BadRequestException || dbError instanceof ConflictException) {
          throw dbError;
        }
        throw new BadRequestException('Unable to unseat player. Please try again.');
      }

      if (!unseatedEntry) {
        throw new NotFoundException('Waitlist entry not found or unseat failed');
      }

      // Edge case: Validate unseated entry
      if (!unseatedEntry.id) {
        throw new BadRequestException('Unseat operation failed. Entry was not properly updated.');
      }

      return unseatedEntry;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
      throw e;
      }
      throw new BadRequestException(`Failed to unseat player: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/tables')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createTable(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateTableDto
  ) {
    try {
      // Edge case: Validate required fields
      if (!dto.tableNumber || typeof dto.tableNumber !== 'number') {
        throw new BadRequestException('Table number is required and must be a number');
      }
      if (dto.tableNumber < 1) {
        throw new BadRequestException('Table number must be at least 1');
      }

      // Edge case: Validate table type
      if (!dto.tableType || typeof dto.tableType !== 'string') {
        throw new BadRequestException('Table type is required');
      }
      if (!Object.values(TableType).includes(dto.tableType)) {
        throw new BadRequestException(`Invalid table type. Must be one of: ${Object.values(TableType).join(', ')}`);
      }

      // Edge case: Validate numeric fields
      if (dto.minBuyIn !== undefined && dto.minBuyIn !== null) {
        const minBuyIn = typeof dto.minBuyIn === 'string' ? parseFloat(dto.minBuyIn) : Number(dto.minBuyIn);
        if (isNaN(minBuyIn) || minBuyIn < 0) {
          throw new BadRequestException('Minimum buy-in must be a non-negative number');
        }
      }

      if (dto.maxBuyIn !== undefined && dto.maxBuyIn !== null) {
        const maxBuyIn = typeof dto.maxBuyIn === 'string' ? parseFloat(dto.maxBuyIn) : Number(dto.maxBuyIn);
        if (isNaN(maxBuyIn) || maxBuyIn < 0) {
          throw new BadRequestException('Maximum buy-in must be a non-negative number');
        }
        // Validate maxBuyIn >= minBuyIn if both provided
        if (dto.minBuyIn !== undefined && dto.minBuyIn !== null) {
          const minBuyIn = typeof dto.minBuyIn === 'string' ? parseFloat(dto.minBuyIn) : Number(dto.minBuyIn);
          if (maxBuyIn < minBuyIn) {
            throw new BadRequestException('Maximum buy-in cannot be less than minimum buy-in');
          }
        }
      }

      // maxSeats is required in DTO, but validate it anyway
      if (!dto.maxSeats || typeof dto.maxSeats !== 'number') {
        throw new BadRequestException('Maximum seats is required and must be a number');
      }
      if (dto.maxSeats < 1 || dto.maxSeats > 20) {
        throw new BadRequestException('Maximum seats must be between 1 and 20');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }
      
      // For club-scoped users, validate they can only create tables for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only create tables for your assigned club');
      }

      return await this.waitlistSeatingService.createTable(clubId, {
        tableNumber: dto.tableNumber,
        tableType: dto.tableType,
        maxSeats: dto.maxSeats,
        minBuyIn: dto.minBuyIn,
        maxBuyIn: dto.maxBuyIn,
        notes: dto.notes
      });
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to create table: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/tables')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE, ClubRole.STAFF)
  async getTables(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('status') status?: TableStatus,
    @Query('tableType') tableType?: TableType
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: CASHIER must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for CASHIER role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (CASHIER, GRE, STAFF), validate they can only view tables for their own club
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only view tables for your assigned club');
        }
      }

      // Edge case: Validate status if provided
      if (status !== undefined && status !== null) {
        if (typeof status !== 'string' && typeof status !== 'number') {
          throw new BadRequestException('Status must be a string or number');
        }
        const statusStr = String(status).trim();
        const validStatuses = Object.values(TableStatus);
        if (!validStatuses.includes(statusStr as TableStatus)) {
          throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
      }

      // Edge case: Validate tableType if provided
      if (tableType !== undefined && tableType !== null) {
        if (typeof tableType !== 'string' && typeof tableType !== 'number') {
          throw new BadRequestException('Table type must be a string or number');
        }
        const tableTypeStr = String(tableType).trim();
        const validTableTypes = Object.values(TableType);
        if (!validTableTypes.includes(tableTypeStr as TableType)) {
          throw new BadRequestException(`Invalid table type. Must be one of: ${validTableTypes.join(', ')}`);
        }
      }

      // Edge case: Error handling for database query
      let tables: any[] = [];
      try {
        tables = await this.waitlistSeatingService.getTables(
          clubId,
          status ? (typeof status === 'string' ? status.trim() as TableStatus : status) : undefined,
          tableType ? (typeof tableType === 'string' ? tableType.trim() as TableType : tableType) : undefined
        );
      } catch (dbError) {
        console.error('Database error fetching tables:', dbError);
        throw new BadRequestException('Unable to fetch tables. Please try again.');
      }

      // Edge case: Validate tables array
      if (!Array.isArray(tables)) {
        console.error('Tables query returned non-array result');
        tables = [];
      }

      // Edge case: Validate and sanitize table data
      const validTables = tables.map(table => {
        try {
          return {
            id: table.id,
            tableNumber: table.tableNumber || 0,
            tableType: table.tableType || 'Unknown',
            maxSeats: table.maxSeats || 0,
            currentSeats: table.currentSeats || 0,
            availableSeats: (table.maxSeats || 0) - (table.currentSeats || 0),
            status: table.status || TableStatus.AVAILABLE,
            minBuyIn: table.minBuyIn ? Number(table.minBuyIn) : null,
            maxBuyIn: table.maxBuyIn ? Number(table.maxBuyIn) : null,
            notes: table.notes || null,
            createdAt: table.createdAt,
            updatedAt: table.updatedAt
          };
        } catch (mapError) {
          console.error('Error mapping table:', table.id, mapError);
          return null;
        }
      }).filter(t => t !== null);

      return validTables;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get tables: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/tables/:tableId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  async getTable(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and tableId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(tableId)) {
        throw new BadRequestException('Invalid table ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER, GRE), validate they can only view tables for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view tables for your assigned club');
      }

      // Edge case: Error handling for database query
      let table;
      try {
        table = await this.waitlistSeatingService.getTable(clubId, tableId);
      } catch (dbError) {
        console.error('Database error fetching table:', dbError);
        throw new BadRequestException('Unable to fetch table. Please try again.');
      }

      if (!table) {
        throw new NotFoundException('Table not found');
      }

      return table;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get table: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/tables/:tableId')
  @Roles(TenantRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateTable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Body() dto: UpdateTableDto
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      const updateData: any = { ...dto };
      if (dto.reservedUntil) {
        updateData.reservedUntil = new Date(dto.reservedUntil);
      }
      return this.waitlistSeatingService.updateTable(clubId, tableId, updateData);
    } catch (e) {
      throw e;
    }
  }

  @Delete(':id/tables/:tableId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTable(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and tableId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(tableId)) {
        throw new BadRequestException('Invalid table ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only delete tables for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only delete tables for your assigned club');
      }

      // Edge case: Check if table exists before deletion
      let table;
      try {
        table = await this.waitlistSeatingService.getTable(clubId, tableId);
      } catch (dbError) {
        console.error('Database error fetching table:', dbError);
        throw new BadRequestException('Unable to verify table. Please try again.');
      }
      if (!table) {
        throw new NotFoundException('Table not found');
      }

      // Edge case: Check if table has active players/seated players
      if (table.currentSeats && table.currentSeats > 0) {
        throw new ConflictException('Cannot delete table with active players. Please unseat all players first.');
      }

      // Edge case: Error handling for delete operation
      try {
      await this.waitlistSeatingService.deleteTable(clubId, tableId);
      } catch (deleteError) {
        console.error('Database error deleting table:', deleteError);
        if (deleteError instanceof NotFoundException || deleteError instanceof ConflictException) {
          throw deleteError;
        }
        throw new BadRequestException('Unable to delete table. Please try again.');
      }
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
      throw e;
      }
      throw new BadRequestException(`Failed to delete table: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ========== Analytics & Reports APIs ==========

  @Get(':id/analytics/revenue')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getRevenueAnalytics(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only view analytics for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view analytics for your assigned club');
      }

      // Edge case: Validate date formats
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      if (start && isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
      if (end && isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
      if (start && end && start > end) {
        throw new BadRequestException('startDate cannot be after endDate');
      }

      // Edge case: Validate date ranges (prevent queries too far in the past/future)
      const now = new Date();
      if (start && start > now) {
        throw new BadRequestException('startDate cannot be in the future');
      }
      if (end && end > now) {
        throw new BadRequestException('endDate cannot be in the future');
      }
      const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
        throw new BadRequestException('Date range cannot exceed 1 year');
      }

      // Edge case: Error handling for analytics query
      let analytics;
      try {
        analytics = await this.analyticsService.getRevenueAnalytics(clubId, start, end);
      } catch (dbError) {
        console.error('Database error fetching revenue analytics:', dbError);
        throw new BadRequestException('Unable to fetch revenue analytics. Please try again.');
      }

      // Edge case: Validate analytics response
      if (!analytics || typeof analytics !== 'object') {
        throw new BadRequestException('Invalid analytics response');
      }

      return analytics;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get revenue analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/analytics/players')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getPlayerAnalytics(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only view analytics for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view analytics for your assigned club');
      }

      // Edge case: Validate date formats
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      if (start && isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
      if (end && isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
      if (start && end && start > end) {
        throw new BadRequestException('startDate cannot be after endDate');
      }

      // Edge case: Validate date ranges (prevent queries too far in the past/future)
      const now = new Date();
      if (start && start > now) {
        throw new BadRequestException('startDate cannot be in the future');
      }
      if (end && end > now) {
        throw new BadRequestException('endDate cannot be in the future');
      }
      const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
        throw new BadRequestException('Date range cannot exceed 1 year');
      }

      // Edge case: Error handling for analytics query
      let analytics;
      try {
        analytics = await this.analyticsService.getPlayerAnalytics(clubId, start, end);
      } catch (dbError) {
        console.error('Database error fetching player analytics:', dbError);
        throw new BadRequestException('Unable to fetch player analytics. Please try again.');
      }

      // Edge case: Validate analytics response
      if (!analytics || typeof analytics !== 'object') {
        throw new BadRequestException('Invalid analytics response');
      }

      return analytics;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get player analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/analytics/staff')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR)
  async getStaffAnalytics(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only view analytics for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view analytics for your assigned club');
      }

      // Edge case: Error handling for analytics query
      let analytics;
      try {
        analytics = await this.analyticsService.getStaffAnalytics(clubId);
      } catch (dbError) {
        console.error('Database error fetching staff analytics:', dbError);
        throw new BadRequestException('Unable to fetch staff analytics. Please try again.');
      }

      // Edge case: Validate analytics response
      if (!analytics || typeof analytics !== 'object') {
        throw new BadRequestException('Invalid analytics response');
      }

      return analytics;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get staff analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/analytics/tables')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getTableAnalytics(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only view analytics for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view analytics for your assigned club');
      }

      // Edge case: Error handling for analytics query
      let analytics;
      try {
        analytics = await this.analyticsService.getTableAnalytics(clubId);
      } catch (dbError) {
        console.error('Database error fetching table analytics:', dbError);
        throw new BadRequestException('Unable to fetch table analytics. Please try again.');
      }

      // Edge case: Validate analytics response
      if (!analytics || typeof analytics !== 'object') {
        throw new BadRequestException('Invalid analytics response');
      }

      return analytics;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get table analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/analytics/waitlist')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getWaitlistAnalytics(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only view analytics for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view analytics for your assigned club');
      }

      // Edge case: Validate date formats
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      if (start && isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
      if (end && isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
      if (start && end && start > end) {
        throw new BadRequestException('startDate cannot be after endDate');
      }

      // Edge case: Validate date ranges (prevent queries too far in the past/future)
      const now = new Date();
      if (start && start > now) {
        throw new BadRequestException('startDate cannot be in the future');
      }
      if (end && end > now) {
        throw new BadRequestException('endDate cannot be in the future');
      }
      const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
        throw new BadRequestException('Date range cannot exceed 1 year');
      }

      // Edge case: Error handling for analytics query
      let analytics;
      try {
        analytics = await this.analyticsService.getWaitlistAnalytics(clubId, start, end);
      } catch (dbError) {
        console.error('Database error fetching waitlist analytics:', dbError);
        throw new BadRequestException('Unable to fetch waitlist analytics. Please try again.');
      }

      // Edge case: Validate analytics response
      if (!analytics || typeof analytics !== 'object') {
        throw new BadRequestException('Invalid analytics response');
      }

      return analytics;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get waitlist analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/analytics/dashboard')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getDashboardStats(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/MANAGER/GRE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, MANAGER), validate they can only view analytics for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view analytics for your assigned club');
      }

      // Edge case: Error handling for analytics query
      let analytics;
      try {
        analytics = await this.analyticsService.getDashboardStats(clubId);
      } catch (dbError) {
        console.error('Database error fetching dashboard stats:', dbError);
        throw new BadRequestException('Unable to fetch dashboard stats. Please try again.');
      }

      // Edge case: Validate analytics response
      if (!analytics || typeof analytics !== 'object') {
        throw new BadRequestException('Invalid analytics response');
      }

      // Edge case: Validate required fields in response
      if (!analytics.clubId || !analytics.clubName) {
        throw new BadRequestException('Incomplete analytics response');
      }

      return analytics;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get dashboard stats: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ========== Global Settings APIs (Enhanced) ==========

  @Get(':id/settings')
  @Roles(TenantRole.SUPER_ADMIN)
  async getAllSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      return this.clubSettingsService.getAllSettings(clubId);
    } catch (e) {
      throw e;
    }
  }

  @Get(':id/settings/:key')
  @Roles(TenantRole.SUPER_ADMIN)
  async getSetting(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('key') key: string
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      const value = await this.clubSettingsService.getSetting(clubId, key);
      if (value === null) {
        throw new NotFoundException(`Setting '${key}' not found`);
      }
      return { key, value };
    } catch (e) {
      throw e;
    }
  }

  @Put(':id/settings/:key')
  @Roles(TenantRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async setSetting(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('key') key: string,
    @Body() dto: SetClubSettingDto
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      return this.clubSettingsService.setSetting(clubId, key, dto.value);
    } catch (e) {
      throw e;
    }
  }

  @Delete(':id/settings/:key')
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetting(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('key') key: string
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      // Note: This would require a delete method in ClubSettingsService
      // For now, we'll set it to null
      await this.clubSettingsService.setSetting(clubId, key, '');
    } catch (e) {
      throw e;
    }
  }

  // ========== Logs & Audits APIs (Enhanced) ==========

  @Get(':id/audit-logs')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN)
  async getAuditLogs(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Club-scoped users (ADMIN) must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for ADMIN role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN), validate they can only view audit logs for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view audit logs for your assigned club');
      }

      // Edge case: Validate limit
      const limitNum = limit ? parseInt(limit, 10) : 100;
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        throw new BadRequestException('Limit must be between 1 and 1000');
      }

      // Edge case: Validate action filter if provided
      if (action !== undefined && action !== null) {
        if (typeof action !== 'string' || !action.trim()) {
          throw new BadRequestException('Action filter must be a non-empty string if provided');
        }
        if (action.trim().length > 50) {
          throw new BadRequestException('Action filter cannot exceed 50 characters');
        }
      }

      // Edge case: Validate entityType filter if provided
      if (entityType !== undefined && entityType !== null) {
        if (typeof entityType !== 'string' || !entityType.trim()) {
          throw new BadRequestException('Entity type filter must be a non-empty string if provided');
        }
        if (entityType.trim().length > 50) {
          throw new BadRequestException('Entity type filter cannot exceed 50 characters');
        }
      }

      // Edge case: Validate date formats
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        if (start && isNaN(start.getTime())) {
          throw new BadRequestException('Invalid startDate format');
        }
        if (end && isNaN(end.getTime())) {
          throw new BadRequestException('Invalid endDate format');
        }
        if (start && end && start > end) {
          throw new BadRequestException('startDate cannot be after endDate');
        }

      // Edge case: Validate date ranges (prevent queries too far in the past/future)
      const now = new Date();
      if (start && start > now) {
        throw new BadRequestException('startDate cannot be in the future');
      }
      if (end && end > now) {
        throw new BadRequestException('endDate cannot be in the future');
      }
      const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
        throw new BadRequestException('Date range cannot exceed 1 year');
      }

      // Edge case: Error handling for database query
      let logs: any[] = [];
      try {
        logs = await this.auditLogsService.findAll(clubId, limitNum);
      } catch (dbError) {
        console.error('Database error fetching audit logs:', dbError);
        throw new BadRequestException('Unable to fetch audit logs. Please try again.');
      }

      // Edge case: Validate logs array
      if (!Array.isArray(logs)) {
        console.error('Audit logs query returned non-array result');
        logs = [];
      }

      // Apply filters
      if (action && action.trim()) {
        logs = logs.filter(log => log && log.action === action.trim());
      }
      if (entityType && entityType.trim()) {
        logs = logs.filter(log => log && log.entityType === entityType.trim());
      }
      if (start || end) {
        const startTime = start ? start.getTime() : 0;
        const endTime = end ? end.getTime() : Date.now();
        logs = logs.filter(log => {
          if (!log || !log.createdAt) return false;
          const logTime = new Date(log.createdAt).getTime();
          if (isNaN(logTime)) return false;
          return logTime >= startTime && logTime <= endTime;
        });
      }

      // Edge case: Validate and sanitize log entries
      const validLogs = logs.map(log => {
        try {
          return {
            id: log.id,
            action: log.action || 'Unknown',
            entityType: log.entityType || 'Unknown',
            entityId: log.entityId || null,
            userId: log.userId || null,
            userName: log.userName || null,
            details: log.details || null,
            ipAddress: log.ipAddress || null,
            createdAt: log.createdAt,
            updatedAt: log.updatedAt
          };
        } catch (mapError) {
          console.error('Error mapping audit log:', log.id, mapError);
          return null;
        }
      }).filter(log => log !== null);

      return {
        logs: validLogs,
        total: validLogs.length,
        limit: limitNum,
        clubId: clubId
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to get audit logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/audit-logs/export')
  @Roles(TenantRole.SUPER_ADMIN)
  async exportAuditLogs(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      if (start && isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
      if (end && isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
      if (start && end && start > end) {
        throw new BadRequestException('startDate cannot be after endDate');
      }

      const logs = await this.auditLogsService.findAll(clubId, 10000);
      let filteredLogs = logs;

      if (start || end) {
        filteredLogs = logs.filter(log => {
          const logDate = new Date(log.createdAt);
          if (start && logDate < start) return false;
          if (end && logDate > end) return false;
          return true;
        });
      }

      const exportFormat = format?.toLowerCase() || 'json';
      if (exportFormat === 'csv') {
        // Convert to CSV
        const headers = ['Date', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'User Email', 'Description'];
        const rows = filteredLogs.map(log => [
          log.createdAt.toISOString(),
          log.action,
          log.entityType,
          log.entityId || '',
          log.userId || '',
          log.userEmail || '',
          log.description || ''
        ]);
        const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
        return { format: 'csv', data: csv, count: filteredLogs.length };
      } else {
        return { format: 'json', data: filteredLogs, count: filteredLogs.length };
      }
    } catch (e) {
      throw e;
    }
  }

  // ========== AFFILIATE MANAGEMENT ==========

  /**
   * Create a new affiliate (Super Admin only)
   * POST /clubs/:id/affiliates
   */
  @Post(':id/affiliates')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createAffiliate(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreateAffiliateDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate required headers for Super Admin
      if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
        throw new BadRequestException('x-tenant-id header is required for Super Admin');
      }

      // Edge case: Validate UUID format for tenant-id
      if (tenantId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for club-id header
      if (headerClubId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate required fields
      if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
        throw new BadRequestException('Email is required and must be a non-empty string');
      }

      // Edge case: Validate email length
      if (dto.email.trim().length > 200) {
        throw new BadRequestException('Email cannot exceed 200 characters');
      }

      // Edge case: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email.trim())) {
        throw new BadRequestException('Invalid email format');
      }

      // Edge case: Validate display name if provided
      if (dto.displayName !== undefined && dto.displayName !== null) {
        if (typeof dto.displayName !== 'string') {
          throw new BadRequestException('Display name must be a string');
        }
        if (dto.displayName.trim().length > 200) {
          throw new BadRequestException('Display name cannot exceed 200 characters');
        }
      }

      // Edge case: Validate commission rate if provided
      if (dto.commissionRate !== undefined && dto.commissionRate !== null) {
        if (typeof dto.commissionRate !== 'number') {
          throw new BadRequestException('Commission rate must be a number');
        }
        if (isNaN(dto.commissionRate)) {
          throw new BadRequestException('Commission rate must be a valid number');
        }
        if (dto.commissionRate < 0) {
          throw new BadRequestException('Commission rate cannot be negative');
        }
        if (dto.commissionRate > 100) {
          throw new BadRequestException('Commission rate cannot exceed 100%');
        }
        // Check if commission rate has more than 2 decimal places
        const decimalPlaces = (dto.commissionRate.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          throw new BadRequestException('Commission rate can have maximum 2 decimal places');
        }
      }

      // Edge case: Validate custom code if provided
      if (dto.code !== undefined && dto.code !== null) {
        if (typeof dto.code !== 'string') {
          throw new BadRequestException('Affiliate code must be a string');
        }
        const trimmedCode = dto.code.trim();
        if (trimmedCode.length < 3) {
          throw new BadRequestException('Affiliate code must be at least 3 characters');
        }
        if (trimmedCode.length > 20) {
          throw new BadRequestException('Affiliate code cannot exceed 20 characters');
        }
        if (!/^[A-Z0-9]+$/.test(trimmedCode.toUpperCase())) {
          throw new BadRequestException('Affiliate code can only contain uppercase letters and numbers');
        }
        // Check for reserved codes
        const reservedCodes = ['ADMIN', 'SUPER', 'MASTER', 'SYSTEM', 'NULL', 'TEST'];
        if (reservedCodes.includes(trimmedCode.toUpperCase())) {
          throw new BadRequestException('This affiliate code is reserved and cannot be used');
        }
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }
      
      // For club-scoped users, validate they can only create affiliates for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only create affiliates for your assigned club');
      }

      const affiliate = await this.affiliatesService.createAffiliate(
        clubId,
        dto.email.trim(),
        dto.displayName?.trim(),
        dto.code,
        dto.commissionRate || 5.0
      );

      return {
        id: affiliate.id,
        code: affiliate.code,
        name: affiliate.name,
        email: affiliate.user.email,
        commissionRate: affiliate.commissionRate,
        status: affiliate.status,
        createdAt: affiliate.createdAt
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to create affiliate'));
    }
  }

  /**
   * Get all affiliates for a club
   * GET /clubs/:id/affiliates
   */
  @Get(':id/affiliates')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  async getAffiliates(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate required headers for Super Admin
      if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
        throw new BadRequestException('x-tenant-id header is required for Super Admin');
      }

      // Edge case: Validate UUID format for tenant-id
      if (tenantId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for club-id header
      if (headerClubId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }
      
      // For club-scoped users, validate they can only view affiliates for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only view affiliates for your assigned club');
      }

      const affiliates = await this.affiliatesService.findByClub(clubId);
      
      // Edge case: Return empty array if no affiliates, not null
      if (!affiliates || !Array.isArray(affiliates)) {
        return [];
      }

      return affiliates.map(a => ({
        id: a.id,
        code: a.code,
        name: a.name,
        email: a.user?.email || null,
        commissionRate: a.commissionRate,
        status: a.status,
        totalReferrals: a.totalReferrals,
        totalCommission: a.totalCommission,
        createdAt: a.createdAt
      }));
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get affiliates'));
    }
  }

  /**
   * Get affiliate details
   * GET /clubs/:id/affiliates/:affiliateId
   */
  @Get(':id/affiliates/:affiliateId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  async getAffiliate(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('affiliateId', ParseUUIDPipe) affiliateId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId and affiliateId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(affiliateId)) {
        throw new BadRequestException('Invalid affiliate ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/AFFILIATE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate user-id header if provided (for AFFILIATE)
      if (userId !== undefined && userId !== null) {
        if (typeof userId !== 'string' || !userId.trim()) {
          throw new BadRequestException('x-user-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(userId.trim())) {
          throw new BadRequestException('Invalid user ID format in header');
        }
      }

      // Edge case: Club-scoped users (AFFILIATE) must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for AFFILIATE role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, AFFILIATE), validate they can only view affiliates for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view affiliates for your assigned club');
      }

      // Edge case: Error handling for database query
      let affiliate;
      try {
        affiliate = await this.affiliatesService.findByUserAndClub(userId || '', clubId);
        // If userId not provided or affiliate not found by user, try finding by ID
        if (!affiliate) {
          affiliate = await this.affiliatesRepo.findOne({
            where: { id: affiliateId, club: { id: clubId } },
            relations: ['club', 'user', 'players']
          });
        }
      } catch (dbError) {
        console.error('Database error fetching affiliate:', dbError);
        if (dbError instanceof NotFoundException) {
          throw dbError;
        }
        throw new BadRequestException('Unable to fetch affiliate. Please try again.');
      }

      if (!affiliate) {
        throw new NotFoundException('Affiliate not found');
      }

      // Edge case: Validate affiliate belongs to club
      if (affiliate.club && affiliate.club.id !== clubId) {
        throw new ForbiddenException('Affiliate does not belong to this club');
      }

      // Edge case: For AFFILIATE role, validate they can only view their own affiliate record
      if (userId && affiliate.user && affiliate.user.id !== userId.trim()) {
        throw new ForbiddenException('You can only view your own affiliate details');
      }

      // Edge case: Validate affiliate data integrity
      if (!affiliate.id || !affiliate.code) {
        throw new BadRequestException('Affiliate data is incomplete or corrupted');
      }

      // Edge case: Validate affiliate status
      if (!affiliate.status || (affiliate.status !== 'Active' && affiliate.status !== 'Inactive')) {
        console.warn(`Affiliate ${affiliateId} has invalid status: ${affiliate.status}`);
      }

      // Edge case: Validate commission rate is valid
      if (affiliate.commissionRate === null || affiliate.commissionRate === undefined || isNaN(Number(affiliate.commissionRate))) {
        console.warn(`Affiliate ${affiliateId} has invalid commission rate: ${affiliate.commissionRate}`);
      }

      // Edge case: Validate user exists if affiliate has user relationship
      if (affiliate.user && !affiliate.user.id) {
        console.warn(`Affiliate ${affiliateId} has invalid user relationship`);
      }

      // Edge case: Validate affiliate ID matches parameter
      if (affiliate.id !== affiliateId) {
        throw new BadRequestException('Affiliate ID mismatch');
      }

      // Edge case: Sanitize and validate numeric fields
      const totalCommission = Number(affiliate.totalCommission);
      const commissionRate = Number(affiliate.commissionRate);
      
      if (isNaN(totalCommission) || totalCommission < 0) {
        console.warn(`Affiliate ${affiliateId} has invalid totalCommission: ${affiliate.totalCommission}`);
      }
      if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        console.warn(`Affiliate ${affiliateId} has invalid commissionRate: ${affiliate.commissionRate}`);
      }

      return {
        id: affiliate.id,
        code: affiliate.code,
        name: affiliate.name || null,
        email: affiliate.user?.email || null,
        commissionRate: isNaN(commissionRate) ? 0 : commissionRate,
        status: affiliate.status || 'Active',
        totalReferrals: affiliate.totalReferrals || 0,
        totalCommission: isNaN(totalCommission) ? 0 : totalCommission,
        createdAt: affiliate.createdAt,
        updatedAt: affiliate.updatedAt
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get affiliate: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Update affiliate details
   * PUT /clubs/:id/affiliates/:affiliateId
   */
  @Put(':id/affiliates/:affiliateId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  async updateAffiliate(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('affiliateId', ParseUUIDPipe) affiliateId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string,
    @Body() dto?: { name?: string; commissionRate?: number }
  ) {
    try {
      // Edge case: Validate UUID format for clubId and affiliateId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(affiliateId)) {
        throw new BadRequestException('Invalid affiliate ID format');
      }

      // Edge case: Validate request body
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException('Request body is required');
      }

      // Edge case: Validate at least one field is provided
      if (!dto.name && dto.commissionRate === undefined) {
        throw new BadRequestException('At least one field (name or commissionRate) must be provided for update');
      }

      // Edge case: Validate name if provided
      if (dto.name !== undefined && dto.name !== null) {
        if (typeof dto.name !== 'string' || !dto.name.trim()) {
          throw new BadRequestException('Name must be a non-empty string if provided');
        }
        if (dto.name.trim().length < 2 || dto.name.trim().length > 200) {
          throw new BadRequestException('Name must be between 2 and 200 characters');
        }
      }

      // Edge case: Validate commissionRate if provided
      if (dto.commissionRate !== undefined && dto.commissionRate !== null) {
        const rate = typeof dto.commissionRate === 'string' ? parseFloat(dto.commissionRate) : Number(dto.commissionRate);
        if (isNaN(rate) || !isFinite(rate)) {
          throw new BadRequestException('Commission rate must be a valid number');
        }
        if (rate < 0) {
          throw new BadRequestException('Commission rate cannot be negative');
        }
        if (rate > 100) {
          throw new BadRequestException('Commission rate cannot exceed 100%');
        }
        // Edge case: Validate commission rate precision (max 2 decimal places)
        const decimalPlaces = (rate.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          throw new BadRequestException('Commission rate cannot have more than 2 decimal places');
        }
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for ADMIN/AFFILIATE)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate user-id header if provided (for AFFILIATE)
      if (userId !== undefined && userId !== null) {
        if (typeof userId !== 'string' || !userId.trim()) {
          throw new BadRequestException('x-user-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(userId.trim())) {
          throw new BadRequestException('Invalid user ID format in header');
        }
      }

      // Edge case: Club-scoped users (AFFILIATE) must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for AFFILIATE role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (ADMIN, AFFILIATE), validate they can only update affiliates for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only update affiliates for your assigned club');
      }

      // Edge case: Get affiliate and validate it exists
      let affiliate;
      try {
        affiliate = await this.affiliatesService.findByUserAndClub(userId || '', clubId);
        // If userId not provided or affiliate not found by user, try finding by ID
        if (!affiliate) {
          affiliate = await this.affiliatesRepo.findOne({
            where: { id: affiliateId, club: { id: clubId } },
            relations: ['club', 'user']
          });
        }
      } catch (dbError) {
        console.error('Database error fetching affiliate:', dbError);
        if (dbError instanceof NotFoundException) {
          throw dbError;
        }
        throw new BadRequestException('Unable to fetch affiliate. Please try again.');
      }

      if (!affiliate) {
        throw new NotFoundException('Affiliate not found');
      }

      // Edge case: Validate affiliate belongs to club
      if (affiliate.club && affiliate.club.id !== clubId) {
        throw new ForbiddenException('Affiliate does not belong to this club');
      }

      // Edge case: For AFFILIATE role, validate they can only update their own affiliate record
      if (userId && affiliate.user && affiliate.user.id !== userId.trim()) {
        throw new ForbiddenException('You can only update your own affiliate details');
      }

      // Edge case: Validate affiliate ID matches parameter
      if (affiliate.id !== affiliateId) {
        throw new BadRequestException('Affiliate ID mismatch');
      }

      // Edge case: Validate affiliate data integrity before update
      if (!affiliate.id || !affiliate.code) {
        throw new BadRequestException('Affiliate data is incomplete or corrupted');
      }

      // Edge case: Validate affiliate status (can't update inactive affiliates if they're inactive)
      if (affiliate.status && affiliate.status !== 'Active' && !tenantId) {
        // Only SUPER_ADMIN/ADMIN can update inactive affiliates
        throw new ForbiddenException('Cannot update inactive affiliate. Please contact administrator.');
      }

      // Edge case: AFFILIATE role cannot update commissionRate (only ADMIN/SUPER_ADMIN can)
      if (userId && !tenantId && dto.commissionRate !== undefined) {
        throw new ForbiddenException('You do not have permission to update commission rate');
      }

      // Edge case: Validate name doesn't conflict with existing affiliates (if name is being updated)
      if (dto.name && dto.name.trim() && dto.name.trim() !== affiliate.name) {
        // Check if another affiliate in the same club has the same name
        const existingAffiliate = await this.affiliatesRepo.findOne({
          where: { 
            club: { id: clubId },
            name: dto.name.trim()
          }
        });
        if (existingAffiliate && existingAffiliate.id !== affiliateId) {
          throw new ConflictException('An affiliate with this name already exists in this club');
        }
      }

      // Edge case: Check if any changes are actually being made
      const hasNameChange = dto.name !== undefined && dto.name !== null && dto.name.trim() !== affiliate.name;
      const hasRateChange = dto.commissionRate !== undefined && dto.commissionRate !== null && 
                           (!userId || tenantId) && 
                           Number(dto.commissionRate) !== Number(affiliate.commissionRate);
      
      if (!hasNameChange && !hasRateChange) {
        throw new BadRequestException('No changes detected. Please provide different values to update.');
      }

      // Update affiliate
      if (dto.name !== undefined && dto.name !== null) {
        affiliate.name = dto.name.trim();
      }
      if (dto.commissionRate !== undefined && dto.commissionRate !== null && (!userId || tenantId)) {
        const newRate = typeof dto.commissionRate === 'string' ? parseFloat(dto.commissionRate) : Number(dto.commissionRate);
        // Edge case: Round to 2 decimal places to prevent precision issues
        affiliate.commissionRate = Math.round(newRate * 100) / 100;
      }

      // Edge case: Error handling for update operation
      let updatedAffiliate;
      try {
        updatedAffiliate = await this.affiliatesRepo.save(affiliate);
      } catch (dbError) {
        console.error('Database error updating affiliate:', dbError);
        // Edge case: Handle unique constraint violations
        if (dbError instanceof Error && (dbError.message.includes('unique') || dbError.message.includes('duplicate'))) {
          throw new ConflictException('An affiliate with this information already exists');
        }
        throw new BadRequestException('Unable to update affiliate. Please try again.');
      }

      if (!updatedAffiliate) {
        throw new NotFoundException('Affiliate not found or update failed');
      }

      // Edge case: Validate updated affiliate data integrity
      if (!updatedAffiliate.id || !updatedAffiliate.code) {
        throw new BadRequestException('Updated affiliate data is incomplete or corrupted');
      }

      // Edge case: Sanitize and validate response data
      const finalCommissionRate = Number(updatedAffiliate.commissionRate);
      const finalTotalCommission = Number(updatedAffiliate.totalCommission);
      
      if (isNaN(finalCommissionRate) || finalCommissionRate < 0 || finalCommissionRate > 100) {
        console.warn(`Updated affiliate ${affiliateId} has invalid commissionRate: ${updatedAffiliate.commissionRate}`);
      }
      if (isNaN(finalTotalCommission) || finalTotalCommission < 0) {
        console.warn(`Updated affiliate ${affiliateId} has invalid totalCommission: ${updatedAffiliate.totalCommission}`);
      }

      return {
        id: updatedAffiliate.id,
        code: updatedAffiliate.code,
        name: updatedAffiliate.name || null,
        email: updatedAffiliate.user?.email || null,
        commissionRate: isNaN(finalCommissionRate) ? 0 : finalCommissionRate,
        status: updatedAffiliate.status || 'Active',
        totalReferrals: updatedAffiliate.totalReferrals || 0,
        totalCommission: isNaN(finalTotalCommission) ? 0 : finalTotalCommission,
        createdAt: updatedAffiliate.createdAt,
        updatedAt: updatedAffiliate.updatedAt
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to update affiliate: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Get affiliate statistics
   * GET /clubs/:id/affiliates/:affiliateId/stats
   */
  @Get(':id/affiliates/:affiliateId/stats')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  async getAffiliateStats(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('affiliateId', ParseUUIDPipe) affiliateId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string
  ) {
    try {
      // Edge case: Validate required headers for Super Admin
      if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
        throw new BadRequestException('x-tenant-id header is required for Super Admin');
      }

      // Edge case: Validate UUID format for tenant-id
      if (tenantId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for club-id header
      if (headerClubId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate UUID format for user-id header if provided
      if (userId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId.trim())) {
          throw new BadRequestException('Invalid user ID format in header');
        }
      }

      // Edge case: Validate affiliate ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(affiliateId)) {
        throw new BadRequestException('Invalid affiliate ID format');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }
      
      // For club-scoped users, validate they can only view stats for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only view affiliate stats for your assigned club');
      }

      // If affiliate user (not Super Admin), validate they can only view their own stats
      if (userId && headerClubId && !tenantId) {
        if (!userId.trim()) {
          throw new BadRequestException('x-user-id header is required for affiliate users');
        }
        const affiliate = await this.affiliatesService.findByUserAndClub(userId.trim(), clubId);
        if (!affiliate) {
          throw new NotFoundException('Affiliate not found for this user');
        }
        if (affiliate.id !== affiliateId) {
          throw new ForbiddenException('You can only view your own affiliate statistics');
        }
      }

      return await this.affiliatesService.getAffiliateStats(affiliateId);
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get affiliate stats'));
    }
  }

  // ========== PLAYER MANAGEMENT ==========

  /**
   * Create a new player (with optional affiliate code)
   * POST /clubs/:id/players
   */
  @Post(':id/players')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreatePlayerDto,
    @Headers('x-tenant-id') tenantId?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate required fields
      if (!dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
        throw new BadRequestException('Name is required and must be a non-empty string');
      }
      const trimmedName = dto.name.trim();
      if (trimmedName.length < 2) {
        throw new BadRequestException('Name must be at least 2 characters long');
      }
      if (trimmedName.length > 200) {
        throw new BadRequestException('Name cannot exceed 200 characters');
      }
      // Validate name contains only valid characters
      if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
        throw new BadRequestException('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
      }

      // Edge case: Validate email
      if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
        throw new BadRequestException('Email is required and must be a non-empty string');
      }
      const trimmedEmail = dto.email.trim().toLowerCase();
      if (trimmedEmail.length > 200) {
        throw new BadRequestException('Email cannot exceed 200 characters');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new BadRequestException('Invalid email format');
      }
      // Validate email domain
      const emailParts = trimmedEmail.split('@');
      if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
        throw new BadRequestException('Invalid email domain');
      }

      // Edge case: Validate phone number if provided
      if (dto.phoneNumber !== undefined && dto.phoneNumber !== null) {
        if (typeof dto.phoneNumber !== 'string') {
          throw new BadRequestException('Phone number must be a string');
        }
        const trimmedPhone = dto.phoneNumber.trim();
        if (trimmedPhone.length < 10) {
          throw new BadRequestException('Phone number must be at least 10 characters');
        }
        if (trimmedPhone.length > 20) {
          throw new BadRequestException('Phone number cannot exceed 20 characters');
        }
        // Validate phone number format (allows +, digits, spaces, hyphens, parentheses)
        if (!/^[\+]?[0-9\s\-\(\)]+$/.test(trimmedPhone)) {
          throw new BadRequestException('Phone number contains invalid characters');
        }
      }

      // Edge case: Validate player ID if provided
      if (dto.playerId !== undefined && dto.playerId !== null) {
        if (typeof dto.playerId !== 'string') {
          throw new BadRequestException('Player ID must be a string');
        }
        const trimmedPlayerId = dto.playerId.trim();
        if (trimmedPlayerId.length > 100) {
          throw new BadRequestException('Player ID cannot exceed 100 characters');
        }
        if (trimmedPlayerId.length < 1) {
          throw new BadRequestException('Player ID cannot be empty if provided');
        }
      }

      // Edge case: Validate affiliate code if provided
      if (dto.affiliateCode !== undefined && dto.affiliateCode !== null) {
        if (typeof dto.affiliateCode !== 'string') {
          throw new BadRequestException('Affiliate code must be a string');
        }
        const trimmedCode = dto.affiliateCode.trim().toUpperCase();
        if (trimmedCode.length < 3) {
          throw new BadRequestException('Affiliate code must be at least 3 characters');
        }
        if (trimmedCode.length > 20) {
          throw new BadRequestException('Affiliate code cannot exceed 20 characters');
        }
        if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
          throw new BadRequestException('Affiliate code can only contain uppercase letters and numbers');
        }
      }

      // Edge case: Validate notes if provided
      if (dto.notes !== undefined && dto.notes !== null) {
        if (typeof dto.notes !== 'string') {
          throw new BadRequestException('Notes must be a string');
        }
        if (dto.notes.trim().length > 500) {
          throw new BadRequestException('Notes cannot exceed 500 characters');
        }
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      const player = await this.affiliatesService.createPlayer(
        clubId,
        trimmedName,
        trimmedEmail,
        dto.phoneNumber?.trim(),
        dto.playerId?.trim(),
        dto.affiliateCode?.trim().toUpperCase(),
        dto.notes?.trim()
      );

      return {
        id: player.id,
        name: player.name,
        email: player.email,
        phoneNumber: player.phoneNumber,
        playerId: player.playerId,
        affiliateCode: player.affiliate?.code || null,
        status: player.status,
        tempPassword: (player as any).tempPassword, // Temporary password for first login
        createdAt: player.createdAt
      };
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ConflictException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to create player'));
    }
  }

  /**
   * Get all players for an affiliate
   * GET /clubs/:id/affiliates/:affiliateId/players
   */
  @Get(':id/affiliates/:affiliateId/players')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  async getAffiliatePlayers(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('affiliateId', ParseUUIDPipe) affiliateId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string
  ) {
    try {
      // Edge case: Validate required headers for Super Admin
      if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
        throw new BadRequestException('x-tenant-id header is required for Super Admin');
      }

      // Edge case: Validate UUID format for tenant-id
      if (tenantId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for club-id header
      if (headerClubId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate UUID format for user-id header if provided
      if (userId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId.trim())) {
          throw new BadRequestException('Invalid user ID format in header');
        }
      }

      // Edge case: Validate affiliate ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(affiliateId)) {
        throw new BadRequestException('Invalid affiliate ID format');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }
      
      // For club-scoped users, validate they can only view players for their own club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only view players for your assigned club');
      }
      
      // If affiliate user (not Super Admin), validate they can only view their own players
      // Super Admin has tenantId, so skip affiliate validation
      if (userId && headerClubId && !tenantId) {
        if (!userId.trim()) {
          throw new BadRequestException('x-user-id header is required for affiliate users');
        }
        const affiliate = await this.affiliatesService.findByUserAndClub(userId.trim(), clubId);
        if (!affiliate) {
          throw new NotFoundException('Affiliate not found for this user');
        }
        if (affiliate.id !== affiliateId) {
          throw new ForbiddenException('You can only view your own players');
        }
      }

      const players = await this.affiliatesService.getAffiliatePlayers(affiliateId);
      return players.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phoneNumber: p.phoneNumber,
        playerId: p.playerId,
        totalSpent: p.totalSpent,
        totalCommission: p.totalCommission,
        status: p.status,
        createdAt: p.createdAt
      }));
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get affiliate players'));
    }
  }

  // ========== MASTER_ADMIN PLAYER MANAGEMENT APIs ==========

  /**
   * Get all players for a club
   * GET /api/clubs/:id/players
   */
  @Get(':id/players')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  async getPlayers(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    try {
      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: CASHIER must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for CASHIER role');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (CASHIER), validate they can only view players for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view players for your assigned club');
      }

      // Edge case: Validate status if provided
      const validStatuses = ['Active', 'Inactive', 'Suspended'];
      if (status && typeof status === 'string' && status.trim()) {
        if (!validStatuses.includes(status.trim())) {
          throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
      }

      // Edge case: Validate page and limit (pagination)
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10; // Default 10 players per page
      if (isNaN(pageNum) || pageNum < 1) {
        throw new BadRequestException('Page must be 1 or greater');
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
      if (pageNum > 10000) {
        throw new BadRequestException('Page number cannot exceed 10000');
      }

      // Calculate offset from page number
      const offsetNum = (pageNum - 1) * limitNum;

      // Edge case: Validate search query if provided
      let searchTerm: string | null = null;
      if (search !== undefined && search !== null) {
        if (typeof search !== 'string') {
          throw new BadRequestException('Search must be a string');
        }
        searchTerm = search.trim();
        if (searchTerm.length > 200) {
          throw new BadRequestException('Search term cannot exceed 200 characters');
        }
        // Allow empty search (will search all)
        if (searchTerm.length === 0) {
          searchTerm = null;
        }
      }

      // Build where clause with search
      const where: any = { club: { id: clubId } };
      if (status && status.trim()) {
        where.status = status.trim();
      }

      // Edge case: Error handling for database query with search
      let players: Player[] = [];
      let total = 0;
      try {
        if (searchTerm) {
          // Search through name, email, phoneNumber, playerId
          const queryBuilder = this.playersRepo.createQueryBuilder('player')
            .leftJoinAndSelect('player.affiliate', 'affiliate')
            .leftJoinAndSelect('player.club', 'club')
            .where('player.club_id = :clubId', { clubId });

          if (status && status.trim()) {
            queryBuilder.andWhere('player.status = :status', { status: status.trim() });
          }

          // Search in multiple fields
          queryBuilder.andWhere(
            '(LOWER(player.name) LIKE LOWER(:search) OR ' +
            'LOWER(player.email) LIKE LOWER(:search) OR ' +
            'LOWER(player.phone_number) LIKE LOWER(:search) OR ' +
            'LOWER(player.player_id) LIKE LOWER(:search))',
            { search: `%${searchTerm}%` }
          );

          queryBuilder.orderBy('player.created_at', 'DESC');
          queryBuilder.skip(offsetNum);
          queryBuilder.take(limitNum);

          [players, total] = await queryBuilder.getManyAndCount();
        } else {
          // No search - regular query
          [players, total] = await this.playersRepo.findAndCount({
            where,
            relations: ['affiliate', 'club'],
            order: { createdAt: 'DESC' },
            take: limitNum,
            skip: offsetNum
          });
        }
      } catch (dbError) {
        console.error('Database error fetching players:', dbError);
        throw new BadRequestException('Unable to fetch players. Please try again.');
      }

      // Edge case: Validate players data integrity
      const validPlayers = players.filter(p => p && p.id && p.name && p.email);
      if (validPlayers.length !== players.length) {
        console.warn('Some players have incomplete data');
      }

      // Calculate pagination info
      const totalPages = total > 0 ? Math.ceil(total / limitNum) : 0;
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      // Edge case: Validate pagination bounds
      if (pageNum > totalPages && totalPages > 0) {
        throw new BadRequestException(`Page ${pageNum} exceeds total pages (${totalPages})`);
      }

      return {
        players: validPlayers.map(p => {
          try {
            return {
              id: p.id,
              name: p.name || 'Unknown',
              email: p.email || '',
              phoneNumber: p.phoneNumber || null,
              playerId: p.playerId || null,
              status: p.status || 'Active',
              totalSpent: Number(p.totalSpent) || 0,
              totalCommission: Number(p.totalCommission) || 0,
              affiliateCode: p.affiliate ? (p.affiliate as any).code : null,
              notes: p.notes || null,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt
            };
          } catch (mapError) {
            console.error('Error mapping player:', p.id, mapError);
            return null;
          }
        }).filter(p => p !== null),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage,
          hasPrevPage
        },
        search: searchTerm || null
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get players'));
    }
  }

  /**
   * Get player details
   * GET /api/clubs/:id/players/:playerId
   */
  @Get(':id/players/:playerId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE, ClubRole.AFFILIATE)
  async getPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate UUID format for playerId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users (CASHIER, GRE, AFFILIATE), validate they can only view players for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view players for your assigned club');
      }

      // Edge case: Error handling for database query
      let player: Player | null = null;
      try {
        player = await this.playersRepo.findOne({
          where: { id: playerId, club: { id: clubId } },
          relations: ['affiliate', 'club', 'club.tenant']
        });
      } catch (dbError) {
        console.error('Database error fetching player:', dbError);
        throw new BadRequestException('Unable to fetch player. Please try again.');
      }

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || !player.club.id) {
        throw new BadRequestException('Player club information is missing');
      }
      if (player.club.id !== clubId) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: For AFFILIATE role, validate player was referred by this affiliate
      if (userId && !tenantId && headerClubId) {
        try {
          const affiliate = await this.affiliatesService.findByUserAndClub(userId.trim(), clubId);
          if (!affiliate) {
            throw new ForbiddenException('You are not an affiliate for this club');
          }
          // Check if player was referred by this affiliate
          if (!player.affiliate || player.affiliate.id !== affiliate.id) {
            throw new ForbiddenException('You can only view players you referred');
          }
        } catch (affiliateError) {
          if (affiliateError instanceof ForbiddenException || affiliateError instanceof NotFoundException) {
            throw affiliateError;
          }
          // If affiliate lookup fails, don't block - let other roles proceed
          console.warn('Affiliate validation failed:', affiliateError);
        }
      }

      // Edge case: Validate data integrity
      if (!player.id || !player.name || !player.email) {
        throw new BadRequestException('Player data is incomplete or corrupted');
      }

      // Edge case: Validate player status
      if (!player.status) {
        console.warn(`Player ${playerId} has no status, defaulting to Active`);
        player.status = 'Active';
      }

      return {
        id: player.id,
        name: player.name,
        email: player.email,
        phoneNumber: player.phoneNumber,
        playerId: player.playerId,
        status: player.status,
        totalSpent: Number(player.totalSpent) || 0,
        totalCommission: Number(player.totalCommission) || 0,
        affiliate: player.affiliate ? {
          id: player.affiliate.id,
          code: (player.affiliate as any).code
        } : null,
        notes: player.notes,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
        club: {
          id: player.club.id,
          name: player.club.name,
          code: player.club.code
        }
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get player'));
    }
  }

  /**
   * Get players pending approval (KYC review)
   * GET /api/clubs/:id/players/pending-approval
   */
  @Get(':id/players-pending-approval')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getPendingApprovalPlayers(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Validate tenant if provided
      if (tenantId && !uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Validate club-id header if provided
      if (headerClubId && !uuidRegex.test(headerClubId.trim())) {
        throw new BadRequestException('Invalid club ID format in header');
      }

      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate club access
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view players for your assigned club');
      }

      // Get players with pending KYC status or pending account status
      const players = await this.playersRepo.find({
        where: [
          { club: { id: clubId }, kycStatus: 'pending' },
          { club: { id: clubId }, status: 'Pending' }
        ],
        relations: ['club', 'affiliate'],
        order: { createdAt: 'DESC' }
      });

      return players.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phoneNumber: p.phoneNumber,
        playerId: p.playerId,
        status: p.status,
        kycStatus: p.kycStatus,
        kycDocuments: (p as any).kycDocuments || [],
        registrationDate: p.createdAt,
        affiliateCode: p.affiliate ? (p.affiliate as any).code : null
      }));
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get pending players'));
    }
  }

  /**
   * Approve player (account + KYC)
   * POST /api/clubs/:id/players/:playerId/approve
   */
  @Post(':id/players/:playerId/approve')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async approvePlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: ApprovePlayerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Validate tenant if provided
      if (tenantId && !uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Validate club-id header if provided
      if (headerClubId && !uuidRegex.test(headerClubId.trim())) {
        throw new BadRequestException('Invalid club ID format in header');
      }

      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate club access
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only approve players for your assigned club');
      }

      // Get player
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Check if already approved
      if (player.status === 'Active' && player.kycStatus === 'approved') {
        throw new BadRequestException('Player is already approved');
      }

      // Update player status and KYC status
      await this.playersRepo.update(
        { id: playerId },
        {
          status: 'Active',
          kycStatus: 'approved',
          kycApprovedAt: new Date()
        }
      );

      // TODO: Log action when audit service is updated

      return {
        success: true,
        message: 'Player approved successfully',
        player: {
          id: player.id,
          name: player.name,
          email: player.email,
          status: 'Active',
          kycStatus: 'approved'
        }
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to approve player'));
    }
  }

  /**
   * Reject player
   * POST /api/clubs/:id/players/:playerId/reject
   */
  @Post(':id/players/:playerId/reject')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rejectPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: RejectPlayerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Validate reason
      if (!dto.reason || !dto.reason.trim()) {
        throw new BadRequestException('Rejection reason is required');
      }

      // Validate tenant if provided
      if (tenantId && !uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Validate club-id header if provided
      if (headerClubId && !uuidRegex.test(headerClubId.trim())) {
        throw new BadRequestException('Invalid club ID format in header');
      }

      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate club access
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only reject players for your assigned club');
      }

      // Get player
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Update player status
      await this.playersRepo.update(
        { id: playerId },
        {
          status: 'Rejected',
          kycStatus: 'rejected',
          notes: dto.reason
        }
      );

      // TODO: Log action when audit service is updated

      return {
        success: true,
        message: 'Player rejected successfully',
        player: {
          id: player.id,
          name: player.name,
          email: player.email,
          status: 'Rejected',
          kycStatus: 'rejected',
          reason: dto.reason
        }
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to reject player'));
    }
  }

  /**
   * Suspend player
   * POST /api/clubs/:id/players/:playerId/suspend
   */
  @Post(':id/players/:playerId/suspend')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async suspendPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: SuspendPlayerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Validate reason and type
      if (!dto.reason || !dto.reason.trim()) {
        throw new BadRequestException('Suspension reason is required');
      }
      if (!dto.type || !['temporary', 'permanent'].includes(dto.type)) {
        throw new BadRequestException('Suspension type must be "temporary" or "permanent"');
      }

      // Validate tenant if provided
      if (tenantId && !uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Validate club-id header if provided
      if (headerClubId && !uuidRegex.test(headerClubId.trim())) {
        throw new BadRequestException('Invalid club ID format in header');
      }

      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate club access
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only suspend players for your assigned club');
      }

      // Get player
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Check if already suspended
      if (player.status === 'Suspended') {
        throw new BadRequestException('Player is already suspended');
      }

      // Update player status
      const suspensionInfo = {
        type: dto.type,
        reason: dto.reason,
        duration: dto.duration || null,
        suspendedAt: new Date().toISOString()
      };

      await this.playersRepo.update(
        { id: playerId },
        {
          status: 'Suspended',
          notes: JSON.stringify(suspensionInfo)
        }
      );

      // TODO: Log action when audit service is updated

      return {
        success: true,
        message: 'Player suspended successfully',
        player: {
          id: player.id,
          name: player.name,
          email: player.email,
          status: 'Suspended',
          suspensionType: dto.type,
          reason: dto.reason,
          duration: dto.duration
        }
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to suspend player'));
    }
  }

  /**
   * Unsuspend player
   * POST /api/clubs/:id/players/:playerId/unsuspend
   */
  @Post(':id/players/:playerId/unsuspend')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async unsuspendPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Validate tenant if provided
      if (tenantId && !uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Validate club-id header if provided
      if (headerClubId && !uuidRegex.test(headerClubId.trim())) {
        throw new BadRequestException('Invalid club ID format in header');
      }

      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate club access
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only unsuspend players for your assigned club');
      }

      // Get player
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Check if player is suspended
      if (player.status !== 'Suspended') {
        throw new BadRequestException('Player is not suspended');
      }

      // Update player status
      await this.playersRepo.update(
        { id: playerId },
        {
          status: 'Active'
        }
      );

      // TODO: Log action when audit service is updated

      return {
        success: true,
        message: 'Player unsuspended successfully',
        player: {
          id: player.id,
          name: player.name,
          email: player.email,
          status: 'Active'
        }
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to unsuspend player'));
    }
  }

  /**
   * Get suspended players
   * GET /api/clubs/:id/players-suspended
   */
  @Get(':id/players-suspended')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getSuspendedPlayers(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string
  ) {
    try {
      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Validate tenant if provided
      if (tenantId && !uuidRegex.test(tenantId.trim())) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Validate club-id header if provided
      if (headerClubId && !uuidRegex.test(headerClubId.trim())) {
        throw new BadRequestException('Invalid club ID format in header');
      }

      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users, validate club access
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view players for your assigned club');
      }

      // Get suspended players
      const players = await this.playersRepo.find({
        where: { club: { id: clubId }, status: 'Suspended' },
        relations: ['club', 'affiliate'],
        order: { updatedAt: 'DESC' }
      });

      return players.map(p => {
        let suspensionInfo: any = {};
        try {
          if (p.notes) {
            suspensionInfo = JSON.parse(p.notes);
          }
        } catch (e) {
          // If notes is not JSON, treat as plain text reason
          suspensionInfo = { reason: p.notes };
        }

        return {
          id: p.id,
          name: p.name,
          email: p.email,
          phoneNumber: p.phoneNumber,
          playerId: p.playerId,
          status: p.status,
          suspensionType: suspensionInfo.type || 'unknown',
          reason: suspensionInfo.reason || 'No reason provided',
          duration: suspensionInfo.duration || null,
          suspendedAt: suspensionInfo.suspendedAt || p.updatedAt,
          affiliateCode: p.affiliate ? (p.affiliate as any).code : null
        };
      });
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get suspended players'));
    }
  }

  /**
   * Update player
   * PUT /api/clubs/:id/players/:playerId
   */
  @Put(':id/players/:playerId')
  @Roles(TenantRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: UpdatePlayerDto,
    @Headers('x-tenant-id') tenantId?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for playerId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Edge case: Validate request body
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException('Request body is required');
      }

      // Edge case: Check if at least one field is being updated
      const hasUpdateFields = dto.name !== undefined || dto.email !== undefined || 
                              dto.phoneNumber !== undefined || dto.playerId !== undefined || 
                              dto.notes !== undefined || dto.status !== undefined;
      if (!hasUpdateFields) {
        throw new BadRequestException('At least one field must be provided for update');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // Edge case: Error handling for database query
      let player: Player | null = null;
      try {
        player = await this.playersRepo.findOne({
          where: { id: playerId, club: { id: clubId } },
          relations: ['club']
        });
      } catch (dbError) {
        console.error('Database error fetching player:', dbError);
        throw new BadRequestException('Unable to fetch player. Please try again.');
      }

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check player status before allowing updates
      if (player.status && player.status.toLowerCase() === 'suspended' && dto.status !== 'Active' && dto.status !== 'Inactive') {
        // Allow status change but warn about other updates
        if (dto.email !== undefined || dto.name !== undefined) {
          console.warn(`Attempting to update suspended player ${playerId}`);
        }
      }

      // Edge case: Validate and update name
      if (dto.name !== undefined) {
        if (!dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
          throw new BadRequestException('Name cannot be empty');
        }
        const trimmedName = dto.name.trim();
        if (trimmedName.length < 2) {
          throw new BadRequestException('Name must be at least 2 characters');
        }
        if (trimmedName.length > 200) {
          throw new BadRequestException('Name cannot exceed 200 characters');
        }
        if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
          throw new BadRequestException('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
        }
        player.name = trimmedName;
      }

      // Edge case: Validate and update email
      if (dto.email !== undefined) {
        if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
          throw new BadRequestException('Email cannot be empty');
        }
        const trimmedEmail = dto.email.trim().toLowerCase();
        if (trimmedEmail.length > 200) {
          throw new BadRequestException('Email cannot exceed 200 characters');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          throw new BadRequestException('Invalid email format');
        }
        // Edge case: Validate email domain
        const emailParts = trimmedEmail.split('@');
        if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
          throw new BadRequestException('Invalid email domain');
        }
        // Edge case: Check if email already exists for another player in this club
        let existingPlayer: Player | null = null;
        try {
          existingPlayer = await this.playersRepo.findOne({
            where: { club: { id: clubId }, email: trimmedEmail }
          });
        } catch (dbError) {
          console.error('Database error checking existing email:', dbError);
          throw new BadRequestException('Unable to verify email. Please try again.');
        }
        if (existingPlayer && existingPlayer.id !== playerId) {
          throw new ConflictException('A player with this email already exists in this club');
        }
        player.email = trimmedEmail;
      }

      // Edge case: Validate and update phone number
      if (dto.phoneNumber !== undefined) {
        if (dto.phoneNumber === null || dto.phoneNumber === '') {
          player.phoneNumber = null;
        } else {
          if (typeof dto.phoneNumber !== 'string') {
            throw new BadRequestException('Phone number must be a string');
          }
          const trimmedPhone = dto.phoneNumber.trim();
          if (trimmedPhone.length < 10) {
            throw new BadRequestException('Phone number must be at least 10 characters');
          }
          if (trimmedPhone.length > 20) {
            throw new BadRequestException('Phone number cannot exceed 20 characters');
          }
          if (!/^[\+]?[0-9\s\-\(\)]+$/.test(trimmedPhone)) {
            throw new BadRequestException('Phone number contains invalid characters');
          }
          player.phoneNumber = trimmedPhone;
        }
      }

      // Edge case: Validate and update player ID
      if (dto.playerId !== undefined) {
        if (dto.playerId === null || dto.playerId === '') {
          player.playerId = null;
        } else {
          if (typeof dto.playerId !== 'string') {
            throw new BadRequestException('Player ID must be a string');
          }
          const trimmedPlayerId = dto.playerId.trim();
          if (trimmedPlayerId.length > 100) {
            throw new BadRequestException('Player ID cannot exceed 100 characters');
          }
          player.playerId = trimmedPlayerId;
        }
      }

      // Edge case: Validate and update notes
      if (dto.notes !== undefined) {
        if (dto.notes === null || dto.notes === '') {
          player.notes = null;
        } else {
          if (typeof dto.notes !== 'string') {
            throw new BadRequestException('Notes must be a string');
          }
          const trimmedNotes = dto.notes.trim();
          if (trimmedNotes.length > 500) {
            throw new BadRequestException('Notes cannot exceed 500 characters');
          }
          player.notes = trimmedNotes;
        }
      }

      // Edge case: Validate and update status
      if (dto.status !== undefined) {
        const validStatuses = ['Active', 'Inactive', 'Suspended'];
        if (!dto.status || typeof dto.status !== 'string' || !validStatuses.includes(dto.status.trim())) {
          throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
        }
        player.status = dto.status.trim();
      }

      // Edge case: Error handling for database save
      let savedPlayer: Player;
      try {
        savedPlayer = await this.playersRepo.save(player);
      } catch (saveError: any) {
        console.error('Database error saving player:', saveError);
        // Edge case: Check for duplicate email constraint violation
        if (saveError.code === '23505' || saveError.message?.includes('unique') || saveError.message?.includes('duplicate')) {
          throw new ConflictException('A player with this email already exists in this club');
        }
        throw new BadRequestException('Unable to update player. Please try again.');
      }

      // Edge case: Validate saved player
      if (!savedPlayer || !savedPlayer.id) {
        throw new BadRequestException('Player update failed. Please try again.');
      }

      return {
        id: savedPlayer.id,
        name: savedPlayer.name,
        email: savedPlayer.email,
        phoneNumber: savedPlayer.phoneNumber,
        playerId: savedPlayer.playerId,
        status: savedPlayer.status,
        notes: savedPlayer.notes,
        updatedAt: savedPlayer.updatedAt
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to update player'));
    }
  }

  /**
   * Get player balance
   * GET /api/clubs/:id/players/:playerId/balance
   */
  @Get(':id/players/:playerId/balance')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.AFFILIATE)
  async getPlayerBalance(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate UUID format for playerId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users (CASHIER), validate they can only view players for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view players for your assigned club');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } }
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Error handling for transaction query
      let transactions: FinancialTransaction[] = [];
      try {
        transactions = await this.transactionsRepo.find({
          where: {
            club: { id: clubId },
            playerId: player.id,
            status: TransactionStatus.COMPLETED
          },
          order: { createdAt: 'DESC' }
        });
      } catch (dbError) {
        console.error('Database error fetching transactions:', dbError);
        // Continue with empty transactions array - balance will be 0
        transactions = [];
      }

      // Calculate balance from transactions
      let availableBalance = 0;
      for (const txn of transactions) {
        try {
          const amount = Number(txn.amount);
          if (isNaN(amount) || amount < 0) {
            console.warn('Invalid transaction amount:', txn.id, txn.amount);
            continue;
          }
          if (['Deposit', 'Credit', 'Bonus', 'Refund'].includes(txn.type)) {
            availableBalance += amount;
          } else if (['Cashout', 'Withdrawal', 'Buy In'].includes(txn.type)) {
            availableBalance -= amount;
          }
        } catch (calcError) {
          console.error('Error calculating balance from transaction:', txn.id, calcError);
          // Skip this transaction
        }
      }

      // Edge case: Ensure balance is not negative (safety check)
      availableBalance = Math.max(0, availableBalance);
      
      // Edge case: Validate balance is a valid number
      if (isNaN(availableBalance) || !isFinite(availableBalance)) {
        console.error('Invalid balance calculated for player:', playerId);
        availableBalance = 0;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        availableBalance: availableBalance,
        tableBalance: 0, // Placeholder - would need actual game state
        totalBalance: availableBalance,
        clubId: clubId
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get player balance'));
    }
  }

  /**
   * Get player transactions
   * GET /api/clubs/:id/players/:playerId/transactions
   */
  @Get(':id/players/:playerId/transactions')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.AFFILIATE)
  async getPlayerTransactions(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: Validate UUID format for clubId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate UUID format for playerId
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Edge case: Validate tenant-id header if provided (for SUPER_ADMIN)
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate club-id header if provided (for CASHIER)
      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      // Edge case: CASHIER must provide x-club-id header
      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for CASHIER role');
      }

      // Edge case: Validate limit and offset
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offsetNum = offset ? parseInt(offset, 10) : 0;
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
      if (isNaN(offsetNum) || offsetNum < 0) {
        throw new BadRequestException('Offset must be 0 or greater');
      }
      if (offsetNum > 10000) {
        throw new BadRequestException('Offset cannot exceed 10000');
      }

      // Edge case: Validate club exists
      let club;
      try {
        club = await this.clubsService.findById(clubId);
      } catch (dbError) {
        console.error('Database error fetching club:', dbError);
        throw new BadRequestException('Unable to verify club. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        try {
          await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
        } catch (validationError) {
          if (validationError instanceof ForbiddenException || validationError instanceof NotFoundException) {
            throw validationError;
          }
          throw new BadRequestException('Unable to validate tenant. Please try again.');
        }
      }

      // For club-scoped users (CASHIER), validate they can only view players for their own club
      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('You can only view players for your assigned club');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } }
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Error handling for database query
      let transactions: FinancialTransaction[] = [];
      let total = 0;
      try {
        [transactions, total] = await this.transactionsRepo.findAndCount({
          where: {
            club: { id: clubId },
            playerId: player.id
          },
          order: { createdAt: 'DESC' },
          take: limitNum,
          skip: offsetNum
        });
      } catch (dbError) {
        console.error('Database error fetching transactions:', dbError);
        throw new BadRequestException('Unable to fetch transactions. Please try again.');
      }

      // Edge case: Validate offset doesn't exceed total
      if (offsetNum >= total && total > 0) {
        throw new BadRequestException('Offset exceeds total number of transactions');
      }

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          status: t.status,
          notes: t.notes,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        })),
        total,
        limit: limitNum,
        offset: offsetNum
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get player transactions'));
    }
  }

  /**
   * Create transaction for player
   * POST /api/clubs/:id/players/:playerId/transactions
   */
  @Post(':id/players/:playerId/transactions')
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createPlayerTransaction(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: CreateTransactionDto,
    @Headers('x-tenant-id') tenantId?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for playerId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check player status - cannot create transaction for suspended player
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Cannot create transaction for suspended player. Please activate the player first.');
      }

      // Edge case: Validate transaction type
      if (!dto.type || typeof dto.type !== 'string') {
        throw new BadRequestException('Transaction type is required');
      }
      const validTransactionTypes = Object.values(TransactionType);
      if (!validTransactionTypes.includes(dto.type)) {
        throw new BadRequestException(`Invalid transaction type. Must be one of: ${validTransactionTypes.join(', ')}`);
      }

      // Edge case: Error handling for transaction creation
      let transaction: FinancialTransaction;
      try {
        transaction = await this.financialTransactionsService.create(clubId, {
          type: dto.type,
          playerId: player.id,
          playerName: player.name,
          amount: dto.amount,
          notes: dto.notes
        });
      } catch (createError) {
        console.error('Error creating transaction:', createError);
        if (createError instanceof BadRequestException || createError instanceof ConflictException) {
          throw createError;
        }
        throw new BadRequestException('Unable to create transaction. Please try again.');
      }

      // Edge case: Validate transaction was created
      if (!transaction || !transaction.id) {
        throw new BadRequestException('Transaction creation failed. Please try again.');
      }

      return {
        id: transaction.id,
        type: transaction.type,
        playerId: transaction.playerId,
        playerName: transaction.playerName,
        amount: Number(transaction.amount),
        status: transaction.status,
        notes: transaction.notes,
        createdAt: transaction.createdAt
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to create transaction'));
    }
  }

  /**
   * Activate player
   * POST /api/clubs/:id/players/:playerId/activate
   */
  @Post(':id/players/:playerId/activate')
  @Roles(TenantRole.SUPER_ADMIN)
  async activatePlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Headers('x-tenant-id') tenantId?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for playerId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } }
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check if already active
      if (player.status === 'Active') {
        throw new ConflictException('Player is already active');
      }

      player.status = 'Active';
      
      // Edge case: Error handling for database save
      let savedPlayer: Player;
      try {
        savedPlayer = await this.playersRepo.save(player);
      } catch (saveError) {
        console.error('Database error activating player:', saveError);
        throw new BadRequestException('Unable to activate player. Please try again.');
      }

      // Edge case: Validate saved player
      if (!savedPlayer || !savedPlayer.id) {
        throw new BadRequestException('Player activation failed. Please try again.');
      }

      return {
        id: savedPlayer.id,
        name: savedPlayer.name,
        email: savedPlayer.email,
        status: savedPlayer.status,
        updatedAt: savedPlayer.updatedAt
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to activate player'));
    }
  }

  /**
   * Delete player
   * DELETE /api/clubs/:id/players/:playerId
   */
  @Delete(':id/players/:playerId')
  @Roles(TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Headers('x-tenant-id') tenantId?: string
  ) {
    try {
      // Edge case: Validate tenant-id header if provided
      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      // Edge case: Validate UUID format for playerId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }

      // Edge case: Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } }
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check if player has pending transactions
      let pendingTransactions = 0;
      try {
        pendingTransactions = await this.transactionsRepo.count({
          where: {
            club: { id: clubId },
            playerId: player.id,
            status: TransactionStatus.PENDING
          }
        });
      } catch (dbError) {
        console.error('Database error checking pending transactions:', dbError);
        throw new BadRequestException('Unable to verify player transactions. Please try again.');
      }

      if (pendingTransactions > 0) {
        throw new ConflictException('Cannot delete player with pending transactions. Please resolve all pending transactions first.');
      }

      // Edge case: Check if player has completed transactions (optional - might want to keep history)
      // For now, we allow deletion even with completed transactions

      // Edge case: Check if player is on waitlist or seated
      let waitlistEntries: any[] = [];
      try {
        waitlistEntries = await this.waitlistSeatingService.getWaitlist(clubId);
      } catch (dbError) {
        console.error('Database error checking waitlist:', dbError);
        throw new BadRequestException('Unable to verify waitlist status. Please try again.');
      }
      
      const playerOnWaitlist = waitlistEntries.find(e => e.playerId === player.id && (e.status === WaitlistStatus.PENDING || e.status === WaitlistStatus.SEATED));
      if (playerOnWaitlist) {
        throw new ConflictException('Cannot delete player who is on waitlist or seated. Please remove from waitlist first.');
      }

      // Edge case: Error handling for player deletion
      try {
        await this.playersRepo.remove(player);
      } catch (deleteError: any) {
        console.error('Database error deleting player:', deleteError);
        // Edge case: Check for foreign key constraint violations
        if (deleteError.code === '23503' || deleteError.message?.includes('foreign key')) {
          throw new ConflictException('Cannot delete player due to existing references. Please remove all related records first.');
        }
        throw new BadRequestException('Unable to delete player. Please try again.');
      }
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to delete player'));
    }
  }

  // ==================== FNB ENDPOINTS ====================

  /**
   * Create FNB Order
   * POST /api/clubs/:id/fnb/orders
   */
  @Post(':id/fnb/orders')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async createFnbOrder(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreateFnbOrderDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return await this.fnbService.createOrder(clubId, dto, userId);
  }

  /**
   * Get FNB Orders (with filters)
   * GET /api/clubs/:id/fnb/orders
   */
  @Get(':id/fnb/orders')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getFnbOrders(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('status') status?: OrderStatus,
    @Query('tableNumber') tableNumber?: string,
    @Query('playerId') playerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.fnbService.getOrders(clubId, {
      status,
      tableNumber,
      playerId,
      dateFrom,
      dateTo,
    });
  }

  /**
   * Get Single FNB Order
   * GET /api/clubs/:id/fnb/orders/:orderId
   */
  @Get(':id/fnb/orders/:orderId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getFnbOrder(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return await this.fnbService.getOrder(clubId, orderId);
  }

  /**
   * Update FNB Order Status
   * PATCH /api/clubs/:id/fnb/orders/:orderId
   */
  @Patch(':id/fnb/orders/:orderId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async updateFnbOrder(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateFnbOrderDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return await this.fnbService.updateOrderStatus(clubId, orderId, dto, userId);
  }

  /**
   * Cancel FNB Order
   * DELETE /api/clubs/:id/fnb/orders/:orderId/cancel
   */
  @Delete(':id/fnb/orders/:orderId/cancel')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async cancelFnbOrder(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return await this.fnbService.cancelOrder(clubId, orderId, userId);
  }

  /**
   * Create Menu Item
   * POST /api/clubs/:id/fnb/menu
   */
  @Post(':id/fnb/menu')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async createMenuItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    return await this.fnbService.createMenuItem(clubId, dto);
  }

  /**
   * Get Menu Items (with filters)
   * GET /api/clubs/:id/fnb/menu
   */
  @Get(':id/fnb/menu')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getMenuItems(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('category') category?: string,
    @Query('available') available?: string,
    @Query('search') search?: string,
  ) {
    return await this.fnbService.getMenuItems(clubId, {
      category,
      available: available === 'true',
      search,
    });
  }

  /**
   * Get Single Menu Item
   * GET /api/clubs/:id/fnb/menu/:itemId
   */
  @Get(':id/fnb/menu/:itemId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getMenuItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return await this.fnbService.getMenuItem(clubId, itemId);
  }

  /**
   * Update Menu Item
   * PATCH /api/clubs/:id/fnb/menu/:itemId
   */
  @Patch(':id/fnb/menu/:itemId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async updateMenuItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return await this.fnbService.updateMenuItem(clubId, itemId, dto);
  }

  /**
   * Delete Menu Item
   * DELETE /api/clubs/:id/fnb/menu/:itemId
   */
  @Delete(':id/fnb/menu/:itemId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async deleteMenuItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return await this.fnbService.deleteMenuItem(clubId, itemId);
  }

  /**
   * Get Menu Categories
   * GET /api/clubs/:id/fnb/categories
   */
  @Get(':id/fnb/categories')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getMenuCategories(
    @Param('id', ParseUUIDPipe) clubId: string,
  ) {
    return await this.fnbService.getCategories(clubId);
  }

  /**
   * Create Inventory Item
   * POST /api/clubs/:id/fnb/inventory
   */
  @Post(':id/fnb/inventory')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async createInventoryItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return await this.fnbService.createInventoryItem(clubId, dto);
  }

  /**
   * Get Inventory Items (with filters)
   * GET /api/clubs/:id/fnb/inventory
   */
  @Get(':id/fnb/inventory')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getInventoryItems(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
    @Query('outOfStock') outOfStock?: string,
  ) {
    return await this.fnbService.getInventoryItems(clubId, {
      category,
      lowStock: lowStock === 'true',
      outOfStock: outOfStock === 'true',
    });
  }

  /**
   * Get Single Inventory Item
   * GET /api/clubs/:id/fnb/inventory/:itemId
   */
  @Get(':id/fnb/inventory/:itemId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getInventoryItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return await this.fnbService.getInventoryItem(clubId, itemId);
  }

  /**
   * Update Inventory Item
   * PATCH /api/clubs/:id/fnb/inventory/:itemId
   */
  @Patch(':id/fnb/inventory/:itemId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async updateInventoryItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return await this.fnbService.updateInventoryItem(clubId, itemId, dto);
  }

  /**
   * Delete Inventory Item
   * DELETE /api/clubs/:id/fnb/inventory/:itemId
   */
  @Delete(':id/fnb/inventory/:itemId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async deleteInventoryItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return await this.fnbService.deleteInventoryItem(clubId, itemId);
  }

  /**
   * Get Low Stock Items
   * GET /api/clubs/:id/fnb/inventory-alerts/low-stock
   */
  @Get(':id/fnb/inventory-alerts/low-stock')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getLowStockItems(
    @Param('id', ParseUUIDPipe) clubId: string,
  ) {
    return await this.fnbService.getLowStockItems(clubId);
  }

  /**
   * Get Out of Stock Items
   * GET /api/clubs/:id/fnb/inventory-alerts/out-of-stock
   */
  @Get(':id/fnb/inventory-alerts/out-of-stock')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getOutOfStockItems(
    @Param('id', ParseUUIDPipe) clubId: string,
  ) {
    return await this.fnbService.getOutOfStockItems(clubId);
  }

  /**
   * Create Supplier
   * POST /api/clubs/:id/fnb/suppliers
   */
  @Post(':id/fnb/suppliers')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async createSupplier(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return await this.fnbService.createSupplier(clubId, dto);
  }

  /**
   * Get Suppliers
   * GET /api/clubs/:id/fnb/suppliers
   */
  @Get(':id/fnb/suppliers')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getSuppliers(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return await this.fnbService.getSuppliers(clubId, activeOnly === 'true');
  }

  /**
   * Get Single Supplier
   * GET /api/clubs/:id/fnb/suppliers/:supplierId
   */
  @Get(':id/fnb/suppliers/:supplierId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getSupplier(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
  ) {
    return await this.fnbService.getSupplier(clubId, supplierId);
  }

  /**
   * Update Supplier
   * PATCH /api/clubs/:id/fnb/suppliers/:supplierId
   */
  @Patch(':id/fnb/suppliers/:supplierId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async updateSupplier(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return await this.fnbService.updateSupplier(clubId, supplierId, dto);
  }

  /**
   * Delete Supplier
   * DELETE /api/clubs/:id/fnb/suppliers/:supplierId
   */
  @Delete(':id/fnb/suppliers/:supplierId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async deleteSupplier(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
  ) {
    return await this.fnbService.deleteSupplier(clubId, supplierId);
  }

  /**
   * Get FNB Order Analytics
   * GET /api/clubs/:id/fnb/analytics/orders
   */
  @Get(':id/fnb/analytics/orders')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getFnbOrderAnalytics(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.fnbService.getOrderAnalytics(clubId, dateFrom, dateTo);
  }

  /**
   * Get Popular Items
   * GET /api/clubs/:id/fnb/analytics/popular-items
   */
  @Get(':id/fnb/analytics/popular-items')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getPopularItems(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.fnbService.getPopularItems(
      clubId,
      limit ? parseInt(limit) : 10,
      dateFrom,
      dateTo
    );
  }

  // =========================================================================
  // MASTER ADMIN ENDPOINTS
  // =========================================================================

  /**
   * Get all clubs with tenant info (Master Admin only)
   * GET /api/clubs/master-admin/all
   */
  @Get('master-admin/all')
  @Roles(GlobalRole.MASTER_ADMIN)
  async getAllClubsForMasterAdmin() {
    try {
      const clubs = await this.clubsService.findAllWithTenants();
      
      return clubs.map(club => ({
        id: club.id,
        name: club.name,
        description: club.description,
        code: club.code,
        status: club.status || 'active',
        subscriptionPrice: club.subscriptionPrice || 0,
        subscriptionStatus: club.subscriptionStatus || 'active',
        lastPaymentDate: club.lastPaymentDate,
        termsAndConditions: club.termsAndConditions,
        logoUrl: club.logoUrl,
        videoUrl: club.videoUrl,
        skinColor: club.skinColor,
        gradient: club.gradient,
        tenant: {
          id: club.tenant.id,
          name: club.tenant.name
        },
        createdAt: club.createdAt,
        updatedAt: club.updatedAt
      }));
    } catch (error) {
      console.error('Error in getAllClubsForMasterAdmin:', error);
      throw error;
    }
  }

  /**
   * Update club status (active/suspended/killed)
   * PUT /api/clubs/:id/status
   */
  @Put(':id/status')
  @Roles(GlobalRole.MASTER_ADMIN)
  async updateClubStatus(
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() body: { status: string; reason?: string }
  ) {
    try {
      const club = await this.clubsService.updateClubStatus(clubId, body.status, body.reason);
      
      return {
        success: true,
        club: {
          id: club.id,
          name: club.name,
          status: club.status,
          code: club.code
        },
        message: `Club ${body.status === 'killed' ? 'permanently disabled' : body.status}`
      };
    } catch (error) {
      console.error('Error in updateClubStatus:', error);
      throw error;
    }
  }

  /**
   * Update club subscription
   * PUT /api/clubs/:id/subscription
   */
  @Put(':id/subscription')
  @Roles(GlobalRole.MASTER_ADMIN)
  async updateClubSubscription(
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: any
  ) {
    try {
      const club = await this.clubsService.updateClubSubscription(clubId, dto);
      
      return {
        success: true,
        club: {
          id: club.id,
          name: club.name,
          subscriptionPrice: club.subscriptionPrice,
          subscriptionStatus: club.subscriptionStatus,
          lastPaymentDate: club.lastPaymentDate
        }
      };
    } catch (error) {
      console.error('Error in updateClubSubscription:', error);
      throw error;
    }
  }

  /**
   * Update club terms and conditions
   * PUT /api/clubs/:id/terms
   */
  @Put(':id/terms')
  @Roles(GlobalRole.MASTER_ADMIN)
  async updateClubTerms(
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() body: { termsAndConditions: string }
  ) {
    try {
      const club = await this.clubsService.updateClubTerms(clubId, body.termsAndConditions);
      
      return {
        success: true,
        club: {
          id: club.id,
          name: club.name,
          termsAndConditions: club.termsAndConditions
        }
      };
    } catch (error) {
      console.error('Error in updateClubTerms:', error);
      throw error;
    }
  }
}

