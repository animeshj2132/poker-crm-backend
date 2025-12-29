import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Headers, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, Request, Res, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { PushNotificationsService } from './services/push-notifications.service';
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
import { CreatePushNotificationDto } from './dto/create-push-notification.dto';
import { UpdatePushNotificationDto } from './dto/update-push-notification.dto';
import { SetClubSettingDto } from './dto/set-club-setting.dto';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { AssignSeatDto } from './dto/assign-seat.dto';
import { UpdateSessionParamsDto } from './dto/update-session-params.dto';
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
import { FnbEnhancedService } from './services/fnb-enhanced.service';
import { CreateFnbOrderDto } from './dto/create-fnb-order.dto';
import { UpdateFnbOrderDto } from './dto/update-fnb-order.dto';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto';
import { AcceptRejectOrderDto } from './dto/accept-reject-order.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { OrderStatus } from './entities/fnb-order.entity';
import { TournamentsService } from './services/tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { EndTournamentDto } from './dto/end-tournament.dto';
import { StaffManagementService } from './services/staff-management.service';
import { SuspendStaffDto } from './dto/suspend-staff.dto';
import { ShiftManagementService } from './services/shift-management.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CopyShiftDto } from './dto/copy-shift.dto';
import { PayrollService } from './services/payroll.service';
import { ProcessSalaryDto } from './dto/process-salary.dto';
import { ProcessDealerTipsDto } from './dto/process-dealer-tips.dto';
import { ProcessAffiliatePaymentDto } from './dto/process-affiliate-payment.dto';
import { EditTransactionDto } from './dto/edit-transaction.dto';
import { CancelTransactionDto } from './dto/cancel-transaction.dto';
import { FinancialOverridesService } from './services/financial-overrides.service';
import { ProcessDealerCashoutDto } from './dto/process-dealer-cashout.dto';
import { UpdateTipSettingsDto } from './dto/update-tip-settings.dto';
import { BonusService } from './services/bonus.service';
import { CreatePlayerBonusDto } from './dto/create-player-bonus.dto';
import { CreateStaffBonusDto } from './dto/create-staff-bonus.dto';
import { ChatService } from './services/chat.service';
import { CreateStaffChatSessionDto } from './dto/create-staff-chat-session.dto';
import { CreatePlayerChatSessionDto } from './dto/create-player-chat-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { ReportsService } from './services/reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { FactoryResetDto } from './dto/factory-reset.dto';
import { ActionCategory } from './dto/create-audit-log.dto';
import { RakeCollectionService } from './services/rake-collection.service';
import { CreateRakeCollectionDto } from './dto/create-rake-collection.dto';
import { QueryRakeCollectionsDto } from './dto/query-rake-collections.dto';
import { BuyOutRequestService } from './services/buyout-request.service';
import { ApproveBuyOutDto } from './dto/approve-buyout.dto';
import { RejectBuyOutDto } from './dto/reject-buyout.dto';
import { BuyInRequestService } from './services/buyin-request.service';
import { ApproveBuyInDto } from './dto/approve-buyin.dto';
import { RejectBuyInDto } from './dto/reject-buyin.dto';
import { AttendanceTrackingService } from './services/attendance-tracking.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

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
    private readonly pushNotificationsService: PushNotificationsService,
    private readonly clubSettingsService: ClubSettingsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly waitlistSeatingService: WaitlistSeatingService,
    private readonly analyticsService: AnalyticsService,
    private readonly affiliatesService: AffiliatesService,
    private readonly fnbService: FnbService,
    private readonly fnbEnhancedService: FnbEnhancedService,
    private readonly tournamentsService: TournamentsService,
    private readonly staffManagementService: StaffManagementService,
    private readonly shiftManagementService: ShiftManagementService,
    private readonly payrollService: PayrollService,
    private readonly bonusService: BonusService,
    private readonly financialOverridesService: FinancialOverridesService,
    private readonly chatService: ChatService,
    private readonly reportsService: ReportsService,
    private readonly rakeCollectionService: RakeCollectionService,
    private readonly buyOutRequestService: BuyOutRequestService,
    private readonly buyInRequestService: BuyInRequestService,
    private readonly attendanceTrackingService: AttendanceTrackingService,
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
    @Body() dto: CreateClubDto,
    @Req() req?: Request
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

      const club = await this.clubsService.create(tenantId.trim(), dto.name.trim());
      
      // Audit log: Create club (tenant-level operation)
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId && club) {
          const user = await this.usersService.findById(userId);
          
          await this.auditLogsService.logAction({
            clubId: club.id,
            staffId: userId,
            staffName: user?.displayName || user?.email || 'Unknown',
            staffRole: 'SUPER_ADMIN',
            actionType: 'club_created',
            actionCategory: ActionCategory.SYSTEM,
            description: `Created club: ${dto.name.trim()} (Tenant: ${tenantId.trim()})`,
            targetType: 'club',
            targetId: club.id,
            targetName: dto.name.trim(),
            metadata: { 
              clubName: dto.name.trim(),
              tenantId: tenantId.trim()
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for club creation:', auditError);
      }
      
      return club;
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
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req?: Request
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
      const uploadUrl = await this.storageService.createSignedUploadUrl(path);
      
      // Audit log: Create club logo upload URL
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(id);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId: id,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'SUPER_ADMIN',
            actionType: 'club_logo_upload_url_created',
            actionCategory: ActionCategory.SYSTEM,
            description: `Created logo upload URL for club ${club.name}`,
            targetType: 'club',
            targetId: id,
            targetName: club.name,
            metadata: { 
              clubName: club.name,
              tenantId: tenantId.trim()
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for logo upload URL creation:', auditError);
      }
      
      return uploadUrl;
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
    @Body() dto: AssignAdminDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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
      
      // Audit log: Create admin
      try {
        if (userId) {
          const actorUser = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === actorUser?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || actorUser?.displayName || actorUser?.email || 'Unknown',
            staffRole: staff?.role || 'Super Admin',
            actionType: 'admin_created',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Assigned admin role to ${dto.email}${dto.displayName ? ` (${dto.displayName})` : ''}`,
            targetType: 'user',
            targetId: user.id,
            targetName: dto.displayName || dto.email,
            metadata: { 
              email: dto.email,
              displayName: dto.displayName
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for admin assignment:', auditError);
      }
      
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
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Headers('x-user-id') actorUserId?: string,
    @Req() req?: Request
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

      // Audit log: Delete admin (before removal)
      try {
        if (actorUserId) {
          const actorUser = await this.usersService.findById(actorUserId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === actorUserId || s.email === actorUser?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || actorUserId,
            staffName: staff?.name || actorUser?.displayName || actorUser?.email || 'Unknown',
            staffRole: staff?.role || 'Super Admin',
            actionType: 'admin_deleted',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Removed admin role from ${targetUser.displayName || targetUser.email}`,
            targetType: 'user',
            targetId: targetUser.id,
            targetName: targetUser.displayName || targetUser.email,
            metadata: { 
              email: targetUser.email,
              displayName: targetUser.displayName
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for admin removal:', auditError);
      }

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

  /**
   * PUBLIC ENDPOINT: Get club branding information (no auth required)
   * This endpoint is used by the player portal to fetch club branding (logo, colors, etc.)
   * Returns only public branding information, no sensitive data
   */
  @Get(':id/branding')
  async getClubBranding(
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Return only public branding information
      return {
        id: club.id,
        name: club.name,
        code: club.code,
        logoUrl: club.logoUrl,
        videoUrl: club.videoUrl,
        skinColor: club.skinColor,
        gradient: club.gradient,
        termsAndConditions: club.termsAndConditions,
      };
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get club branding: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(TenantRole.SUPER_ADMIN, GlobalRole.MASTER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.STAFF, ClubRole.AFFILIATE, ClubRole.CASHIER, ClubRole.GRE, ClubRole.FNB, ClubRole.DEALER)
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
  @Roles(TenantRole.SUPER_ADMIN, GlobalRole.MASTER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  async getClubRevenue(
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
      if (tenantId && typeof tenantId === 'string' && tenantId.trim()) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
      }

      // For club-scoped users (ADMIN/MANAGER/CASHIER), validate club access
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access revenue for your assigned club');
        }
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateClubUserDto,
    @Req() req?: Request
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

      // Audit log: Create club user
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'club_user_created',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `${result.isExistingUser ? 'Assigned' : 'Created'} user ${dto.email} with role ${dto.role}${result.roleAlreadyAssigned ? ' (role already assigned)' : ''}`,
            targetType: 'user',
            targetId: result.user.id,
            targetName: result.user.displayName || dto.email,
            metadata: { 
              email: dto.email,
              role: dto.role,
              isExistingUser: result.isExistingUser,
              roleAlreadyAssigned: result.roleAlreadyAssigned
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for club user creation:', auditError);
      }

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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateStaffDto,
    @Req() req?: Request
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

      // Use staffManagementService which supports KYC documents
      const result = await this.staffManagementService.createStaff(clubId, {
        name: dto.name,
        role: dto.role,
        email: dto.email,
        phone: dto.phone,
        employeeId: dto.employeeId,
        aadharDocumentUrl: dto.aadharDocumentUrl,
        panDocumentUrl: dto.panDocumentUrl,
        customRoleName: dto.customRoleName,
      }, 'system'); // createdBy can be enhanced later

      // Audit log: Create staff
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'staff_created',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Created staff member ${result.name} with role ${result.role}${dto.email ? ` (${dto.email})` : ''}`,
            targetType: 'staff',
            targetId: result.id,
            targetName: result.name,
            metadata: { 
              email: dto.email,
              role: dto.role,
              employeeId: dto.employeeId
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff creation:', auditError);
      }
      
      return { success: true, staff: result, tempPassword: result.tempPasswordPlainText };
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Body() dto: UpdateStaffDto,
    @Req() req?: Request
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

      // Use staffManagementService which supports KYC documents
      const updated = await this.staffManagementService.updateStaff(clubId, staffId, {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        employeeId: dto.employeeId,
        aadharDocumentUrl: dto.aadharDocumentUrl,
        panDocumentUrl: dto.panDocumentUrl,
        customRoleName: dto.customRoleName,
      });

      // Audit log: Update staff
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.name !== undefined && dto.name !== existingStaff.name) {
            changes.push(`name: ${existingStaff.name} → ${dto.name}`);
          }
          if (dto.email !== undefined && dto.email !== existingStaff.email) {
            changes.push(`email: ${existingStaff.email || 'null'} → ${dto.email || 'null'}`);
          }
          if (dto.phone !== undefined && dto.phone !== existingStaff.phone) {
            changes.push(`phone: ${existingStaff.phone || 'null'} → ${dto.phone || 'null'}`);
          }
          if (dto.employeeId !== undefined) {
            changes.push('employeeId updated');
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'staff_updated',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Updated staff member ${existingStaff.name}: ${changes.join(', ')}`,
            targetType: 'staff',
            targetId: existingStaff.id,
            targetName: existingStaff.name,
            metadata: { 
              changes: changes,
              previousName: existingStaff.name,
              previousEmail: existingStaff.email
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff update:', auditError);
      }
      
      return { success: true, staff: updated };
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Req() req?: Request
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

      // Audit log: Delete staff (before deletion)
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'staff_deleted',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Deleted staff member ${existingStaff.name} (${existingStaff.role})${existingStaff.email ? ` (${existingStaff.email})` : ''}`,
            targetType: 'staff',
            targetId: existingStaff.id,
            targetName: existingStaff.name,
            metadata: { 
              email: existingStaff.email,
              role: existingStaff.role,
              employeeId: existingStaff.employeeId
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff deletion:', auditError);
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

  // =========================================================================
  // ENHANCED STAFF MANAGEMENT
  // =========================================================================

  /**
   * Create staff member with KYC and auto-generated password
   * POST /api/clubs/:clubId/staff-management/create
   */
  @Post(':clubId/staff-management/create')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async createStaffMember(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateStaffDto,
    @Req() req?: Request
  ) {
    try {
      const staff = await this.staffManagementService.createStaff(clubId, dto, userId);
      
      // Audit log: Create staff member (new)
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const actorStaff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: actorStaff?.id || userId,
            staffName: actorStaff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: actorStaff?.role || 'Admin',
            actionType: 'staff_member_created',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Created staff member ${staff.name} with role ${staff.role}${dto.email ? ` (${dto.email})` : ''}`,
            targetType: 'staff',
            targetId: staff.id,
            targetName: staff.name,
            metadata: { 
              email: dto.email,
              role: dto.role,
              employeeId: dto.employeeId
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff member creation:', auditError);
      }
      
      return { success: true, staff, message: 'Staff member created successfully' };
    } catch (error) {
      console.error('Error in createStaffMember:', error);
      throw error;
    }
  }

  /**
   * Get all staff with filters
   * GET /api/clubs/:clubId/staff-management
   */
  @Get(':clubId/staff-management')
  async getAllStaffMembers(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'name' | 'role',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    try {
      const staff = await this.staffManagementService.getAllStaff(clubId, {
        role: role as any,
        status: status as any,
        search,
        sortBy,
        sortOrder,
      });
      return { success: true, staff };
    } catch (error) {
      console.error('Error in getAllStaffMembers:', error);
      throw error;
    }
  }

  /**
   * Get staff member by ID
   * GET /api/clubs/:clubId/staff-management/:staffId
   */
  @Get(':clubId/staff-management/:staffId')
  async getStaffMember(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
  ) {
    try {
      const staff = await this.staffManagementService.getStaffById(clubId, staffId);
      return { success: true, staff };
    } catch (error) {
      console.error('Error in getStaffMember:', error);
      throw error;
    }
  }

  /**
   * Update staff member
   * PUT /api/clubs/:clubId/staff-management/:staffId
   */
  @Put(':clubId/staff-management/:staffId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async updateStaffMember(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Body() dto: Partial<CreateStaffDto>,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing staff for audit log
      const existingStaff = await this.staffManagementService.getStaffById(clubId, staffId);
      
      const staff = await this.staffManagementService.updateStaff(clubId, staffId, dto);
      
      // Audit log: Update staff member
      try {
        if (userId && existingStaff) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const actorStaff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.name !== undefined && dto.name !== existingStaff.name) {
            changes.push(`name: ${existingStaff.name} → ${dto.name}`);
          }
          if (dto.email !== undefined && dto.email !== existingStaff.email) {
            changes.push(`email: ${existingStaff.email || 'null'} → ${dto.email || 'null'}`);
          }
          if (dto.phone !== undefined && dto.phone !== existingStaff.phone) {
            changes.push(`phone: ${existingStaff.phone || 'null'} → ${dto.phone || 'null'}`);
          }
          if (dto.role !== undefined && dto.role !== existingStaff.role) {
            changes.push(`role: ${existingStaff.role} → ${dto.role}`);
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: actorStaff?.id || userId,
            staffName: actorStaff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: actorStaff?.role || 'Admin',
            actionType: 'staff_member_updated',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Updated staff member ${existingStaff.name}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'staff',
            targetId: existingStaff.id,
            targetName: existingStaff.name,
            metadata: { 
              changes: changes,
              previousName: existingStaff.name,
              previousEmail: existingStaff.email
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff member update:', auditError);
      }
      
      return { success: true, staff, message: 'Staff member updated successfully' };
    } catch (error) {
      console.error('Error in updateStaffMember:', error);
      throw error;
    }
  }

  /**
   * Suspend staff member
   * POST /api/clubs/:clubId/staff-management/:staffId/suspend
   */
  @Post(':clubId/staff-management/:staffId/suspend')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async suspendStaffMember(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: SuspendStaffDto,
    @Req() req?: Request
  ) {
    try {
      // Get existing staff for audit log
      const existingStaff = await this.staffManagementService.getStaffById(clubId, staffId);
      
      const staff = await this.staffManagementService.suspendStaff(clubId, staffId, dto.reason, userId);
      
      // Audit log: Suspend staff member
      try {
        if (userId && existingStaff) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const actorStaff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: actorStaff?.id || userId,
            staffName: actorStaff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: actorStaff?.role || 'Admin',
            actionType: 'staff_member_suspended',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Suspended staff member ${existingStaff.name} (${existingStaff.role}) - Reason: ${dto.reason}`,
            targetType: 'staff',
            targetId: existingStaff.id,
            targetName: existingStaff.name,
            metadata: { 
              email: existingStaff.email,
              role: existingStaff.role,
              reason: dto.reason
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff member suspension:', auditError);
      }
      
      return { success: true, staff, message: 'Staff member suspended successfully' };
    } catch (error) {
      console.error('Error in suspendStaffMember:', error);
      throw error;
    }
  }

  /**
   * Reactivate staff member
   * POST /api/clubs/:clubId/staff-management/:staffId/reactivate
   */
  @Post(':clubId/staff-management/:staffId/reactivate')
  async reactivateStaffMember(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing staff for audit log
      const existingStaff = await this.staffManagementService.getStaffById(clubId, staffId);
      
      const staff = await this.staffManagementService.reactivateStaff(clubId, staffId);
      
      // Audit log: Reactivate staff member
      try {
        if (userId && existingStaff) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const actorStaff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: actorStaff?.id || userId,
            staffName: actorStaff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: actorStaff?.role || 'Admin',
            actionType: 'staff_member_reactivated',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Reactivated staff member ${existingStaff.name} (${existingStaff.role})`,
            targetType: 'staff',
            targetId: existingStaff.id,
            targetName: existingStaff.name,
            metadata: { 
              email: existingStaff.email,
              role: existingStaff.role
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff member reactivation:', auditError);
      }
      
      return { success: true, staff, message: 'Staff member reactivated successfully' };
    } catch (error) {
      console.error('Error in reactivateStaffMember:', error);
      throw error;
    }
  }

  /**
   * Delete staff member
   * DELETE /api/clubs/:clubId/staff-management/:staffId
   */
  @Delete(':clubId/staff-management/:staffId')
  async deleteStaffMember(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing staff for audit log (before deletion)
      const existingStaff = await this.staffManagementService.getStaffById(clubId, staffId);
      
      const result = await this.staffManagementService.deleteStaff(clubId, staffId);
      
      // Audit log: Delete staff member
      try {
        if (userId && existingStaff) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const actorStaff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: actorStaff?.id || userId,
            staffName: actorStaff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: actorStaff?.role || 'Admin',
            actionType: 'staff_member_deleted',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Deleted staff member ${existingStaff.name} (${existingStaff.role})${existingStaff.email ? ` (${existingStaff.email})` : ''}`,
            targetType: 'staff',
            targetId: existingStaff.id,
            targetName: existingStaff.name,
            metadata: { 
              email: existingStaff.email,
              role: existingStaff.role,
              employeeId: existingStaff.employeeId
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff member deletion:', auditError);
      }
      
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error in deleteStaffMember:', error);
      throw error;
    }
  }

  /**
   * Reset staff password
   * POST /api/clubs/:clubId/staff-management/:staffId/reset-password
   */
  @Post(':clubId/staff-management/:staffId/reset-password')
  async resetStaffMemberPassword(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing staff for audit log
      const existingStaff = await this.staffManagementService.getStaffById(clubId, staffId);
      
      const result = await this.staffManagementService.resetStaffPassword(clubId, staffId);
      
      // Audit log: Reset staff password
      try {
        if (userId && existingStaff) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const actorStaff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: actorStaff?.id || userId,
            staffName: actorStaff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: actorStaff?.role || 'Admin',
            actionType: 'staff_password_reset',
            actionCategory: ActionCategory.STAFF_MANAGEMENT,
            description: `Reset password for staff member ${existingStaff.name} (${existingStaff.role})`,
            targetType: 'staff',
            targetId: existingStaff.id,
            targetName: existingStaff.name,
            metadata: { 
              email: existingStaff.email,
              role: existingStaff.role
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff password reset:', auditError);
      }
      
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in resetStaffMemberPassword:', error);
      throw error;
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
    @Body() dto: CreateCreditRequestDto,
    @Req() req?: Request
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

      const creditRequest = await this.creditRequestsService.create(clubId, {
        playerId: dto.playerId.trim(),
        playerName: dto.playerName.trim(),
        amount: amount,
        notes: dto.notes?.trim() || undefined
      });
      
      // Audit log: Create credit request
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'credit_request_created',
            actionCategory: ActionCategory.CREDIT,
            description: `Created credit request for ${dto.playerName.trim()} - Amount: ₹${amount.toLocaleString('en-IN')}${dto.notes ? `, Notes: ${dto.notes.trim()}` : ''}`,
            targetType: 'credit_request',
            targetId: creditRequest.id,
            targetName: dto.playerName.trim(),
            metadata: { 
              playerId: dto.playerId.trim(),
              playerName: dto.playerName.trim(),
              amount: amount,
              notes: dto.notes?.trim()
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for credit request creation:', auditError);
      }
      
      return creditRequest;
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto?: ApproveCreditDto,
    @Req() req?: Request
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

      // Audit log: Approve credit request
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'credit_request_approved',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Approved credit request of ₹${creditRequest.amount} for player ${creditRequest.playerName}${creditLimit ? ` with limit ₹${creditLimit}` : ''}`,
            targetType: 'player',
            targetId: creditRequest.playerId,
            targetName: creditRequest.playerName,
            metadata: { 
              requestId: requestId,
              amount: creditRequest.amount,
              creditLimit: creditLimit || approvedRequest.limit,
              previousLimit: creditRequest.limit
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for credit approval:', auditError);
        // Don't fail the request if audit logging fails
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Req() req?: Request
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

      // Audit log: Deny credit request
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'credit_request_denied',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Denied credit request of ₹${creditRequest.amount} for player ${creditRequest.playerName}`,
            targetType: 'player',
            targetId: creditRequest.playerId,
            targetName: creditRequest.playerName,
            metadata: { 
              requestId: requestId,
              amount: creditRequest.amount
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for credit denial:', auditError);
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: UpdateCreditVisibilityDto,
    @Req() req?: Request
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

      const updatedRequest = await this.creditRequestsService.updateVisibility(requestId, clubId, dto.visible);

      // Audit log: Update credit visibility
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'credit_visibility_updated',
            actionCategory: ActionCategory.FINANCIAL,
            description: `${dto.visible ? 'Made' : 'Hidden'} credit request of ₹${creditRequest.amount} ${dto.visible ? 'visible' : 'invisible'} to player ${creditRequest.playerName}`,
            targetType: 'player',
            targetId: creditRequest.playerId,
            targetName: creditRequest.playerName,
            metadata: { 
              requestId: requestId,
              amount: creditRequest.amount,
              visible: dto.visible
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for credit visibility update:', auditError);
      }

      return updatedRequest;
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: UpdateCreditLimitDto,
    @Req() req?: Request
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

      const previousLimit = creditRequest.limit;
      const updatedRequest = await this.creditRequestsService.updateLimit(requestId, clubId, limit);

      // Audit log: Update credit limit
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'credit_limit_updated',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Updated credit limit for player ${creditRequest.playerName} from ₹${previousLimit} to ₹${limit}`,
            targetType: 'player',
            targetId: creditRequest.playerId,
            targetName: creditRequest.playerName,
            metadata: { 
              requestId: requestId,
              previousLimit: previousLimit,
              newLimit: limit
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for credit limit update:', auditError);
      }

      return updatedRequest;
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
      throw e;
      }
      throw new BadRequestException(`Failed to update credit limit: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Enable credit feature for a player
   * POST /api/clubs/:id/players/:playerId/enable-credit
   */
  @Post(':id/players/:playerId/enable-credit')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async enableCreditForPlayer(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('playerId', new ParseUUIDPipe()) playerId: string,
    @Body() dto: { creditLimit: number },
    @Req() req?: Request
  ) {
    try {
      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      // Validate credit limit
      if (!dto.creditLimit || dto.creditLimit <= 0) {
        throw new BadRequestException('Credit limit must be a positive number');
      }
      if (dto.creditLimit > 10000000) {
        throw new BadRequestException('Credit limit cannot exceed ₹10,000,000');
      }

      // Find player
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Check KYC status
      const kycStatus = (player as any).kycStatus || 'pending';
      if (kycStatus !== 'approved' && kycStatus !== 'verified') {
        throw new BadRequestException('Player must complete KYC verification before credit can be enabled');
      }

      // Enable credit
      (player as any).creditEnabled = true;
      (player as any).creditLimit = dto.creditLimit;
      (player as any).creditEnabledBy = userId || null;
      (player as any).creditEnabledAt = new Date();

      await this.playersRepo.save(player);

      // Audit log: Enable credit for player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'credit_enabled',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Enabled credit for player ${player.name} with limit ₹${dto.creditLimit}`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              creditLimit: dto.creditLimit,
              kycStatus: kycStatus
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for enable credit:', auditError);
      }

      return {
        message: 'Credit feature enabled successfully',
        player: {
          id: player.id,
          name: player.name,
          creditEnabled: true,
          creditLimit: dto.creditLimit
        }
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to enable credit: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Update credit limit for a player
   * PATCH /api/clubs/:id/players/:playerId/credit-limit
   */
  @Patch(':id/players/:playerId/credit-limit')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePlayerCreditLimit(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('playerId', new ParseUUIDPipe()) playerId: string,
    @Body() dto: { creditLimit: number },
    @Req() req?: Request
  ) {
    try {
      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      // Validate credit limit
      if (!dto.creditLimit || dto.creditLimit <= 0) {
        throw new BadRequestException('Credit limit must be a positive number');
      }
      if (dto.creditLimit > 10000000) {
        throw new BadRequestException('Credit limit cannot exceed ₹10,000,000');
      }

      // Find player
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Check if credit is enabled
      if (!(player as any).creditEnabled) {
        throw new BadRequestException('Credit feature is not enabled for this player');
      }

      // Update credit limit
      const previousLimit = (player as any).creditLimit || 0;
      (player as any).creditLimit = dto.creditLimit;
      await this.playersRepo.save(player);

      // Audit log: Update player credit limit
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_credit_limit_updated',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Updated credit limit for player ${player.name} from ₹${previousLimit} to ₹${dto.creditLimit}`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              previousLimit: previousLimit,
              newLimit: dto.creditLimit
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player credit limit update:', auditError);
      }

      return {
        message: 'Credit limit updated successfully',
        player: {
          id: player.id,
          name: player.name,
          creditLimit: dto.creditLimit
        }
      };
    } catch (e) {
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateTransactionDto,
    @Req() req?: Request
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

      const transaction = await this.financialTransactionsService.create(clubId, {
        ...dto,
        playerName: dto.playerName.trim(),
        amount: amount
      });

      // Audit log: Create transaction
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'transaction_created',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Created ${dto.type} transaction of ₹${amount} for player ${dto.playerName.trim()}`,
            targetType: 'player',
            targetId: transaction.playerId || dto.playerId,
            targetName: dto.playerName.trim(),
            metadata: { 
              transactionId: transaction.id,
              type: dto.type,
              amount: amount,
              status: transaction.status
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for transaction creation:', auditError);
      }

      return transaction;
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() dto: UpdateTransactionDto,
    @Req() req?: Request
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

      const previousAmount = transaction.amount;
      const previousStatus = transaction.status;
      const updatedTransaction = await this.financialTransactionsService.update(transactionId, clubId, {
        amount: dto.amount,
        notes: dto.notes?.trim(),
        status: dto.status
      });

      // Audit log: Update transaction
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.amount !== undefined && dto.amount !== previousAmount) {
            changes.push(`amount: ₹${previousAmount} → ₹${dto.amount}`);
          }
          if (dto.status !== undefined && dto.status !== previousStatus) {
            changes.push(`status: ${previousStatus} → ${dto.status}`);
          }
          if (dto.notes !== undefined) {
            changes.push('notes updated');
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'transaction_updated',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Updated transaction ${transactionId} for player ${transaction.playerName}: ${changes.join(', ')}`,
            targetType: 'player',
            targetId: transaction.playerId,
            targetName: transaction.playerName,
            metadata: { 
              transactionId: transactionId,
              previousAmount: previousAmount,
              newAmount: dto.amount,
              previousStatus: previousStatus,
              newStatus: dto.status
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for transaction update:', auditError);
      }

      return updatedTransaction;
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Req() req?: Request
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

      const cancelledTransaction = await this.financialTransactionsService.cancel(transactionId, clubId);

      // Audit log: Cancel transaction
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'transaction_cancelled',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Cancelled ${transaction.type} transaction of ₹${transaction.amount} for player ${transaction.playerName}`,
            targetType: 'player',
            targetId: transaction.playerId,
            targetName: transaction.playerName,
            metadata: { 
              transactionId: transactionId,
              type: transaction.type,
              amount: transaction.amount,
              previousStatus: transaction.status
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for transaction cancellation:', auditError);
      }

      return cancelledTransaction;
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
    @Body() dto: CreateVipProductDto,
    @Req() req?: Request
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

      const product = await this.vipProductsService.create(clubId, {
        title: dto.title.trim(),
        points: points,
        description: dto.description?.trim() || undefined,
        images: dto.images || [],
        stock: dto.stock || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });
      
      // Audit log: Create VIP product
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'vip_product_created',
            actionCategory: ActionCategory.SYSTEM,
            description: `Created VIP product: ${dto.title.trim()} (Points: ${points}, Stock: ${dto.stock || 0})`,
            targetType: 'vip_product',
            targetId: product.id,
            targetName: dto.title.trim(),
            metadata: { 
              title: dto.title.trim(),
              points: points,
              stock: dto.stock || 0,
              isActive: dto.isActive !== undefined ? dto.isActive : true
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for VIP product creation:', auditError);
      }
      
      return product;
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
    @Body() dto: UpdateVipProductDto,
    @Req() req?: Request
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      
      // Get existing product for audit log
      const existingProduct = await this.vipProductsService.findOne(productId, clubId);
      
      const product = await this.vipProductsService.update(productId, clubId, dto);
      
      // Audit log: Update VIP product
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId && existingProduct) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.title !== undefined && dto.title !== existingProduct.title) {
            changes.push(`title: ${existingProduct.title} → ${dto.title}`);
          }
          if (dto.points !== undefined && dto.points !== existingProduct.points) {
            changes.push(`points: ${existingProduct.points} → ${dto.points}`);
          }
          if (dto.stock !== undefined && dto.stock !== existingProduct.stock) {
            changes.push(`stock: ${existingProduct.stock} → ${dto.stock}`);
          }
          if (dto.isActive !== undefined && dto.isActive !== existingProduct.isActive) {
            changes.push(`isActive: ${existingProduct.isActive} → ${dto.isActive}`);
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'SUPER_ADMIN',
            actionType: 'vip_product_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated VIP product ${existingProduct.title}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'vip_product',
            targetId: productId,
            targetName: existingProduct.title,
            metadata: { 
              changes: changes,
              productTitle: existingProduct.title
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for VIP product update:', auditError);
      }
      
      return product;
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
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Req() req?: Request
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      
      // Get existing product for audit log (before deletion)
      const existingProduct = await this.vipProductsService.findOne(productId, clubId);
      
      await this.vipProductsService.remove(productId, clubId);
      
      // Audit log: Delete VIP product
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId && existingProduct) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'SUPER_ADMIN',
            actionType: 'vip_product_deleted',
            actionCategory: ActionCategory.SYSTEM,
            description: `Deleted VIP product: ${existingProduct.title} (Points: ${existingProduct.points}, Stock: ${existingProduct.stock})`,
            targetType: 'vip_product',
            targetId: productId,
            targetName: existingProduct.title,
            metadata: { 
              productTitle: existingProduct.title,
              points: existingProduct.points,
              stock: existingProduct.stock
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for VIP product deletion:', auditError);
      }
    } catch (e) {
      throw e;
    }
  }

  /**
   * Create upload URL for VIP product image
   * POST /api/clubs/:id/vip-products/upload-url
   */
  @Post(':id/vip-products/upload-url')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async createVipProductImageUploadUrl(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() body?: { filename?: string }
  ) {
    try {
      // Validate club exists
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // For Super Admin, validate tenant
      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      // For club-scoped users, validate they can only upload for their club
      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only upload images for your assigned club');
      }

      const filename = body?.filename || `image-${Date.now()}.jpg`;
      return await this.storageService.createVipStoreUploadUrl(clubId, filename);
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to create upload URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ========== Push Notifications ==========
  @Get(':id/push-notifications')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  async listPushNotifications(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('notificationType') notificationType?: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only access notifications from your assigned club');
      }

      return await this.pushNotificationsService.findAll(clubId, notificationType as any);
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to list push notifications: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/push-notifications')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createPushNotification(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreatePushNotificationDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only create notifications for your assigned club');
      }

      const notification = await this.pushNotificationsService.create(clubId, {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        createdBy: userId || undefined,
      });
      
      // Audit log: Create push notification
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'push_notification_created',
            actionCategory: ActionCategory.SYSTEM,
            description: `Created push notification: ${dto.title || 'Untitled'}${dto.scheduledAt ? ` (Scheduled: ${new Date(dto.scheduledAt).toLocaleString()})` : ''}`,
            targetType: 'push_notification',
            targetId: notification.id,
            targetName: dto.title || 'Untitled',
            metadata: { 
              title: dto.title,
              scheduledAt: dto.scheduledAt,
              targetType: dto.targetType
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for push notification creation:', auditError);
      }
      
      return notification;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof ConflictException) {
        throw e;
      }
      throw new BadRequestException(`Failed to create push notification: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Put(':id/push-notifications/:notificationId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  async updatePushNotification(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
    @Body() dto: UpdatePushNotificationDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only update notifications for your assigned club');
      }

      // Get existing notification for audit log
      const existingNotification = await this.pushNotificationsService.findOne(notificationId, clubId);
      
      const notification = await this.pushNotificationsService.update(notificationId, clubId, {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      });
      
      // Audit log: Update push notification
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId && existingNotification) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.title !== undefined && dto.title !== existingNotification.title) {
            changes.push(`title: ${existingNotification.title} → ${dto.title}`);
          }
          if (dto.scheduledAt !== undefined) {
            changes.push(`scheduledAt: ${existingNotification.scheduledAt ? new Date(existingNotification.scheduledAt).toLocaleString() : 'N/A'} → ${new Date(dto.scheduledAt).toLocaleString()}`);
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'push_notification_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated push notification ${existingNotification.title || 'Untitled'}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'push_notification',
            targetId: notificationId,
            targetName: existingNotification.title || 'Untitled',
            metadata: { 
              changes: changes,
              notificationTitle: existingNotification.title
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for push notification update:', auditError);
      }
      
      return notification;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to update push notification: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Delete(':id/push-notifications/:notificationId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePushNotification(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only delete notifications for your assigned club');
      }

      // Get existing notification for audit log (before deletion)
      const existingNotification = await this.pushNotificationsService.findOne(notificationId, clubId);
      
      await this.pushNotificationsService.remove(notificationId, clubId);
      
      // Audit log: Delete push notification
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId && existingNotification) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'push_notification_deleted',
            actionCategory: ActionCategory.SYSTEM,
            description: `Deleted push notification: ${existingNotification.title || 'Untitled'}`,
            targetType: 'push_notification',
            targetId: notificationId,
            targetName: existingNotification.title || 'Untitled',
            metadata: { 
              notificationTitle: existingNotification.title,
              scheduledAt: existingNotification.scheduledAt
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for push notification deletion:', auditError);
      }
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to delete push notification: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/push-notifications/:notificationId/send')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  @HttpCode(HttpStatus.OK)
  async sendPushNotification(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only send notifications for your assigned club');
      }

      // Get notification for audit log
      const notification = await this.pushNotificationsService.findOne(notificationId, clubId);
      
      const result = await this.pushNotificationsService.sendNotification(notificationId, clubId);
      
      // Audit log: Send push notification
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId && notification) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'push_notification_sent',
            actionCategory: ActionCategory.SYSTEM,
            description: `Sent push notification: ${notification.title || 'Untitled'}`,
            targetType: 'push_notification',
            targetId: notificationId,
            targetName: notification.title || 'Untitled',
            metadata: { 
              notificationTitle: notification.title,
              targetType: notification.targetType
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for push notification send:', auditError);
      }
      
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to send push notification: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/notifications/inbox')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.DEALER, ClubRole.HR, ClubRole.FNB, ClubRole.GRE)
  async getNotificationInbox(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('recipientType') recipientType?: 'staff' | 'player'
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only access notifications for your assigned club');
      }

      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const type = recipientType || 'staff';
      return await this.pushNotificationsService.getInboxNotifications(clubId, userId, type);
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get notifications: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/notifications/unread-count')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.DEALER, ClubRole.HR, ClubRole.FNB, ClubRole.GRE)
  async getUnreadNotificationCount(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('recipientType') recipientType?: 'staff' | 'player'
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only access notifications for your assigned club');
      }

      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const type = recipientType || 'staff';
      const count = await this.pushNotificationsService.getUnreadCount(clubId, userId, type);
      return { unreadCount: count };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get unread count: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/notifications/:notificationId/mark-read')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.DEALER, ClubRole.HR, ClubRole.FNB, ClubRole.GRE)
  @HttpCode(HttpStatus.OK)
  async markNotificationAsRead(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
    @Body() body?: { recipientType?: 'staff' | 'player' },
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only mark notifications for your assigned club');
      }

      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const type = body?.recipientType || 'staff';
      const result = await this.pushNotificationsService.markAsRead(clubId, notificationId, userId, type);
      
      // Audit log: Mark notification as read
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'notification_marked_read',
            actionCategory: ActionCategory.SYSTEM,
            description: `Marked notification as read (ID: ${notificationId}, Type: ${type})`,
            targetType: 'push_notification',
            targetId: notificationId,
            targetName: `Notification ${notificationId}`,
            metadata: { 
              notificationId: notificationId,
              recipientType: type
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for mark notification as read:', auditError);
      }
      
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to mark notification as read: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/notifications/mark-all-read')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.DEALER, ClubRole.HR, ClubRole.FNB, ClubRole.GRE)
  @HttpCode(HttpStatus.OK)
  async markAllNotificationsAsRead(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() body?: { recipientType?: 'staff' | 'player' },
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only mark notifications for your assigned club');
      }

      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const type = body?.recipientType || 'staff';
      const result = await this.pushNotificationsService.markAllAsRead(clubId, userId, type);
      
      // Audit log: Mark all notifications as read
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'all_notifications_marked_read',
            actionCategory: ActionCategory.SYSTEM,
            description: `Marked all notifications as read (Type: ${type})`,
            targetType: 'push_notification',
            targetId: 'all',
            targetName: `All ${type} notifications`,
            metadata: { 
              recipientType: type
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for mark all notifications as read:', auditError);
      }
      
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to mark all notifications as read: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/push-notifications/upload-url')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  async createPushNotificationUploadUrl(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() body?: { filename?: string; isVideo?: boolean }
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) throw new NotFoundException('Club not found');

      if (tenantId && !headerClubId) {
        await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      }

      if (headerClubId && headerClubId !== clubId) {
        throw new ForbiddenException('You can only upload files for your assigned club');
      }

      const filename = body?.filename || `file-${Date.now()}.${body?.isVideo ? 'mp4' : 'jpg'}`;
      return await this.storageService.createPushNotificationUploadUrl(clubId, filename, body?.isVideo || false);
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to create upload URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateWaitlistEntryDto,
    @Req() req?: Request
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

      const waitlistEntry = await this.waitlistSeatingService.createWaitlistEntry(clubId, {
        playerName: dto.playerName.trim(),
        playerId: dto.playerId?.trim(),
        phoneNumber: dto.phoneNumber?.trim(),
        email: dto.email?.trim(),
        partySize: dto.partySize,
        priority: dto.priority,
        notes: dto.notes?.trim(),
        tableType: dto.tableType?.trim()
      });

      // Audit log: Create waitlist entry
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'waitlist_entry_created',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Created waitlist entry for ${dto.playerName}${dto.partySize ? ` (Party: ${dto.partySize})` : ''}${dto.tableType ? ` - Table Type: ${dto.tableType}` : ''}`,
            targetType: 'waitlist',
            targetId: waitlistEntry.id,
            targetName: dto.playerName,
            metadata: { 
              playerName: dto.playerName,
              playerId: dto.playerId,
              partySize: dto.partySize,
              priority: dto.priority,
              tableType: dto.tableType
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for waitlist entry creation:', auditError);
      }

      return waitlistEntry;
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Body() dto: UpdateWaitlistEntryDto,
    @Req() req?: Request
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

      // Audit log: Update waitlist entry
      try {
        if (userId && existingEntry) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.partySize !== undefined && dto.partySize !== existingEntry.partySize) {
            changes.push(`partySize: ${existingEntry.partySize} → ${dto.partySize}`);
          }
          if (dto.priority !== undefined && dto.priority !== existingEntry.priority) {
            changes.push(`priority: ${existingEntry.priority} → ${dto.priority}`);
          }
          if (dto.notes !== undefined) {
            changes.push('notes updated');
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'waitlist_entry_updated',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Updated waitlist entry for ${existingEntry.playerName}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'waitlist',
            targetId: existingEntry.id,
            targetName: existingEntry.playerName,
            metadata: { 
              changes: changes,
              playerName: existingEntry.playerName
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for waitlist entry update:', auditError);
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Req() req?: Request
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

      // Audit log: Cancel waitlist entry
      try {
        if (userId && entry) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'waitlist_entry_cancelled',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Cancelled waitlist entry for ${entry.playerName}${entry.partySize ? ` (Party: ${entry.partySize})` : ''}`,
            targetType: 'waitlist',
            targetId: entry.id,
            targetName: entry.playerName,
            metadata: { 
              playerName: entry.playerName,
              partySize: entry.partySize,
              priority: entry.priority
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for waitlist entry cancellation:', auditError);
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Req() req?: Request
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

      // Audit log: Delete waitlist entry (before deletion)
      try {
        if (userId && entry) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'waitlist_entry_deleted',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Deleted waitlist entry for ${entry.playerName}${entry.partySize ? ` (Party: ${entry.partySize})` : ''}`,
            targetType: 'waitlist',
            targetId: entry.id,
            targetName: entry.playerName,
            metadata: { 
              playerName: entry.playerName,
              partySize: entry.partySize,
              status: entry.status
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for waitlist entry deletion:', auditError);
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
    @Body() dto: AssignSeatDto,
    @Req() req?: Request
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

      // Audit log: Assign seat
      try {
        if (userId && entry && table) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'seat_assigned',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Assigned seat for ${entry.playerName} to Table ${table.tableNumber}${entry.partySize ? ` (Party: ${entry.partySize})` : ''}`,
            targetType: 'waitlist',
            targetId: entry.id,
            targetName: entry.playerName,
            metadata: { 
              playerName: entry.playerName,
              tableId: dto.tableId,
              tableNumber: table.tableNumber,
              partySize: entry.partySize
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for seat assignment:', auditError);
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Req() req?: Request
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

      // Audit log: Unseat player
      try {
        if (userId && entry) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_unseated',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Unseated player ${entry.playerName} from Table ${entry.tableNumber || 'Unknown'}`,
            targetType: 'waitlist',
            targetId: entry.id,
            targetName: entry.playerName,
            metadata: { 
              playerName: entry.playerName,
              tableNumber: entry.tableNumber
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player unseat:', auditError);
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateTableDto,
    @Req() req?: Request
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

      const table = await this.waitlistSeatingService.createTable(clubId, {
        tableNumber: dto.tableNumber,
        tableType: dto.tableType,
        maxSeats: dto.maxSeats,
        minBuyIn: dto.minBuyIn,
        maxBuyIn: dto.maxBuyIn,
        notes: dto.notes
      });

      // Audit log: Create table
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'table_created',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Created table ${dto.tableNumber} (Type: ${dto.tableType}, Max Seats: ${dto.maxSeats}${dto.minBuyIn ? `, Min Buy-in: ₹${dto.minBuyIn}` : ''}${dto.maxBuyIn ? `, Max Buy-in: ₹${dto.maxBuyIn}` : ''})`,
            targetType: 'table',
            targetId: table.id,
            targetName: `Table ${dto.tableNumber}`,
            metadata: { 
              tableNumber: dto.tableNumber,
              tableType: dto.tableType,
              maxSeats: dto.maxSeats,
              minBuyIn: dto.minBuyIn,
              maxBuyIn: dto.maxBuyIn
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for table creation:', auditError);
      }

      return table;
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
            // Rummy-specific fields (nullable, so poker tables are unaffected)
            rummyVariant: table.rummyVariant || null,
            pointsValue: table.pointsValue ? Number(table.pointsValue) : null,
            numberOfDeals: table.numberOfDeals || null,
            dropPoints: table.dropPoints || null,
            maxPoints: table.maxPoints || null,
            dealDuration: table.dealDuration || null,
            entryFee: table.entryFee ? Number(table.entryFee) : null,
            minPlayers: table.minPlayers || null,
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
    @Body() dto: UpdateTableDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      
      // Get existing table for audit log
      const existingTable = await this.waitlistSeatingService.getTable(clubId, tableId);
      
      const updateData: any = { ...dto };
      if (dto.reservedUntil) {
        updateData.reservedUntil = new Date(dto.reservedUntil);
      }
      const updatedTable = await this.waitlistSeatingService.updateTable(clubId, tableId, updateData);

      // Audit log: Update table
      try {
        if (userId && existingTable) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.status !== undefined && dto.status !== existingTable.status) {
            changes.push(`status: ${existingTable.status} → ${dto.status}`);
          }
          if (dto.maxSeats !== undefined && dto.maxSeats !== existingTable.maxSeats) {
            changes.push(`maxSeats: ${existingTable.maxSeats} → ${dto.maxSeats}`);
          }
          if (dto.minBuyIn !== undefined && dto.minBuyIn !== existingTable.minBuyIn) {
            changes.push(`minBuyIn: ₹${existingTable.minBuyIn || 0} → ₹${dto.minBuyIn || 0}`);
          }
          if (dto.maxBuyIn !== undefined && dto.maxBuyIn !== existingTable.maxBuyIn) {
            changes.push(`maxBuyIn: ₹${existingTable.maxBuyIn || 0} → ₹${dto.maxBuyIn || 0}`);
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Super Admin',
            actionType: 'table_updated',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Updated table ${existingTable.tableNumber}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'table',
            targetId: existingTable.id,
            targetName: `Table ${existingTable.tableNumber}`,
            metadata: { 
              changes: changes,
              tableNumber: existingTable.tableNumber
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for table update:', auditError);
      }
      
      return updatedTable;
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
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Req() req?: Request
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

      // Audit log: Delete table (before deletion)
      try {
        if (userId && table) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'table_deleted',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Deleted table ${table.tableNumber} (Type: ${table.tableType}, Max Seats: ${table.maxSeats})`,
            targetType: 'table',
            targetId: table.id,
            targetName: `Table ${table.tableNumber}`,
            metadata: { 
              tableNumber: table.tableNumber,
              tableType: table.tableType,
              maxSeats: table.maxSeats
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for table deletion:', auditError);
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

  /**
   * Pause table session
   * POST /api/clubs/:id/tables/:tableId/pause-session
   */
  @Post(':id/tables/:tableId/pause-session')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async pauseTableSession(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Req() req?: Request
  ) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(tableId)) {
        throw new BadRequestException('Invalid table ID format');
      }

      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException(`Club with ID ${clubId} not found`);
      }

      if (tenantId && club.tenant.id !== tenantId.trim()) {
        throw new ForbiddenException('You do not have permission to access this club');
      }

      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('Club ID mismatch');
      }

      const table = await this.waitlistSeatingService.getTable(clubId, tableId);
      if (!table) {
        throw new NotFoundException(`Table with ID ${tableId} not found`);
      }

      // Update table status to AVAILABLE (paused)
      await this.waitlistSeatingService.updateTableStatus(clubId, tableId, TableStatus.AVAILABLE);
      
      // Calculate and store elapsed time when pausing
      const currentNotes = table.notes || '';
      const sessionStartMatch = currentNotes.match(/Session Started: ([^|]+)/);
      
      if (sessionStartMatch) {
        const sessionStartTime = new Date(sessionStartMatch[1]);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        
        // Remove old session data and add paused elapsed time
        let updatedNotes = currentNotes
          .replace(/Session Started: [^|]+\|?/g, '')
          .replace(/Paused Elapsed: \d+\|?/g, '')
          .trim();
        
        if (updatedNotes && !updatedNotes.endsWith('|')) {
          updatedNotes += ' | ';
        }
        updatedNotes += `Paused Elapsed: ${elapsedSeconds}`;
        
        await this.waitlistSeatingService.updateTableNotes(clubId, tableId, updatedNotes);
      }

      // Audit log: Pause session
      try {
        if (userId && table) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'session_paused',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Paused session for table ${table.tableNumber}`,
            targetType: 'table',
            targetId: table.id,
            targetName: `Table ${table.tableNumber}`,
            metadata: { 
              tableNumber: table.tableNumber,
              previousStatus: table.status,
              newStatus: TableStatus.AVAILABLE
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for session pause:', auditError);
      }

      return {
        message: 'Table session paused successfully',
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          status: TableStatus.AVAILABLE,
        },
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof BadRequestException) {
        throw e;
      }
      console.error('Error pausing table session:', e);
      throw new BadRequestException(`Failed to pause table session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Resume table session
   * POST /api/clubs/:id/tables/:tableId/resume-session
   */
  @Post(':id/tables/:tableId/resume-session')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async resumeTableSession(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Req() req?: Request
  ) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(tableId)) {
        throw new BadRequestException('Invalid table ID format');
      }

      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException(`Club with ID ${clubId} not found`);
      }

      if (tenantId && club.tenant.id !== tenantId.trim()) {
        throw new ForbiddenException('You do not have permission to access this club');
      }

      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('Club ID mismatch');
      }

      const table = await this.waitlistSeatingService.getTable(clubId, tableId);
      if (!table) {
        throw new NotFoundException(`Table with ID ${tableId} not found`);
      }

      // Update table status to OCCUPIED and add session start time
      await this.waitlistSeatingService.updateTableStatus(clubId, tableId, TableStatus.OCCUPIED);
      
      // Handle session start/resume with paused time tracking
      const sessionStartTime = new Date().toISOString();
      const currentNotes = table.notes || '';
      
      // Check if there's a paused elapsed time
      const pausedElapsedMatch = currentNotes.match(/Paused Elapsed: (\d+)/);
      const pausedElapsedSeconds = pausedElapsedMatch ? parseInt(pausedElapsedMatch[1], 10) : 0;
      
      // Remove old session data
      let updatedNotes = currentNotes
        .replace(/Session Started: [^|]+\|?/g, '')
        .replace(/Paused Elapsed: \d+\|?/g, '')
        .trim();
      
      if (updatedNotes && !updatedNotes.endsWith('|')) {
        updatedNotes += ' | ';
      }
      
      // Add new session start time and paused elapsed time (if resuming)
      updatedNotes += `Session Started: ${sessionStartTime}`;
      if (pausedElapsedSeconds > 0) {
        updatedNotes += ` | Paused Elapsed: ${pausedElapsedSeconds}`;
      }
      
      await this.waitlistSeatingService.updateTableNotes(clubId, tableId, updatedNotes);

      // Audit log: Resume session
      try {
        if (userId && table) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'session_resumed',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Resumed session for table ${table.tableNumber}${pausedElapsedSeconds > 0 ? ` (${pausedElapsedSeconds}s paused)` : ''}`,
            targetType: 'table',
            targetId: table.id,
            targetName: `Table ${table.tableNumber}`,
            metadata: { 
              tableNumber: table.tableNumber,
              previousStatus: table.status,
              newStatus: TableStatus.OCCUPIED,
              pausedElapsedSeconds
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for session resume:', auditError);
      }

      return {
        message: 'Table session resumed successfully',
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          status: TableStatus.OCCUPIED,
          notes: updatedNotes,
        },
        sessionStartTime,
        pausedElapsedSeconds,
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof BadRequestException) {
        throw e;
      }
      console.error('Error resuming table session:', e);
      throw new BadRequestException(`Failed to resume table session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * End table session
   * POST /api/clubs/:id/tables/:tableId/end-session
   */
  @Post(':id/tables/:tableId/end-session')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async endTableSession(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Req() req?: Request
  ) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(tableId)) {
        throw new BadRequestException('Invalid table ID format');
      }

      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException(`Club with ID ${clubId} not found`);
      }

      if (tenantId && club.tenant.id !== tenantId.trim()) {
        throw new ForbiddenException('You do not have permission to access this club');
      }

      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('Club ID mismatch');
      }

      const table = await this.waitlistSeatingService.getTable(clubId, tableId);
      if (!table) {
        throw new NotFoundException(`Table with ID ${tableId} not found`);
      }

      // Update table status to CLOSED and reset current seats
      await this.waitlistSeatingService.updateTableStatus(clubId, tableId, TableStatus.CLOSED);
      await this.waitlistSeatingService.resetTableSeats(clubId, tableId);
      
      // Clear all session data (reset timer to 0)
      const currentNotes = table.notes || '';
      let updatedNotes = currentNotes
        .replace(/Session Started: [^|]+\|?/g, '')
        .replace(/Paused Elapsed: \d+\|?/g, '')
        .trim();
      
      // Clean up any trailing pipes
      updatedNotes = updatedNotes.replace(/\|\s*\|/g, '|').replace(/^\|\s*|\s*\|$/g, '').trim();
      
      await this.waitlistSeatingService.updateTableNotes(clubId, tableId, updatedNotes);

      // Audit log: End session
      try {
        if (userId && table) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'session_ended',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Ended session for table ${table.tableNumber} (Reset seats: ${table.currentSeats || 0} → 0)`,
            targetType: 'table',
            targetId: table.id,
            targetName: `Table ${table.tableNumber}`,
            metadata: { 
              tableNumber: table.tableNumber,
              previousStatus: table.status,
              newStatus: TableStatus.CLOSED,
              previousSeats: table.currentSeats || 0
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for session end:', auditError);
      }

      return {
        message: 'Table session ended successfully',
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          status: TableStatus.CLOSED,
          currentSeats: 0,
          notes: updatedNotes,
        },
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof BadRequestException) {
        throw e;
      }
      console.error('Error ending table session:', e);
      throw new BadRequestException(`Failed to end table session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Update table session parameters
   * PATCH /api/clubs/:id/tables/:tableId/session-params
   */
  @Patch(':id/tables/:tableId/session-params')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateSessionParams(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Body() dto: UpdateSessionParamsDto
  ) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(tableId)) {
        throw new BadRequestException('Invalid table ID format');
      }

      if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || !tenantId.trim()) {
          throw new BadRequestException('x-tenant-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(tenantId.trim())) {
          throw new BadRequestException('Invalid tenant ID format');
        }
      }

      if (headerClubId !== undefined && headerClubId !== null) {
        if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
          throw new BadRequestException('x-club-id header must be a non-empty string if provided');
        }
        if (!uuidRegex.test(headerClubId.trim())) {
          throw new BadRequestException('Invalid club ID format in header');
        }
      }

      if (!tenantId && !headerClubId) {
        throw new BadRequestException('x-club-id header is required for club-scoped roles');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException(`Club with ID ${clubId} not found`);
      }

      if (tenantId && club.tenant.id !== tenantId.trim()) {
        throw new ForbiddenException('You do not have permission to access this club');
      }

      if (headerClubId && headerClubId.trim() !== clubId) {
        throw new ForbiddenException('Club ID mismatch');
      }

      const table = await this.waitlistSeatingService.getTable(clubId, tableId);
      if (!table) {
        throw new NotFoundException(`Table with ID ${tableId} not found`);
      }

      // Parse existing notes to preserve other data
      const noteParts = table.notes ? table.notes.split('|').map(p => p.trim()) : [];
      const tableName = noteParts[0] || `Table ${table.tableNumber}`;
      const gameType = noteParts[1] || table.tableType;
      const stakes = noteParts[2]?.replace('Stakes:', '').trim() || '';
      
      // Update session parameters
      const minPlayTime = dto.minPlayTime !== undefined ? dto.minPlayTime : (noteParts[3]?.match(/\d+/)?.[0] || '30');
      const callTime = dto.callTime !== undefined ? dto.callTime : (noteParts[4]?.match(/\d+/)?.[0] || '5');
      const cashOutWindow = dto.cashOutWindow !== undefined ? dto.cashOutWindow : (noteParts[5]?.match(/\d+/)?.[0] || '10');
      const sessionTimeout = dto.sessionTimeout !== undefined ? dto.sessionTimeout : (noteParts[6]?.match(/\d+/)?.[0] || '120');

      // Rebuild notes with updated parameters
      const updatedNotes = `${tableName} | ${gameType} | Stakes: ${stakes} | Min Play: ${minPlayTime}m | Call: ${callTime}m | Cash-out: ${cashOutWindow}m | Timeout: ${sessionTimeout}m`;

      // Update table notes
      await this.waitlistSeatingService.updateTableNotes(clubId, tableId, updatedNotes);

      return {
        message: 'Session parameters updated successfully',
        sessionParams: {
          minPlayTime: parseInt(minPlayTime.toString()),
          callTime: parseInt(callTime.toString()),
          cashOutWindow: parseInt(cashOutWindow.toString()),
          sessionTimeout: parseInt(sessionTimeout.toString()),
        },
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof BadRequestException) {
        throw e;
      }
      console.error('Error updating session parameters:', e);
      throw new BadRequestException(`Failed to update session parameters: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
    @Body() dto: SetClubSettingDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      
      // Get existing setting value for audit log
      const existingValue = await this.clubSettingsService.getSetting(clubId, key);
      
      const result = await this.clubSettingsService.setSetting(clubId, key, dto.value);
      
      // Audit log: Update setting
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'SUPER_ADMIN',
            actionType: 'setting_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated setting '${key}': ${existingValue !== null ? existingValue : 'N/A'} → ${dto.value}`,
            targetType: 'setting',
            targetId: key,
            targetName: key,
            metadata: { 
              key: key,
              oldValue: existingValue,
              newValue: dto.value
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for setting update:', auditError);
      }
      
      return result;
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
    @Param('key') key: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      if (!tenantId) throw new BadRequestException('x-tenant-id header required');
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      
      // Get existing setting value for audit log (before deletion)
      const existingValue = await this.clubSettingsService.getSetting(clubId, key);
      
      // Note: This would require a delete method in ClubSettingsService
      // For now, we'll set it to empty string
      await this.clubSettingsService.setSetting(clubId, key, '');
      
      // Audit log: Delete setting
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'SUPER_ADMIN',
            actionType: 'setting_deleted',
            actionCategory: ActionCategory.SYSTEM,
            description: `Deleted setting '${key}'${existingValue !== null ? ` (Previous value: ${existingValue})` : ''}`,
            targetType: 'setting',
            targetId: key,
            targetName: key,
            metadata: { 
              key: key,
              previousValue: existingValue
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for setting deletion:', auditError);
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
    @Headers('x-club-id') headerClubId?: string,
    @Req() req?: Request
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

      // Audit log: Create affiliate
      try {
        const userId = (req as any)?.headers?.['x-user-id'] as string | undefined;
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'affiliate_created',
            actionCategory: ActionCategory.SYSTEM,
            description: `Created affiliate: ${dto.displayName?.trim() || dto.email.trim()} (Code: ${affiliate.code}, Commission: ${affiliate.commissionRate}%)`,
            targetType: 'affiliate',
            targetId: affiliate.id,
            targetName: dto.displayName?.trim() || dto.email.trim(),
            metadata: { 
              email: dto.email.trim(),
              displayName: dto.displayName?.trim(),
              code: affiliate.code,
              commissionRate: affiliate.commissionRate
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for affiliate creation:', auditError);
      }

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
   * Get all affiliates for a club with pagination
   * GET /clubs/:id/affiliates
   */
  @Get(':id/affiliates')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  async getAffiliates(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
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

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      
      const result = await this.affiliatesService.getAffiliatesForManagement(
        clubId,
        pageNum,
        limitNum,
        search,
        status
      );

      return result;
    } catch (e) {
      // Re-throw known exceptions
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException((e instanceof Error ? e.message : 'Failed to get affiliates'));
    }
  }

  /**
   * Get affiliate referral players with filters
   * GET /clubs/:clubId/affiliates/:affiliateId/referrals
   */
  @Get(':clubId/affiliates/:affiliateId/referrals')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  @UseGuards(RolesGuard)
  async getAffiliateReferrals(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('affiliateId', new ParseUUIDPipe()) affiliateId: string,
    @Query('search') search?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    try {
      // For AFFILIATE role, enforce that they can only view their own referrals
      const user = req?.user;
      const clubIdFromHeader = req?.headers?.['x-club-id'] || clubId;
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isAffiliateOnly = userRoles.includes(ClubRole.AFFILIATE) && 
                             !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN].includes(r));
      
      if (isAffiliateOnly && userId) {
        // AFFILIATE can only view their own referrals - get their affiliate ID from user
        const affiliate = await this.affiliatesRepo.findOne({
          where: { userId, clubId },
        });
        if (affiliate) {
          affiliateId = affiliate.id; // Force affiliateId to current affiliate
        } else {
          throw new ForbiddenException('Affiliate not found');
        }
      }

      const players = await this.affiliatesService.getAffiliateReferrals(
        affiliateId,
        clubId,
        search,
        kycStatus
      );
      
      // Filter by date range if provided
      let filteredPlayers = players;
      if (startDate || endDate) {
        filteredPlayers = players.filter((p: any) => {
          const playerDate = new Date(p.createdAt);
          if (startDate && playerDate < new Date(startDate)) return false;
          if (endDate && playerDate > new Date(endDate)) return false;
          return true;
        });
      }
      
      return { success: true, players: filteredPlayers };
    } catch (error) {
      console.error('Error in getAffiliateReferrals:', error);
      throw error;
    }
  }

  /**
   * Process affiliate payment
   * POST /clubs/:clubId/affiliates/payments
   */
  @Post(':clubId/affiliates/payments')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async processAffiliatePayment(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() processAffiliatePaymentDto: ProcessAffiliatePaymentDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      const transaction = await this.affiliatesService.processAffiliatePayment(
        clubId,
        processAffiliatePaymentDto,
        userId
      );
      
      // Audit log: Process affiliate payment
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'affiliate_payment_processed',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Processed affiliate payment: ₹${processAffiliatePaymentDto.amount} for affiliate ${processAffiliatePaymentDto.affiliateId}${processAffiliatePaymentDto.notes ? ` (Notes: ${processAffiliatePaymentDto.notes})` : ''}`,
            targetType: 'affiliate',
            targetId: processAffiliatePaymentDto.affiliateId,
            targetName: `Affiliate Payment`,
            metadata: { 
              affiliateId: processAffiliatePaymentDto.affiliateId,
              amount: processAffiliatePaymentDto.amount,
              notes: processAffiliatePaymentDto.notes
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for affiliate payment processing:', auditError);
      }
      
      return { success: true, transaction };
    } catch (error) {
      console.error('Error in processAffiliatePayment:', error);
      throw error;
    }
  }

  /**
   * Get affiliate transactions with pagination and filters
   * GET /clubs/:clubId/affiliates/transactions
   */
  @Get(':clubId/affiliates/transactions')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.AFFILIATE)
  @UseGuards(RolesGuard)
  async getAffiliateTransactions(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('affiliateId') affiliateId?: string,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    try {
      // For AFFILIATE role, enforce that they can only view their own transactions
      const user = req?.user;
      const clubIdFromHeader = req?.headers?.['x-club-id'] || clubId;
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isAffiliateOnly = userRoles.includes(ClubRole.AFFILIATE) && 
                             !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN].includes(r));
      
      if (isAffiliateOnly && userId) {
        // AFFILIATE can only view their own transactions - get their affiliate ID from user
        const affiliate = await this.affiliatesRepo.findOne({
          where: { userId, clubId },
        });
        if (affiliate) {
          affiliateId = affiliate.id; // Force affiliateId to current affiliate
        } else {
          throw new ForbiddenException('Affiliate not found');
        }
      }

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      const result = await this.affiliatesService.getAffiliateTransactions(
        clubId,
        pageNum,
        limitNum,
        search,
        startDate,
        endDate,
        affiliateId
      );
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in getAffiliateTransactions:', error);
      throw error;
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
    @Body() dto?: { name?: string; commissionRate?: number },
    @Req() req?: Request
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

      // Audit log: Update affiliate
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.name !== undefined && dto.name !== null && dto.name.trim() !== affiliate.name) {
            changes.push(`name: ${affiliate.name || 'N/A'} → ${dto.name.trim()}`);
          }
          if (dto.commissionRate !== undefined && dto.commissionRate !== null && (!userId || tenantId)) {
            changes.push(`commissionRate: ${affiliate.commissionRate}% → ${dto.commissionRate}%`);
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'affiliate_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated affiliate ${affiliate.code || affiliateId}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'affiliate',
            targetId: affiliateId,
            targetName: affiliate.name || affiliate.code || 'Affiliate',
            metadata: { 
              changes: changes,
              affiliateCode: affiliate.code
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for affiliate update:', auditError);
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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreatePlayerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Edge case: Validate PAN card if provided
      if (dto.panCard !== undefined && dto.panCard !== null) {
        if (typeof dto.panCard !== 'string') {
          throw new BadRequestException('PAN card must be a string');
        }
        const trimmedPan = dto.panCard.trim().toUpperCase();
        // PAN card format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(trimmedPan)) {
          throw new BadRequestException('PAN card must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)');
        }
      }

      // Edge case: Validate initial balance if provided
      if (dto.initialBalance !== undefined && dto.initialBalance !== null) {
        if (typeof dto.initialBalance !== 'number' || isNaN(dto.initialBalance)) {
          throw new BadRequestException('Initial balance must be a number');
        }
        if (dto.initialBalance < 0) {
          throw new BadRequestException('Initial balance cannot be negative');
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

      const { player, tempPassword } = await this.affiliatesService.createPlayer(
        clubId,
        trimmedName,
        trimmedEmail,
        dto.phoneNumber?.trim(),
        dto.playerId?.trim(),
        dto.affiliateCode?.trim().toUpperCase(),
        dto.notes?.trim(),
        dto.panCard?.trim().toUpperCase(),
        dto.documentType?.trim(),
        dto.documentUrl?.trim(),
        dto.initialBalance
      );

      // Audit log: Create player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_created',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Created new player ${player.name} (${player.email})${dto.affiliateCode ? ` via affiliate ${dto.affiliateCode}` : ''}`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              email: player.email,
              phoneNumber: player.phoneNumber,
              affiliateCode: dto.affiliateCode,
              initialBalance: dto.initialBalance || 0
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player creation:', auditError);
      }

      return {
        id: player.id,
        name: player.name,
        email: player.email,
        phoneNumber: player.phoneNumber,
        playerId: player.playerId,
        panCard: player.panCard,
        affiliateCode: player.affiliate?.code || null,
        status: player.status,
        tempPassword: tempPassword, // Temporary password for first login
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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE, ClubRole.HR)
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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE, ClubRole.AFFILIATE, ClubRole.HR)
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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE, ClubRole.HR)
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
      // Only show players from player portal (not Super Admin-created)
      // Super Admin-created players have kycStatus: 'approved' and status: 'Active'
      // Exclude players that are already approved (Super Admin-created)
      const players = await this.playersRepo.find({
        where: [
          { 
            club: { id: clubId }, 
            kycStatus: 'pending', 
            status: 'Active' // Player portal signups with pending KYC (not Super Admin-created)
          },
          { 
            club: { id: clubId }, 
            status: 'Pending' // Players with pending account status
          }
        ],
        relations: ['club', 'affiliate'],
        order: { createdAt: 'DESC' }
      });

      // Filter out any players that are already approved (shouldn't happen, but safety check)
      // Super Admin-created players have kycStatus: 'approved', so exclude them
      const pendingPlayers = players.filter(p => 
        (p.kycStatus === 'pending' && p.status === 'Active') || 
        (p.status === 'Pending')
      );

      return pendingPlayers.map(p => ({
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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async approvePlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: ApprovePlayerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Approve player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_approved',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Approved player ${player.name} (${player.email}) - KYC verified`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              email: player.email,
              kycStatus: 'approved'
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player approval:', auditError);
      }

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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rejectPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: RejectPlayerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Reject player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_rejected',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Rejected player ${player.name} (${player.email}) - Reason: ${dto.reason}`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              email: player.email,
              reason: dto.reason,
              kycStatus: 'rejected'
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player rejection:', auditError);
      }

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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async suspendPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: SuspendPlayerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Suspend player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_suspended',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `${dto.type === 'permanent' ? 'Permanently' : 'Temporarily'} suspended player ${player.name} (${player.email}) - Reason: ${dto.reason}${dto.duration ? ` for ${dto.duration} days` : ''}`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              email: player.email,
              type: dto.type,
              reason: dto.reason,
              duration: dto.duration
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player suspension:', auditError);
      }

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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE)
  async unsuspendPlayer(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Unsuspend player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_unsuspended',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Unsuspended player ${player.name} (${player.email}) - Status changed to Active`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              email: player.email,
              previousStatus: 'Suspended',
              newStatus: 'Active'
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player unsuspension:', auditError);
      }

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
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.GRE, ClubRole.HR)
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
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Update player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.name !== undefined && dto.name !== player.name) {
            changes.push(`name: ${player.name} → ${dto.name}`);
          }
          if (dto.email !== undefined && dto.email !== player.email) {
            changes.push(`email: ${player.email} → ${dto.email}`);
          }
          if (dto.phoneNumber !== undefined && dto.phoneNumber !== player.phoneNumber) {
            changes.push(`phone: ${player.phoneNumber || 'null'} → ${dto.phoneNumber || 'null'}`);
          }
          if (dto.status !== undefined && dto.status !== player.status) {
            changes.push(`status: ${player.status} → ${dto.status}`);
          }
          if (dto.notes !== undefined) {
            changes.push('notes updated');
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Super Admin',
            actionType: 'player_updated',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Updated player ${player.name} (${player.email}): ${changes.join(', ')}`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              changes: changes,
              previousName: player.name,
              previousEmail: player.email,
              previousStatus: player.status
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player update:', auditError);
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
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Create player transaction
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Super Admin',
            actionType: 'player_transaction_created',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Created ${dto.type} transaction of ₹${dto.amount} for player ${player.name}`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              transactionId: transaction.id,
              type: dto.type,
              amount: dto.amount
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player transaction creation:', auditError);
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
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Activate player
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Super Admin',
            actionType: 'player_activated',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Activated player ${player.name} (${player.email}) - Status changed to Active`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              email: player.email,
              previousStatus: player.status,
              newStatus: 'Active'
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player activation:', auditError);
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
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
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

      // Audit log: Delete player (before deletion)
      try {
        if (userId) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Super Admin',
            actionType: 'player_deleted',
            actionCategory: ActionCategory.PLAYER_MANAGEMENT,
            description: `Deleted player ${player.name} (${player.email})`,
            targetType: 'player',
            targetId: player.id,
            targetName: player.name,
            metadata: { 
              email: player.email,
              status: player.status,
              phoneNumber: player.phoneNumber
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player deletion:', auditError);
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
    @Req() req?: Request
  ) {
    const order = await this.fnbEnhancedService.createOrder(clubId, dto);
    
    // Audit log: Create FNB order
    try {
      if (userId && order) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        const totalAmount = dto.items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'fnb_order_created',
          actionCategory: ActionCategory.FNB,
          description: `Created FNB order${dto.playerId ? ` for player ${dto.playerId}` : ''} - Total: ₹${totalAmount}${dto.items?.length ? ` (${dto.items.length} items)` : ''}`,
          targetType: dto.playerId ? 'player' : 'order',
          targetId: dto.playerId || order.id,
          targetName: dto.playerId ? `Player ${dto.playerId}` : `Order ${order.id}`,
          metadata: { 
            orderId: order.id,
            playerId: dto.playerId,
            totalAmount: totalAmount,
            itemCount: dto.items?.length || 0
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for FNB order creation:', auditError);
    }
    
    return order;
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.fnbEnhancedService.getOrders(
      clubId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status
    );
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
    return await this.fnbEnhancedService.getOrder(clubId, orderId);
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
    @Req() req?: Request
  ) {
    // Get existing order for audit log
    const existingOrder = await this.fnbEnhancedService.getOrder(clubId, orderId);
    
    const order = await this.fnbEnhancedService.updateOrderStatus(clubId, orderId, dto, userId || 'System');
    
    // Audit log: Update FNB order
    try {
      if (userId && existingOrder) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        const changes: string[] = [];
        if (dto.status !== undefined && dto.status !== existingOrder.status) {
          changes.push(`status: ${existingOrder.status} → ${dto.status}`);
        }
        if (dto.specialInstructions !== undefined) {
          changes.push('specialInstructions updated');
        }
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'fnb_order_updated',
          actionCategory: ActionCategory.FNB,
          description: `Updated FNB order ${orderId}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
          targetType: 'order',
          targetId: orderId,
          targetName: `Order ${orderId}`,
          metadata: { 
            orderId: orderId,
            changes: changes,
            previousStatus: existingOrder.status
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for FNB order update:', auditError);
    }
    
    return order;
  }

  /**
   * Cancel FNB Order
   * POST /api/clubs/:id/fnb/orders/:orderId/cancel
   */
  @Post(':id/fnb/orders/:orderId/cancel')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async cancelFnbOrder(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body('reason') reason: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing order for audit log
    const existingOrder = await this.fnbEnhancedService.getOrder(clubId, orderId);
    
    const order = await this.fnbEnhancedService.cancelOrder(clubId, orderId, reason || 'Cancelled by admin', userId || 'System');
    
    // Audit log: Cancel FNB order
    try {
      if (userId && existingOrder) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'fnb_order_cancelled',
          actionCategory: ActionCategory.FNB,
          description: `Cancelled FNB order ${orderId}${reason ? ` - Reason: ${reason}` : ''}`,
          targetType: 'order',
          targetId: orderId,
          targetName: `Order ${orderId}`,
          metadata: { 
            orderId: orderId,
            reason: reason || 'Cancelled by admin',
            previousStatus: existingOrder.status
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for FNB order cancellation:', auditError);
    }
    
    return order;
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const menuItem = await this.fnbEnhancedService.createMenuItem(clubId, dto);
    
    // Audit log: Create menu item
    try {
      if (userId && menuItem) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'menu_item_created',
          actionCategory: ActionCategory.FNB,
          description: `Created menu item ${dto.name} - Price: ₹${dto.price}${dto.category ? ` (Category: ${dto.category})` : ''}`,
          targetType: 'menu_item',
          targetId: menuItem.id,
          targetName: dto.name,
          metadata: { 
            itemName: dto.name,
            price: dto.price,
            category: dto.category
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for menu item creation:', auditError);
    }
    
    return menuItem;
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
    return await this.fnbEnhancedService.getMenuItems(clubId);
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
    return await this.fnbEnhancedService.getMenuItem(clubId, itemId);
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing menu item for audit log
    const existingItem = await this.fnbEnhancedService.getMenuItem(clubId, itemId);
    
    const menuItem = await this.fnbEnhancedService.updateMenuItem(clubId, itemId, dto);
    
    // Audit log: Update menu item
    try {
      if (userId && existingItem) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        const changes: string[] = [];
        if (dto.name !== undefined && dto.name !== existingItem.name) {
          changes.push(`name: ${existingItem.name} → ${dto.name}`);
        }
        if (dto.price !== undefined && dto.price !== existingItem.price) {
          changes.push(`price: ₹${existingItem.price} → ₹${dto.price}`);
        }
        if (dto.availability !== undefined && dto.availability !== existingItem.availability) {
          changes.push(`availability: ${existingItem.availability} → ${dto.availability}`);
        }
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'menu_item_updated',
          actionCategory: ActionCategory.FNB,
          description: `Updated menu item ${existingItem.name}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
          targetType: 'menu_item',
          targetId: itemId,
          targetName: existingItem.name,
          metadata: { 
            changes: changes,
            itemName: existingItem.name
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for menu item update:', auditError);
    }
    
    return menuItem;
  }

  /**
   * Delete Menu Item
   * DELETE /api/clubs/:id/fnb/menu/:itemId
   */
  @Delete(':id/fnb/menu/:itemId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  @HttpCode(HttpStatus.OK)
  async deleteMenuItem(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing menu item for audit log (before deletion)
    const existingItem = await this.fnbEnhancedService.getMenuItem(clubId, itemId);
    
    await this.fnbEnhancedService.deleteMenuItem(clubId, itemId);
    
    // Audit log: Delete menu item
    try {
      if (userId && existingItem) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'menu_item_deleted',
          actionCategory: ActionCategory.FNB,
          description: `Deleted menu item ${existingItem.name} (Price: ₹${existingItem.price})`,
          targetType: 'menu_item',
          targetId: itemId,
          targetName: existingItem.name,
          metadata: { 
            itemName: existingItem.name,
            price: existingItem.price,
            category: existingItem.category
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for menu item deletion:', auditError);
    }
    
    return { success: true, message: 'Menu item deleted successfully' };
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
    return await this.fnbEnhancedService.getMenuCategories(clubId);
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const inventoryItem = await this.fnbEnhancedService.createInventoryItem(clubId, dto);
    
    // Audit log: Create inventory item
    try {
      if (userId && inventoryItem) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'inventory_item_created',
          actionCategory: ActionCategory.FNB,
          description: `Created inventory item ${dto.name} - Current Stock: ${dto.currentStock}${dto.unit ? ` ${dto.unit}` : ''}, Min Stock: ${dto.minStock}`,
          targetType: 'inventory_item',
          targetId: inventoryItem.id,
          targetName: dto.name,
          metadata: { 
            itemName: dto.name,
            currentStock: dto.currentStock,
            minStock: dto.minStock,
            unit: dto.unit
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for inventory item creation:', auditError);
    }
    
    return inventoryItem;
  }

  /**
   * Get Inventory Items (with filters)
   * GET /api/clubs/:id/fnb/inventory
   */
  @Get(':id/fnb/inventory')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getInventoryItems(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return await this.fnbEnhancedService.getInventoryItems(clubId, lowStock === 'true');
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
    return await this.fnbEnhancedService.getInventoryItem(clubId, itemId);
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing inventory item for audit log
    const existingItem = await this.fnbEnhancedService.getInventoryItem(clubId, itemId);
    
    const inventoryItem = await this.fnbEnhancedService.updateInventoryItem(clubId, itemId, dto);
    
    // Audit log: Update inventory item
    try {
      if (userId && existingItem) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        const changes: string[] = [];
        if (dto.name !== undefined && dto.name !== existingItem.name) {
          changes.push(`name: ${existingItem.name} → ${dto.name}`);
        }
        if (dto.currentStock !== undefined && dto.currentStock !== existingItem.currentStock) {
          changes.push(`currentStock: ${existingItem.currentStock} → ${dto.currentStock}`);
        }
        if (dto.minStock !== undefined && dto.minStock !== existingItem.minStock) {
          changes.push(`minStock: ${existingItem.minStock} → ${dto.minStock}`);
        }
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'inventory_item_updated',
          actionCategory: ActionCategory.FNB,
          description: `Updated inventory item ${existingItem.name}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
          targetType: 'inventory_item',
          targetId: itemId,
          targetName: existingItem.name,
          metadata: { 
            changes: changes,
            itemName: existingItem.name
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for inventory item update:', auditError);
    }
    
    return inventoryItem;
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing inventory item for audit log (before deletion)
    const existingItem = await this.fnbEnhancedService.getInventoryItem(clubId, itemId);
    
    const result = await this.fnbEnhancedService.deleteInventoryItem(clubId, itemId);
    
    // Audit log: Delete inventory item
    try {
      if (userId && existingItem) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'inventory_item_deleted',
          actionCategory: ActionCategory.FNB,
          description: `Deleted inventory item ${existingItem.name} (Current Stock: ${existingItem.currentStock}${existingItem.unit ? ` ${existingItem.unit}` : ''}, Min Stock: ${existingItem.minStock})`,
          targetType: 'inventory_item',
          targetId: itemId,
          targetName: existingItem.name,
          metadata: { 
            itemName: existingItem.name,
            currentStock: existingItem.currentStock,
            minStock: existingItem.minStock,
            unit: existingItem.unit
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for inventory item deletion:', auditError);
    }
    
    return result;
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
    return await this.fnbEnhancedService.getInventoryItems(clubId, true);
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
    return await this.fnbEnhancedService.getInventoryItems(clubId, true);
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const supplier = await this.fnbEnhancedService.createSupplier(clubId, dto);
    
    // Audit log: Create supplier
    try {
      if (userId && supplier) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'supplier_created',
          actionCategory: ActionCategory.FNB,
          description: `Created supplier ${dto.name}${dto.contact ? ` (Contact: ${dto.contact})` : ''}${dto.phone ? ` - Phone: ${dto.phone}` : ''}`,
          targetType: 'supplier',
          targetId: supplier.id,
          targetName: dto.name,
          metadata: { 
            supplierName: dto.name,
            contact: dto.contact,
            phone: dto.phone
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for supplier creation:', auditError);
    }
    
    return supplier;
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
    return await this.fnbEnhancedService.getSuppliers(clubId);
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
    return await this.fnbEnhancedService.getSupplier(clubId, supplierId);
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing supplier for audit log
    const existingSupplier = await this.fnbEnhancedService.getSupplier(clubId, supplierId);
    
    const supplier = await this.fnbEnhancedService.updateSupplier(clubId, supplierId, dto);
    
    // Audit log: Update supplier
    try {
      if (userId && existingSupplier) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        const changes: string[] = [];
        if (dto.name !== undefined && dto.name !== existingSupplier.name) {
          changes.push(`name: ${existingSupplier.name} → ${dto.name}`);
        }
        if (dto.contact !== undefined && dto.contact !== existingSupplier.contact) {
          changes.push(`contact: ${existingSupplier.contact || 'N/A'} → ${dto.contact || 'N/A'}`);
        }
        if (dto.phone !== undefined && dto.phone !== existingSupplier.phone) {
          changes.push(`phone: ${existingSupplier.phone || 'N/A'} → ${dto.phone || 'N/A'}`);
        }
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'supplier_updated',
          actionCategory: ActionCategory.FNB,
          description: `Updated supplier ${existingSupplier.name}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
          targetType: 'supplier',
          targetId: supplierId,
          targetName: existingSupplier.name,
          metadata: { 
            changes: changes,
            supplierName: existingSupplier.name
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for supplier update:', auditError);
    }
    
    return supplier;
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
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing supplier for audit log (before deletion)
    const existingSupplier = await this.fnbEnhancedService.getSupplier(clubId, supplierId);
    
    const result = await this.fnbEnhancedService.deleteSupplier(clubId, supplierId);
    
    // Audit log: Delete supplier
    try {
      if (userId && existingSupplier) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'supplier_deleted',
          actionCategory: ActionCategory.FNB,
          description: `Deleted supplier ${existingSupplier.name}${existingSupplier.contact ? ` (Contact: ${existingSupplier.contact})` : ''}`,
          targetType: 'supplier',
          targetId: supplierId,
          targetName: existingSupplier.name,
          metadata: { 
            supplierName: existingSupplier.name,
            contact: existingSupplier.contact,
            phone: existingSupplier.phone
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for supplier deletion:', auditError);
    }
    
    return result;
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
    return await this.fnbEnhancedService.getOrderAnalytics(clubId);
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
  ) {
    return await this.fnbEnhancedService.getPopularItems(
      clubId,
      limit ? parseInt(limit) : 10
    );
  }

  // ==================== ENHANCED FNB ENDPOINTS (Kitchen Stations & Advanced Orders) ====================

  /**
   * Create Kitchen Station
   * POST /api/clubs/:id/fnb/kitchen-stations
   */
  @Post(':id/fnb/kitchen-stations')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async createKitchenStation(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body() dto: CreateKitchenStationDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const station = await this.fnbEnhancedService.createKitchenStation(clubId, dto);
    
    // Audit log: Create kitchen station
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'kitchen_station_created',
          actionCategory: ActionCategory.FNB,
          description: `Created kitchen station ${dto.stationName} (Station #${dto.stationNumber}${dto.chefName ? `, Chef: ${dto.chefName}` : ''})`,
          targetType: 'kitchen_station',
          targetId: station.id,
          targetName: dto.stationName,
          metadata: { 
            stationName: dto.stationName,
            stationNumber: dto.stationNumber,
            chefName: dto.chefName,
            chefId: dto.chefId,
            isActive: dto.isActive ?? true
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for kitchen station creation:', auditError);
    }
    
    return station;
  }

  /**
   * Get Kitchen Stations
   * GET /api/clubs/:id/fnb/kitchen-stations
   */
  @Get(':id/fnb/kitchen-stations')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getKitchenStations(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return await this.fnbEnhancedService.getKitchenStations(clubId, activeOnly === 'true');
  }

  /**
   * Get Single Kitchen Station
   * GET /api/clubs/:id/fnb/kitchen-stations/:stationId
   */
  @Get(':id/fnb/kitchen-stations/:stationId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getKitchenStation(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    return await this.fnbEnhancedService.getKitchenStation(clubId, stationId);
  }

  /**
   * Update Kitchen Station
   * PATCH /api/clubs/:id/fnb/kitchen-stations/:stationId
   */
  @Patch(':id/fnb/kitchen-stations/:stationId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async updateKitchenStation(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Body() dto: UpdateKitchenStationDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing station for audit log
    const existingStation = await this.fnbEnhancedService.getKitchenStation(clubId, stationId);
    
    const station = await this.fnbEnhancedService.updateKitchenStation(clubId, stationId, dto);
    
    // Audit log: Update kitchen station
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        const changes: string[] = [];
        if (dto.stationName !== undefined && dto.stationName !== existingStation.stationName) {
          changes.push(`name: ${existingStation.stationName} → ${dto.stationName}`);
        }
        if (dto.stationNumber !== undefined && dto.stationNumber !== existingStation.stationNumber) {
          changes.push(`stationNumber: ${existingStation.stationNumber} → ${dto.stationNumber}`);
        }
        if (dto.chefName !== undefined && dto.chefName !== existingStation.chefName) {
          changes.push(`chefName: ${existingStation.chefName || 'N/A'} → ${dto.chefName || 'N/A'}`);
        }
        if (dto.isActive !== undefined && dto.isActive !== existingStation.isActive) {
          changes.push(`isActive: ${existingStation.isActive} → ${dto.isActive}`);
        }
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'kitchen_station_updated',
          actionCategory: ActionCategory.FNB,
          description: `Updated kitchen station ${existingStation.stationName}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
          targetType: 'kitchen_station',
          targetId: stationId,
          targetName: existingStation.stationName,
          metadata: { 
            changes: changes,
            stationName: existingStation.stationName,
            stationNumber: existingStation.stationNumber
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for kitchen station update:', auditError);
    }
    
    return station;
  }

  /**
   * Delete Kitchen Station
   * DELETE /api/clubs/:id/fnb/kitchen-stations/:stationId
   */
  @Delete(':id/fnb/kitchen-stations/:stationId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async deleteKitchenStation(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing station for audit log (before deletion)
    const existingStation = await this.fnbEnhancedService.getKitchenStation(clubId, stationId);
    
    const result = await this.fnbEnhancedService.deleteKitchenStation(clubId, stationId);
    
    // Audit log: Delete kitchen station
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'kitchen_station_deleted',
          actionCategory: ActionCategory.FNB,
          description: `Deleted kitchen station ${existingStation.stationName} (Station #${existingStation.stationNumber}${existingStation.chefName ? `, Chef: ${existingStation.chefName}` : ''})`,
          targetType: 'kitchen_station',
          targetId: stationId,
          targetName: existingStation.stationName,
          metadata: { 
            stationName: existingStation.stationName,
            stationNumber: existingStation.stationNumber,
            chefName: existingStation.chefName,
            ordersCompleted: existingStation.ordersCompleted,
            ordersPending: existingStation.ordersPending
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for kitchen station deletion:', auditError);
    }
    
    return result;
  }

  /**
   * Get Station Statistics
   * GET /api/clubs/:id/fnb/kitchen-stations/:stationId/statistics
   */
  @Get(':id/fnb/kitchen-stations/:stationId/statistics')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getStationStatistics(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    return await this.fnbEnhancedService.getStationStatistics(clubId, stationId);
  }

  /**
   * Accept FNB Order
   * POST /api/clubs/:id/fnb/orders/:orderId/accept
   */
  @Post(':id/fnb/orders/:orderId/accept')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async acceptFnbOrder(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AcceptRejectOrderDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const order = await this.fnbEnhancedService.acceptOrder(clubId, orderId, { ...dto, isAccepted: true }, userId || 'System');
    
    // Audit log: Accept FNB order
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'fnb_order_accepted',
          actionCategory: ActionCategory.FNB,
          description: `Accepted FNB order ${orderId}${dto.stationId ? ` (Kitchen Station: ${dto.stationId})` : ''}`,
          targetType: 'order',
          targetId: orderId,
          targetName: `Order ${orderId}`,
          metadata: { 
            orderId: orderId,
            stationId: dto.stationId
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for FNB order acceptance:', auditError);
    }
    
    return order;
  }

  /**
   * Reject FNB Order
   * POST /api/clubs/:id/fnb/orders/:orderId/reject
   */
  @Post(':id/fnb/orders/:orderId/reject')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async rejectFnbOrder(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AcceptRejectOrderDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const order = await this.fnbEnhancedService.rejectOrder(clubId, orderId, { ...dto, isAccepted: false }, userId || 'System');
    
    // Audit log: Reject FNB order
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'fnb_order_rejected',
          actionCategory: ActionCategory.FNB,
          description: `Rejected FNB order ${orderId}${dto.rejectedReason ? ` - Reason: ${dto.rejectedReason}` : ''}`,
          targetType: 'order',
          targetId: orderId,
          targetName: `Order ${orderId}`,
          metadata: { 
            orderId: orderId,
            rejectedReason: dto.rejectedReason
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for FNB order rejection:', auditError);
    }
    
    return order;
  }

  /**
   * Mark Order as Ready
   * POST /api/clubs/:id/fnb/orders/:orderId/ready
   */
  @Post(':id/fnb/orders/:orderId/ready')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async markOrderReady(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const order = await this.fnbEnhancedService.markOrderReady(clubId, orderId, userId || 'System');
    
    // Audit log: Mark order ready
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'fnb_order_ready',
          actionCategory: ActionCategory.FNB,
          description: `Marked FNB order ${orderId} as ready`,
          targetType: 'order',
          targetId: orderId,
          targetName: `Order ${orderId}`,
          metadata: { 
            orderId: orderId
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for marking order ready:', auditError);
    }
    
    return order;
  }

  /**
   * Mark Order as Delivered
   * POST /api/clubs/:id/fnb/orders/:orderId/delivered
   */
  @Post(':id/fnb/orders/:orderId/delivered')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async markOrderDelivered(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const order = await this.fnbEnhancedService.markOrderDelivered(clubId, orderId, userId || 'System');
    
    // Audit log: Mark order delivered
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'fnb_order_delivered',
          actionCategory: ActionCategory.FNB,
          description: `Marked FNB order ${orderId} as delivered`,
          targetType: 'order',
          targetId: orderId,
          targetName: `Order ${orderId}`,
          metadata: { 
            orderId: orderId
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for marking order delivered:', auditError);
    }
    
    return order;
  }

  /**
   * Create Custom Menu Category
   * POST /api/clubs/:id/fnb/categories
   */
  @Post(':id/fnb/categories')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async createMenuCategory(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Body('categoryName') categoryName: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const category = await this.fnbEnhancedService.createMenuCategory(clubId, categoryName);
    
    // Audit log: Create menu category
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'menu_category_created',
          actionCategory: ActionCategory.FNB,
          description: `Created menu category: ${categoryName}`,
          targetType: 'menu_category',
          targetId: category.id,
          targetName: categoryName,
          metadata: { 
            categoryName: categoryName
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for menu category creation:', auditError);
    }
    
    return category;
  }

  /**
   * Get All Menu Categories (Enhanced)
   * GET /api/clubs/:id/fnb/categories/all
   */
  @Get(':id/fnb/categories/all')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async getAllMenuCategories(
    @Param('id', ParseUUIDPipe) clubId: string,
  ) {
    return await this.fnbEnhancedService.getMenuCategories(clubId);
  }

  /**
   * Delete Menu Category
   * DELETE /api/clubs/:id/fnb/categories/:categoryId
   */
  @Delete(':id/fnb/categories/:categoryId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.FNB)
  async deleteMenuCategory(
    @Param('id', ParseUUIDPipe) clubId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    // Get existing category for audit log (before deletion)
    // Note: We need to get the category name before deletion
    const categories = await this.fnbEnhancedService.getMenuCategories(clubId);
    const existingCategory = categories.find(c => c.id === categoryId);
    
    const result = await this.fnbEnhancedService.deleteMenuCategory(clubId, categoryId);
    
    // Audit log: Delete menu category
    try {
      if (userId && existingCategory) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'menu_category_deleted',
          actionCategory: ActionCategory.FNB,
          description: `Deleted menu category: ${existingCategory.categoryName}`,
          targetType: 'menu_category',
          targetId: categoryId,
          targetName: existingCategory.categoryName,
          metadata: { 
            categoryName: existingCategory.categoryName
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for menu category deletion:', auditError);
    }
    
    return result;
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
        rummyEnabled: club.rummyEnabled || false,
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
    @Body() body: { status: string; reason?: string },
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing club for audit log
      const existingClub = await this.clubsService.findById(clubId);
      
      const club = await this.clubsService.updateClubStatus(clubId, body.status, body.reason);
      
      // Audit log: Update club status
      try {
        if (userId && existingClub) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'MASTER_ADMIN',
            actionType: 'club_status_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated club status: ${existingClub.status} → ${body.status}${body.reason ? ` (Reason: ${body.reason})` : ''}`,
            targetType: 'club',
            targetId: clubId,
            targetName: existingClub.name,
            metadata: { 
              oldStatus: existingClub.status,
              newStatus: body.status,
              reason: body.reason
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for club status update:', auditError);
      }
      
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
    @Body() dto: any,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing club for audit log
      const existingClub = await this.clubsService.findById(clubId);
      
      const club = await this.clubsService.updateClubSubscription(clubId, dto);
      
      // Audit log: Update club subscription
      try {
        if (userId && existingClub) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.subscriptionPrice !== undefined && dto.subscriptionPrice !== existingClub.subscriptionPrice) {
            changes.push(`subscriptionPrice: ${existingClub.subscriptionPrice || 'N/A'} → ${dto.subscriptionPrice}`);
          }
          if (dto.subscriptionStatus !== undefined && dto.subscriptionStatus !== existingClub.subscriptionStatus) {
            changes.push(`subscriptionStatus: ${existingClub.subscriptionStatus || 'N/A'} → ${dto.subscriptionStatus}`);
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'MASTER_ADMIN',
            actionType: 'club_subscription_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated club subscription for ${existingClub.name}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'club',
            targetId: clubId,
            targetName: existingClub.name,
            metadata: { 
              changes: changes,
              subscriptionPrice: dto.subscriptionPrice,
              subscriptionStatus: dto.subscriptionStatus
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for club subscription update:', auditError);
      }
      
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
    @Body() body: { termsAndConditions: string },
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing club for audit log
      const existingClub = await this.clubsService.findById(clubId);
      
      const club = await this.clubsService.updateClubTerms(clubId, body.termsAndConditions);
      
      // Audit log: Update club terms
      try {
        if (userId && existingClub) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'MASTER_ADMIN',
            actionType: 'club_terms_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated terms and conditions for club ${existingClub.name}`,
            targetType: 'club',
            targetId: clubId,
            targetName: existingClub.name,
            metadata: { 
              clubName: existingClub.name,
              termsLength: body.termsAndConditions?.length || 0
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for club terms update:', auditError);
      }
      
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

  /**
   * Update club rummy enabled status
   * PUT /api/clubs/:id/rummy-enabled
   */
  @Put(':id/rummy-enabled')
  @Roles(GlobalRole.MASTER_ADMIN)
  async updateClubRummyEnabled(
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() body: { rummyEnabled: boolean },
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing club for audit log
      const existingClub = await this.clubsService.findById(clubId);
      
      const club = await this.clubsService.updateClubRummyEnabled(clubId, body.rummyEnabled);
      
      // Audit log: Update club rummy enabled
      try {
        if (userId && existingClub) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'MASTER_ADMIN',
            actionType: 'club_rummy_enabled_updated',
            actionCategory: ActionCategory.SYSTEM,
            description: `Updated rummy enabled status for ${existingClub.name}: ${existingClub.rummyEnabled || false} → ${body.rummyEnabled}`,
            targetType: 'club',
            targetId: clubId,
            targetName: existingClub.name,
            metadata: { 
              oldRummyEnabled: existingClub.rummyEnabled || false,
              newRummyEnabled: body.rummyEnabled
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for club rummy enabled update:', auditError);
      }
      
      return {
        success: true,
        club: {
          id: club.id,
          name: club.name,
          rummyEnabled: club.rummyEnabled
        }
      };
    } catch (error) {
      console.error('Error in updateClubRummyEnabled:', error);
      throw error;
    }
  }

  // =========================================================================
  // TOURNAMENTS
  // =========================================================================

  /**
   * Get all tournaments for a club
   * GET /api/clubs/:clubId/tournaments
   */
  @Get(':clubId/tournaments')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  async getTournaments(@Param('clubId', new ParseUUIDPipe()) clubId: string) {
    try {
      const tournaments = await this.tournamentsService.getTournaments(clubId);
      return { success: true, tournaments };
    } catch (error) {
      console.error('Error in getTournaments:', error);
      throw error;
    }
  }

  /**
   * Get tournament by ID
   * GET /api/clubs/:clubId/tournaments/:tournamentId
   */
  @Get(':clubId/tournaments/:tournamentId')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.GRE)
  async getTournamentById(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('tournamentId', new ParseUUIDPipe()) tournamentId: string,
  ) {
    try {
      const tournament = await this.tournamentsService.getTournamentById(clubId, tournamentId);
      return { success: true, tournament };
    } catch (error) {
      console.error('Error in getTournamentById:', error);
      throw error;
    }
  }

  /**
   * Create new tournament
   * POST /api/clubs/:clubId/tournaments
   */
  @Post(':clubId/tournaments')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async createTournament(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateTournamentDto,
    @Req() req?: Request
  ) {
    try {
      const tournament = await this.tournamentsService.createTournament(clubId, userId, dto);
      
      // Audit log: Create tournament
      try {
        if (userId && tournament) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'tournament_created',
            actionCategory: ActionCategory.TOURNAMENT,
            description: `Created tournament ${dto.name} (Type: ${dto.tournament_type}, Buy-in: ₹${dto.buy_in}, Starting Chips: ${dto.starting_chips})`,
            targetType: 'tournament',
            targetId: tournament.id,
            targetName: dto.name,
            metadata: { 
              tournamentType: dto.tournament_type,
              buyIn: dto.buy_in,
              startingChips: dto.starting_chips,
              maxPlayers: dto.max_players
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for tournament creation:', auditError);
      }
      
      return { success: true, tournament, message: 'Tournament created successfully' };
    } catch (error) {
      console.error('Error in createTournament:', error);
      throw error;
    }
  }

  /**
   * Update tournament
   * PUT /api/clubs/:clubId/tournaments/:tournamentId
   */
  @Put(':clubId/tournaments/:tournamentId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async updateTournament(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('tournamentId', new ParseUUIDPipe()) tournamentId: string,
    @Body() dto: UpdateTournamentDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing tournament for audit log
      const existingTournament = await this.tournamentsService.getTournamentById(clubId, tournamentId);
      
      const tournament = await this.tournamentsService.updateTournament(clubId, tournamentId, dto);
      
      // Audit log: Update tournament
      try {
        if (userId && existingTournament) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (dto.name !== undefined && dto.name !== existingTournament.name) {
            changes.push(`name: ${existingTournament.name} → ${dto.name}`);
          }
          if (dto.buy_in !== undefined && dto.buy_in !== existingTournament.buy_in) {
            changes.push(`buyIn: ₹${existingTournament.buy_in} → ₹${dto.buy_in}`);
          }
          if (dto.starting_chips !== undefined && dto.starting_chips !== existingTournament.starting_chips) {
            changes.push(`startingChips: ${existingTournament.starting_chips} → ${dto.starting_chips}`);
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'tournament_updated',
            actionCategory: ActionCategory.TOURNAMENT,
            description: `Updated tournament ${existingTournament.name}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'tournament',
            targetId: tournamentId,
            targetName: existingTournament.name,
            metadata: { 
              changes: changes,
              tournamentName: existingTournament.name
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for tournament update:', auditError);
      }
      
      return { success: true, tournament, message: 'Tournament updated successfully' };
    } catch (error) {
      console.error('Error in updateTournament:', error);
      throw error;
    }
  }

  /**
   * Delete tournament
   * DELETE /api/clubs/:clubId/tournaments/:tournamentId
   */
  @Delete(':clubId/tournaments/:tournamentId')
  async deleteTournament(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('tournamentId', new ParseUUIDPipe()) tournamentId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing tournament for audit log (before deletion)
      let existingTournament;
      try {
        existingTournament = await this.tournamentsService.getTournamentById(clubId, tournamentId);
      } catch (e) {
        // Tournament might not exist, continue with deletion
      }
      
      const result = await this.tournamentsService.deleteTournament(clubId, tournamentId);
      
      // Audit log: Delete tournament
      try {
        if (userId && existingTournament) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'tournament_deleted',
            actionCategory: ActionCategory.TOURNAMENT,
            description: `Deleted tournament ${existingTournament.name} (Type: ${existingTournament.tournament_type}, Buy-in: ₹${existingTournament.buy_in})`,
            targetType: 'tournament',
            targetId: tournamentId,
            targetName: existingTournament.name,
            metadata: { 
              tournamentName: existingTournament.name,
              tournamentType: existingTournament.tournament_type,
              buyIn: existingTournament.buy_in
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for tournament deletion:', auditError);
      }
      
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error in deleteTournament:', error);
      throw error;
    }
  }

  /**
   * Start tournament
   * POST /api/clubs/:clubId/tournaments/:tournamentId/start
   */
  @Post(':clubId/tournaments/:tournamentId/start')
  async startTournament(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('tournamentId', new ParseUUIDPipe()) tournamentId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing tournament for audit log
      const existingTournament = await this.tournamentsService.getTournamentById(clubId, tournamentId);
      
      const tournament = await this.tournamentsService.startTournament(clubId, tournamentId);
      
      // Audit log: Start tournament
      try {
        if (userId && existingTournament) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'tournament_started',
            actionCategory: ActionCategory.TOURNAMENT,
            description: `Started tournament ${existingTournament.name} (Type: ${existingTournament.tournament_type}, Buy-in: ₹${existingTournament.buy_in})`,
            targetType: 'tournament',
            targetId: tournamentId,
            targetName: existingTournament.name,
            metadata: { 
              tournamentName: existingTournament.name,
              tournamentType: existingTournament.tournament_type,
              buyIn: existingTournament.buy_in
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for tournament start:', auditError);
      }
      
      return { success: true, tournament, message: 'Tournament started successfully' };
    } catch (error) {
      console.error('Error in startTournament:', error);
      throw error;
    }
  }

  /**
   * End tournament with winners
   * POST /api/clubs/:clubId/tournaments/:tournamentId/end
   */
  @Post(':clubId/tournaments/:tournamentId/end')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async endTournament(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('tournamentId', new ParseUUIDPipe()) tournamentId: string,
    @Body() dto: EndTournamentDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing tournament for audit log
      const existingTournament = await this.tournamentsService.getTournamentById(clubId, tournamentId);
      
      const tournament = await this.tournamentsService.endTournament(clubId, tournamentId, dto);
      
      // Audit log: End tournament
      try {
        if (userId && existingTournament) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const winnersCount = dto.winners && Array.isArray(dto.winners) ? dto.winners.length : 0;
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'tournament_ended',
            actionCategory: ActionCategory.TOURNAMENT,
            description: `Ended tournament ${existingTournament.name}${winnersCount > 0 ? ` with ${winnersCount} winner(s)` : ''}`,
            targetType: 'tournament',
            targetId: tournamentId,
            targetName: existingTournament.name,
            metadata: { 
              tournamentName: existingTournament.name,
              winnersCount: winnersCount
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for tournament end:', auditError);
      }
      
      return { success: true, tournament, message: 'Tournament ended and winners updated successfully' };
    } catch (error) {
      console.error('Error in endTournament:', error);
      throw error;
    }
  }

  /**
   * Get tournament players
   * GET /api/clubs/:clubId/tournaments/:tournamentId/players
   */
  @Get(':clubId/tournaments/:tournamentId/players')
  async getTournamentPlayers(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('tournamentId', new ParseUUIDPipe()) tournamentId: string,
  ) {
    try {
      const players = await this.tournamentsService.getTournamentPlayers(clubId, tournamentId);
      return { success: true, players };
    } catch (error) {
      console.error('Error in getTournamentPlayers:', error);
      throw error;
    }
  }

  /**
   * Get tournament winners
   * GET /api/clubs/:clubId/tournaments/:tournamentId/winners
   */
  @Get(':clubId/tournaments/:tournamentId/winners')
  async getTournamentWinners(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('tournamentId', new ParseUUIDPipe()) tournamentId: string,
  ) {
    try {
      const winners = await this.tournamentsService.getTournamentWinners(clubId, tournamentId);
      return { success: true, winners };
    } catch (error) {
      console.error('Error in getTournamentWinners:', error);
      throw error;
    }
  }

  // =====================================================
  // SHIFT MANAGEMENT
  // =====================================================

  /**
   * Create a new shift
   * POST /api/clubs/:clubId/shifts
   */
  @Post(':clubId/shifts')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createShift(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() createShiftDto: CreateShiftDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      const shift = await this.shiftManagementService.createShift(clubId, createShiftDto, userId);
      
      // Audit log: Create shift
      try {
        if (userId && shift) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'shift_created',
            actionCategory: ActionCategory.PAYROLL,
            description: `Created shift for ${createShiftDto.staffId} on ${createShiftDto.shiftDate}${createShiftDto.shiftStartTime ? ` (${createShiftDto.shiftStartTime} - ${createShiftDto.shiftEndTime})` : ''}`,
            targetType: 'shift',
            targetId: shift.id,
            targetName: `Shift ${shift.id}`,
            metadata: { 
              staffId: createShiftDto.staffId,
              shiftDate: createShiftDto.shiftDate,
              shiftStartTime: createShiftDto.shiftStartTime,
              shiftEndTime: createShiftDto.shiftEndTime
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for shift creation:', auditError);
      }
      
      return { success: true, shift };
    } catch (error) {
      console.error('Error in createShift:', error);
      throw error;
    }
  }

  /**
   * Get all shifts with optional filters
   * GET /api/clubs/:clubId/shifts?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&staffId=uuid&role=Dealer
   */
  @Get(':clubId/shifts')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getShifts(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('staffId') staffId?: string,
    @Query('role') role?: StaffRole,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    try {
      // For DEALER role, enforce that they can only view their own shifts
      const user = req?.user;
      const clubIdFromHeader = req?.headers?.['x-club-id'] || clubId;
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isDealerOnly = userRoles.includes(ClubRole.DEALER) && 
                          !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR].includes(r));
      
      if (isDealerOnly && userId) {
        // DEALER can only view their own shifts - get their staff ID from email
        const userEntity = await this.usersService.findById(userId);
        if (userEntity?.email) {
          const allStaff = await this.staffManagementService.getAllStaff(clubId, {});
          const staffList = Array.isArray(allStaff) ? allStaff : [];
          const currentStaff = staffList.find(s => s.email === userEntity.email && s.role === StaffRole.DEALER);
          if (currentStaff) {
            staffId = currentStaff.id; // Force staffId to current dealer
            role = StaffRole.DEALER; // Force role to DEALER
          } else {
            throw new ForbiddenException('Dealer not found');
          }
        } else {
          throw new ForbiddenException('User email not found');
        }
      }

      const shifts = await this.shiftManagementService.getShifts(
        clubId,
        startDate,
        endDate,
        staffId,
        role,
      );
      return { success: true, shifts };
    } catch (error) {
      console.error('Error in getShifts:', error);
      throw error;
    }
  }

  /**
   * Get shift by ID
   * GET /api/clubs/:clubId/shifts/:shiftId
   */
  @Get(':clubId/shifts/:shiftId')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR)
  @UseGuards(RolesGuard)
  async getShiftById(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('shiftId', new ParseUUIDPipe()) shiftId: string,
  ) {
    try {
      const shift = await this.shiftManagementService.getShiftById(clubId, shiftId);
      return { success: true, shift };
    } catch (error) {
      console.error('Error in getShiftById:', error);
      throw error;
    }
  }

  /**
   * Update a shift
   * PATCH /api/clubs/:clubId/shifts/:shiftId
   */
  @Patch(':clubId/shifts/:shiftId')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateShift(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('shiftId', new ParseUUIDPipe()) shiftId: string,
    @Body() updateShiftDto: UpdateShiftDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing shift for audit log
      const existingShift = await this.shiftManagementService.getShiftById(clubId, shiftId);
      
      const shift = await this.shiftManagementService.updateShift(clubId, shiftId, updateShiftDto);
      
      // Audit log: Update shift
      try {
        if (userId && existingShift) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const changes: string[] = [];
          if (updateShiftDto.shiftStartTime !== undefined) {
            const existingStartTime = existingShift.shiftStartTime instanceof Date ? existingShift.shiftStartTime.toISOString() : existingShift.shiftStartTime;
            if (updateShiftDto.shiftStartTime !== existingStartTime) {
              changes.push(`startTime: ${existingStartTime} → ${updateShiftDto.shiftStartTime}`);
            }
          }
          if (updateShiftDto.shiftEndTime !== undefined) {
            const existingEndTime = existingShift.shiftEndTime instanceof Date ? existingShift.shiftEndTime.toISOString() : existingShift.shiftEndTime;
            if (updateShiftDto.shiftEndTime !== existingEndTime) {
              changes.push(`endTime: ${existingEndTime} → ${updateShiftDto.shiftEndTime}`);
            }
          }
          if (updateShiftDto.shiftDate !== undefined) {
            const existingDate = existingShift.shiftDate instanceof Date ? existingShift.shiftDate.toISOString().split('T')[0] : existingShift.shiftDate;
            if (updateShiftDto.shiftDate !== existingDate) {
              changes.push(`date: ${existingDate} → ${updateShiftDto.shiftDate}`);
            }
          }
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'shift_updated',
            actionCategory: ActionCategory.PAYROLL,
            description: `Updated shift ${shiftId}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
            targetType: 'shift',
            targetId: shiftId,
            targetName: `Shift ${shiftId}`,
            metadata: { 
              changes: changes,
              staffId: existingShift.staffId
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for shift update:', auditError);
      }
      
      return { success: true, shift };
    } catch (error) {
      console.error('Error in updateShift:', error);
      throw error;
    }
  }

  /**
   * Delete a shift
   * DELETE /api/clubs/:clubId/shifts/:shiftId
   */
  @Delete(':clubId/shifts/:shiftId')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UseGuards(RolesGuard)
  async deleteShift(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('shiftId', new ParseUUIDPipe()) shiftId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get existing shift for audit log (before deletion)
      const existingShift = await this.shiftManagementService.getShiftById(clubId, shiftId);
      
      const result = await this.shiftManagementService.deleteShift(clubId, shiftId);
      
      // Audit log: Delete shift
      try {
        if (userId && existingShift) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'shift_deleted',
            actionCategory: ActionCategory.PAYROLL,
            description: `Deleted shift for ${existingShift.staffId} on ${existingShift.shiftDate instanceof Date ? existingShift.shiftDate.toISOString().split('T')[0] : existingShift.shiftDate}${existingShift.shiftStartTime ? ` (${existingShift.shiftStartTime instanceof Date ? existingShift.shiftStartTime.toISOString() : existingShift.shiftStartTime} - ${existingShift.shiftEndTime instanceof Date ? existingShift.shiftEndTime.toISOString() : existingShift.shiftEndTime})` : ''}`,
            targetType: 'shift',
            targetId: shiftId,
            targetName: `Shift ${shiftId}`,
            metadata: { 
              staffId: existingShift.staffId,
              shiftDate: existingShift.shiftDate instanceof Date ? existingShift.shiftDate.toISOString().split('T')[0] : existingShift.shiftDate,
              shiftStartTime: existingShift.shiftStartTime instanceof Date ? existingShift.shiftStartTime.toISOString() : existingShift.shiftStartTime,
              shiftEndTime: existingShift.shiftEndTime instanceof Date ? existingShift.shiftEndTime.toISOString() : existingShift.shiftEndTime
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for shift deletion:', auditError);
      }
      
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in deleteShift:', error);
      throw error;
    }
  }

  /**
   * Copy shifts to new dates
   * POST /api/clubs/:clubId/shifts/copy
   */
  @Post(':clubId/shifts/copy')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async copyShifts(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() copyShiftDto: CopyShiftDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      const result = await this.shiftManagementService.copyShifts(clubId, copyShiftDto, userId);
      
      // Audit log: Copy shifts
      try {
        if (userId && result) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'shifts_copied',
            actionCategory: ActionCategory.PAYROLL,
            description: `Copied ${result.copiedShifts?.length || 0} shifts to ${copyShiftDto.targetDates?.length || 0} target date(s)`,
            targetType: 'shift',
            targetId: 'multiple',
            targetName: `Multiple Shifts`,
            metadata: { 
              shiftIds: copyShiftDto.shiftIds,
              targetDates: copyShiftDto.targetDates,
              copiedCount: result.copiedShifts?.length || 0
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for shift copy:', auditError);
      }
      
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in copyShifts:', error);
      throw error;
    }
  }

  /**
   * Get all dealers for shift assignment
   * GET /api/clubs/:clubId/shifts/dealers
   */
  @Get(':clubId/shifts-dealers')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR)
  @UseGuards(RolesGuard)
  async getDealersForShifts(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
  ) {
    try {
      const dealers = await this.shiftManagementService.getDealers(clubId);
      return { success: true, dealers };
    } catch (error) {
      console.error('Error in getDealersForShifts:', error);
      throw error;
    }
  }

  /**
   * Delete multiple shifts
   * POST /api/clubs/:clubId/shifts/delete-multiple
   */
  @Post(':clubId/shifts/delete-multiple')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async deleteMultipleShifts(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() body: { shiftIds: string[] },
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      const result = await this.shiftManagementService.deleteMultipleShifts(clubId, body.shiftIds);
      
      // Audit log: Delete multiple shifts
      try {
        if (userId && result) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'shifts_deleted_multiple',
            actionCategory: ActionCategory.PAYROLL,
            description: `Deleted ${result.deletedCount || body.shiftIds.length} shifts`,
            targetType: 'shift',
            targetId: 'multiple',
            targetName: `Multiple Shifts`,
            metadata: { 
              shiftIds: body.shiftIds,
              deletedCount: result.deletedCount || body.shiftIds.length
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for multiple shift deletion:', auditError);
      }
      
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in deleteMultipleShifts:', error);
      throw error;
    }
  }

  // =====================================================
  // PAYROLL MANAGEMENT
  // =====================================================

  /**
   * Process salary payment
   * POST /api/clubs/:clubId/payroll/salary
   */
  @Post(':clubId/payroll/salary')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async processSalary(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() processSalaryDto: ProcessSalaryDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      const payment = await this.payrollService.processSalary(clubId, processSalaryDto, userId);
      
      // Audit log: Process salary
      try {
        if (userId && payment) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'salary_processed',
            actionCategory: ActionCategory.PAYROLL,
            description: `Processed salary payment of ₹${processSalaryDto.baseSalary} for staff ${processSalaryDto.staffId} (Period: ${processSalaryDto.payPeriod})`,
            targetType: 'staff',
            targetId: processSalaryDto.staffId,
            targetName: `Staff ${processSalaryDto.staffId}`,
            metadata: { 
              staffId: processSalaryDto.staffId,
              baseSalary: processSalaryDto.baseSalary,
              payPeriod: processSalaryDto.payPeriod
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for salary processing:', auditError);
      }
      
      return { success: true, payment };
    } catch (error) {
      console.error('Error in processSalary:', error);
      throw error;
    }
  }

  /**
   * Get salary payments with pagination
   * GET /api/clubs/:clubId/payroll/salary?page=1&limit=10&search=&startDate=&endDate=&staffId=
   */
  @Get(':clubId/payroll/salary')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getSalaryPayments(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('staffId') staffId?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Request() req?: any,
  ) {
    try {
      // For STAFF/DEALER role, enforce that they can only view their own salary
      const user = req?.user;
      const clubIdFromHeader = headerClubId || clubId;
      
      // Check if user has STAFF or DEALER role and no other admin roles for this club
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isStaffOnly = userRoles.includes(ClubRole.STAFF) && 
                         !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER, ClubRole.DEALER].includes(r));
      const isDealerOnly = userRoles.includes(ClubRole.DEALER) && 
                          !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER].includes(r));
      
      if ((isStaffOnly || isDealerOnly) && userId) {
        // STAFF/DEALER role can only view their own data - get their staff ID from user email
        const userEntity = await this.usersService.findById(userId);
        if (userEntity?.email) {
          const allStaff = await this.staffManagementService.getAllStaff(clubId, {});
          const staffList = Array.isArray(allStaff) ? allStaff : [];
          const currentStaff = isDealerOnly 
            ? staffList.find(s => s.email === userEntity.email && s.role === StaffRole.DEALER)
            : staffList.find(s => s.email === userEntity.email);
          if (currentStaff) {
            staffId = currentStaff.id; // Force staffId to current staff member/dealer
          } else {
            throw new ForbiddenException(isDealerOnly ? 'Dealer not found' : 'Staff member not found');
          }
        } else {
          throw new ForbiddenException('User email not found');
        }
      }

      const result = await this.payrollService.getSalaryPayments(
        clubId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
        search,
        startDate,
        endDate,
        staffId,
      );
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in getSalaryPayments:', error);
      throw error;
    }
  }

  /**
   * Get salary payment by ID
   * GET /api/clubs/:clubId/payroll/salary/:paymentId
   */
  @Get(':clubId/payroll/salary/:paymentId')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getSalaryPaymentById(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
  ) {
    try {
      const payment = await this.payrollService.getSalaryPaymentById(clubId, paymentId);
      return { success: true, payment };
    } catch (error) {
      console.error('Error in getSalaryPaymentById:', error);
      throw error;
    }
  }

  /**
   * Get all staff for payroll
   * GET /api/clubs/:clubId/payroll/staff
   */
  @Get(':clubId/payroll/staff')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getAllStaffForPayroll(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
  ) {
    try {
      const staff = await this.payrollService.getAllStaffForPayroll(clubId);
      return { success: true, staff };
    } catch (error) {
      console.error('Error in getAllStaffForPayroll:', error);
      throw error;
    }
  }

  /**
   * Get dealers for payroll
   * GET /api/clubs/:clubId/payroll/dealers
   */
  @Get(':clubId/payroll/dealers')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getDealersForPayroll(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
  ) {
    try {
      const dealers = await this.payrollService.getDealersForPayroll(clubId);
      return { success: true, dealers };
    } catch (error) {
      console.error('Error in getDealersForPayroll:', error);
      throw error;
    }
  }

  // =====================================================
  // DEALER TIPS
  // =====================================================

  /**
   * Get tip settings
   * GET /api/clubs/:clubId/payroll/tips/settings
   */
  @Get(':clubId/payroll/tips/settings')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getTipSettings(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('dealerId') dealerId?: string,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    try {
      // For DEALER role, enforce that they can only view their own tip settings
      const user = req?.user;
      const clubIdFromHeader = req?.headers?.['x-club-id'] || clubId;
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isDealerOnly = userRoles.includes(ClubRole.DEALER) && 
                          !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER].includes(r));
      
      if (isDealerOnly && userId) {
        // DEALER can only view their own tip settings - get their staff ID from email
        const userEntity = await this.usersService.findById(userId);
        if (userEntity?.email) {
          const allStaff = await this.staffManagementService.getAllStaff(clubId, {});
          const staffList = Array.isArray(allStaff) ? allStaff : [];
          const currentStaff = staffList.find(s => s.email === userEntity.email && s.role === StaffRole.DEALER);
          if (currentStaff) {
            dealerId = currentStaff.id; // Force dealerId to current dealer
          } else {
            throw new ForbiddenException('Dealer not found');
          }
        } else {
          throw new ForbiddenException('User email not found');
        }
      }

      const settings = await this.payrollService.getTipSettings(clubId, dealerId);
      return { success: true, settings };
    } catch (error) {
      console.error('Error in getTipSettings:', error);
      throw error;
    }
  }

  /**
   * Update tip settings
   * POST /api/clubs/:clubId/payroll/tips/settings
   */
  @Post(':clubId/payroll/tips/settings')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateTipSettings(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() updateTipSettingsDto: UpdateTipSettingsDto,
    @Headers('x-user-id') userId?: string,
    @Query('dealerId') dealerId?: string,
    @Req() req?: Request
  ) {
    try {
      const settings = await this.payrollService.updateTipSettings(clubId, updateTipSettingsDto, userId, dealerId);
      
      // Audit log: Create/Update tip settings
      try {
        if (userId && settings) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'tip_settings_created',
            actionCategory: ActionCategory.PAYROLL,
            description: `Created/Updated tip settings${dealerId ? ` for dealer ${dealerId}` : ''} - Club Hold: ${updateTipSettingsDto.clubHoldPercentage}%, Dealer Share: ${updateTipSettingsDto.dealerSharePercentage}%, Floor Manager: ${updateTipSettingsDto.floorManagerPercentage}%`,
            targetType: dealerId ? 'staff' : 'system',
            targetId: dealerId || 'system',
            targetName: dealerId ? `Dealer ${dealerId}` : 'Tip Settings',
            metadata: { 
              dealerId: dealerId,
              clubHoldPercentage: updateTipSettingsDto.clubHoldPercentage,
              dealerSharePercentage: updateTipSettingsDto.dealerSharePercentage,
              floorManagerPercentage: updateTipSettingsDto.floorManagerPercentage
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for tip settings update:', auditError);
      }
      
      return { success: true, settings };
    } catch (error) {
      console.error('Error in updateTipSettings:', error);
      throw error;
    }
  }

  /**
   * Process dealer tips
   * POST /api/clubs/:clubId/payroll/tips
   */
  @Post(':clubId/payroll/tips')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async processDealerTips(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() processDealerTipsDto: ProcessDealerTipsDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      const tips = await this.payrollService.processDealerTips(clubId, processDealerTipsDto, userId);
      
      // Audit log: Distribute tips
      try {
        if (userId && tips) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          const totalAmount = Array.isArray(tips) 
            ? tips.reduce((sum, tip) => sum + (Number(tip.totalTips) || 0), 0)
            : (Number(tips.totalTips) || 0);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'tips_distributed',
            actionCategory: ActionCategory.PAYROLL,
            description: `Distributed tips totaling ₹${totalAmount}${processDealerTipsDto.dealerId ? ` to dealer ${processDealerTipsDto.dealerId}` : ' to dealers'}`,
            targetType: processDealerTipsDto.dealerId ? 'staff' : 'system',
            targetId: processDealerTipsDto.dealerId || 'multiple',
            targetName: processDealerTipsDto.dealerId ? `Dealer ${processDealerTipsDto.dealerId}` : 'Multiple Dealers',
            metadata: { 
              dealerId: processDealerTipsDto.dealerId,
              totalAmount: totalAmount,
              tipCount: Array.isArray(tips) ? tips.length : 1
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for tip distribution:', auditError);
      }
      
      return { success: true, tips };
    } catch (error) {
      console.error('Error in processDealerTips:', error);
      throw error;
    }
  }

  /**
   * Get dealer tips with pagination
   * GET /api/clubs/:clubId/payroll/tips?page=1&limit=10&search=&startDate=&endDate=&dealerId=&status=
   */
  @Get(':clubId/payroll/tips')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getDealerTips(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dealerId') dealerId?: string,
    @Query('status') status?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Request() req?: any,
  ) {
    try {
      // For DEALER role, enforce that they can only view their own tips
      const user = req?.user;
      const clubIdFromHeader = headerClubId || clubId;
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isDealerOnly = userRoles.includes(ClubRole.DEALER) && 
                          !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR].includes(r));
      
      if (isDealerOnly && userId) {
        // DEALER can only view their own tips - get their staff ID from email
        const userEntity = await this.usersService.findById(userId);
        if (userEntity?.email) {
          const allStaff = await this.staffManagementService.getAllStaff(clubId, {});
          const staffList = Array.isArray(allStaff) ? allStaff : [];
          const currentStaff = staffList.find(s => s.email === userEntity.email && s.role === StaffRole.DEALER);
          if (currentStaff) {
            dealerId = currentStaff.id; // Force dealerId to current dealer
          } else {
            throw new ForbiddenException('Dealer not found');
          }
        } else {
          throw new ForbiddenException('User email not found');
        }
      }

      const result = await this.payrollService.getDealerTips(
        clubId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
        search,
        startDate,
        endDate,
        dealerId,
        status as any,
      );
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in getDealerTips:', error);
      throw error;
    }
  }

  /**
   * Get dealer tips summary
   * GET /api/clubs/:clubId/payroll/tips/:dealerId/summary?startDate=&endDate=
   */
  @Get(':clubId/payroll/tips/:dealerId/summary')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getDealerTipsSummary(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('dealerId', new ParseUUIDPipe()) dealerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const summary = await this.payrollService.getDealerTipsSummary(clubId, dealerId, startDate, endDate);
      return { success: true, summary };
    } catch (error) {
      console.error('Error in getDealerTipsSummary:', error);
      throw error;
    }
  }

  // =====================================================
  // DEALER CASHOUTS
  // =====================================================

  /**
   * Process dealer cashout
   * POST /api/clubs/:clubId/payroll/cashout
   */
  @Post(':clubId/payroll/cashout')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async processDealerCashout(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Body() processDealerCashoutDto: ProcessDealerCashoutDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      const cashout = await this.payrollService.processDealerCashout(clubId, processDealerCashoutDto, userId);
      
      // Audit log: Process cashout
      try {
        if (userId && cashout) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'cashout_processed',
            actionCategory: ActionCategory.PAYROLL,
            description: `Processed cashout of ₹${processDealerCashoutDto.amount} for dealer ${processDealerCashoutDto.dealerId} on ${processDealerCashoutDto.cashoutDate}`,
            targetType: 'staff',
            targetId: processDealerCashoutDto.dealerId,
            targetName: `Dealer ${processDealerCashoutDto.dealerId}`,
            metadata: { 
              dealerId: processDealerCashoutDto.dealerId,
              amount: processDealerCashoutDto.amount,
              cashoutDate: processDealerCashoutDto.cashoutDate
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for cashout processing:', auditError);
      }
      
      return { success: true, cashout };
    } catch (error) {
      console.error('Error in processDealerCashout:', error);
      throw error;
    }
  }

  /**
   * Get dealer cashouts with pagination
   * GET /api/clubs/:clubId/payroll/cashout?page=1&limit=10&search=&startDate=&endDate=&dealerId=
   */
  @Get(':clubId/payroll/cashout')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getDealerCashouts(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dealerId') dealerId?: string,
  ) {
    try {
      const result = await this.payrollService.getDealerCashouts(
        clubId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
        search,
        startDate,
        endDate,
        dealerId,
      );
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in getDealerCashouts:', error);
      throw error;
    }
  }

  // =============================================================================
  // BONUS MANAGEMENT
  // =============================================================================

  /**
   * Process player bonus
   * POST /api/clubs/:clubId/bonuses/players
   */
  @Post(':clubId/bonuses/players')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async processPlayerBonus(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreatePlayerBonusDto,
    @Req() req?: Request
  ) {
    try {
      const bonus = await this.bonusService.processPlayerBonus(clubId, dto, userId);
      
      // Audit log: Process player bonus
      try {
        if (userId && bonus) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          // Get player name for audit log
          const player = await this.playersRepo.findOne({ where: { id: dto.playerId } });
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'player_bonus_processed',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Processed ${dto.bonusType} bonus of ₹${dto.bonusAmount} for player ${player?.name || dto.playerId}${dto.reason ? ` - Reason: ${dto.reason}` : ''}`,
            targetType: 'player',
            targetId: dto.playerId,
            targetName: player?.name || dto.playerId,
            metadata: { 
              playerId: dto.playerId,
              bonusType: dto.bonusType,
              bonusAmount: dto.bonusAmount,
              reason: dto.reason
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for player bonus processing:', auditError);
      }
      
      return { success: true, bonus };
    } catch (error) {
      console.error('Error in processPlayerBonus:', error);
      throw error;
    }
  }

  /**
   * Get player bonuses with pagination and filters
   * GET /api/clubs/:clubId/bonuses/players
   */
  @Get(':clubId/bonuses/players')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getPlayerBonuses(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('playerId') playerId?: string,
  ) {
    try {
      const result = await this.bonusService.getPlayerBonuses(
        clubId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
        search,
        startDate,
        endDate,
        playerId,
      );
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in getPlayerBonuses:', error);
      throw error;
    }
  }

  /**
   * Get all players for bonus processing (KYC approved/verified only)
   * GET /api/clubs/:clubId/bonuses/players/list
   */
  @Get(':clubId/bonuses/players/list')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getPlayersForBonus(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('search') search?: string,
  ) {
    try {
      const players = await this.bonusService.getAllPlayersForBonus(clubId, search);
      return { success: true, players };
    } catch (error) {
      console.error('Error in getPlayersForBonus:', error);
      throw error;
    }
  }

  /**
   * Process staff bonus
   * POST /api/clubs/:clubId/bonuses/staff
   */
  @Post(':clubId/bonuses/staff')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async processStaffBonus(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateStaffBonusDto,
    @Req() req?: Request
  ) {
    try {
      const bonus = await this.bonusService.processStaffBonus(clubId, dto, userId);
      
      // Audit log: Process staff bonus
      try {
        if (userId && bonus) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          // Get staff member name for audit log
          const targetStaff = await this.staffService.findOne(dto.staffId, clubId);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'staff_bonus_processed',
            actionCategory: ActionCategory.PAYROLL,
            description: `Processed ${dto.bonusType} bonus of ₹${dto.bonusAmount} for staff ${targetStaff?.name || dto.staffId}${dto.reason ? ` - Reason: ${dto.reason}` : ''}`,
            targetType: 'staff',
            targetId: dto.staffId,
            targetName: targetStaff?.name || dto.staffId,
            metadata: { 
              staffId: dto.staffId,
              bonusType: dto.bonusType,
              bonusAmount: dto.bonusAmount,
              reason: dto.reason
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for staff bonus processing:', auditError);
      }
      
      return { success: true, bonus };
    } catch (error) {
      console.error('Error in processStaffBonus:', error);
      throw error;
    }
  }

  /**
   * Get staff bonuses with pagination and filters
   * GET /api/clubs/:clubId/bonuses/staff
   */
  @Get(':clubId/bonuses/staff')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getStaffBonuses(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('staffId') staffId?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-club-id') headerClubId?: string,
    @Request() req?: any,
  ) {
    try {
      // For STAFF role, enforce that they can only view their own bonuses
      const user = req?.user;
      const clubIdFromHeader = headerClubId || clubId;
      
      // Check if user has STAFF role and no other admin roles for this club
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isStaffOnly = userRoles.includes(ClubRole.STAFF) && 
                         !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR].includes(r));
      
      if (isStaffOnly && userId) {
        // STAFF role can only view their own data - get their staff ID from user email
        const userEntity = await this.usersService.findById(userId);
        if (userEntity?.email) {
          const allStaff = await this.staffManagementService.getAllStaff(clubId, {});
          const staffList = Array.isArray(allStaff) ? allStaff : [];
          const currentStaff = staffList.find(s => s.email === userEntity.email);
          if (currentStaff) {
            staffId = currentStaff.id; // Force staffId to current staff member
          } else {
            throw new ForbiddenException('Staff member not found');
          }
        } else {
          throw new ForbiddenException('User email not found');
        }
      }

      const result = await this.bonusService.getStaffBonuses(
        clubId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
        search,
        startDate,
        endDate,
        staffId,
      );
      return { success: true, ...result };
    } catch (error) {
      console.error('Error in getStaffBonuses:', error);
      throw error;
    }
  }

  /**
   * Get all staff for bonus processing
   * GET /api/clubs/:clubId/bonuses/staff/list
   */
  @Get(':clubId/bonuses/staff/list')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  async getStaffForBonus(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('search') search?: string,
  ) {
    try {
      const staff = await this.bonusService.getAllStaffForBonus(clubId, search);
      return { success: true, staff };
    } catch (error) {
      console.error('Error in getStaffForBonus:', error);
      throw error;
    }
  }

  // ========== FINANCIAL OVERRIDES ==========

  /**
   * Get all transactions (player and staff) for financial overrides
   * GET /api/clubs/:clubId/financial-overrides/transactions
   */
  @Get(':clubId/financial-overrides/transactions')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.CASHIER, ClubRole.DEALER, ClubRole.AFFILIATE)
  @UseGuards(RolesGuard)
  async getAllTransactionsForOverrides(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Query('category') category?: 'player' | 'staff',
    @Query('subCategory') subCategory?: 'dealer-cashout' | 'salary-bonus',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    try {
      // For DEALER role, enforce that they can only view their own transactions
      const user = req?.user;
      const clubIdFromHeader = req?.headers?.['x-club-id'] || clubId;
      const clubRoleEntry = user?.clubRoles?.find((cr: any) => cr.clubId === clubIdFromHeader);
      const userRoles = clubRoleEntry?.roles || [];
      const isDealerOnly = userRoles.includes(ClubRole.DEALER) && 
                          !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN].includes(r));
      const isAffiliateOnly = userRoles.includes(ClubRole.AFFILIATE) && 
                             !userRoles.some((r: ClubRole) => [ClubRole.SUPER_ADMIN, ClubRole.ADMIN].includes(r));
      
      // Force category and subCategory for DEALER and AFFILIATE
      let finalCategory = category;
      let finalSubCategory = subCategory;
      if (isDealerOnly) {
        finalCategory = 'staff';
        finalSubCategory = 'dealer-cashout';
      } else if (isAffiliateOnly) {
        finalCategory = 'player';
        // Affiliates see player transactions related to their referrals
      }

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;

      const result = await this.financialOverridesService.getAllTransactions(
        clubId,
        finalCategory,
        finalSubCategory,
        pageNum,
        limitNum,
      );
      
      // Filter results for DEALER if needed
      if (isDealerOnly && userId && result.transactions) {
        // Get dealer's staff ID and filter transactions
        const userEntity = await this.usersService.findById(userId);
        if (userEntity?.email) {
          const allStaff = await this.staffManagementService.getAllStaff(clubId, {});
          const staffList = Array.isArray(allStaff) ? allStaff : [];
          const currentDealer = staffList.find(s => s.email === userEntity.email && s.role === StaffRole.DEALER);
          if (currentDealer) {
            // Filter transactions to only show those related to this dealer
            result.transactions = result.transactions.filter((t: any) => 
              t.entityId === currentDealer.id || t.dealerId === currentDealer.id
            );
            result.total = result.transactions.length;
            result.totalPages = Math.ceil(result.total / limitNum);
          }
        }
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('Error in getAllTransactionsForOverrides:', error);
      throw error;
    }
  }

  /**
   * Edit financial transaction
   * PUT /api/clubs/:clubId/financial-overrides/transactions/:transactionId/edit
   */
  @Put(':clubId/financial-overrides/transactions/:transactionId/edit')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async editTransaction(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() editTransactionDto: EditTransactionDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get original transaction for audit log
      const originalTransaction = await this.financialTransactionsService.findOne(transactionId, clubId);
      
      // Use the financial overrides service to edit ANY transaction type
      const transaction = await this.financialOverridesService.editAnyTransaction(
        transactionId,
        clubId,
        editTransactionDto.amount,
        editTransactionDto.reason,
        userId,
      );

      // Audit log: Edit transaction (override)
      try {
        if (userId && originalTransaction) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'transaction_edited_override',
            actionCategory: ActionCategory.OVERRIDE,
            description: `Edited ${originalTransaction.type} transaction of ₹${originalTransaction.amount} to ₹${editTransactionDto.amount} for player ${originalTransaction.playerName} (Override)`,
            targetType: 'player',
            targetId: originalTransaction.playerId,
            targetName: originalTransaction.playerName,
            metadata: { 
              transactionId: transactionId,
              type: originalTransaction.type,
              previousAmount: originalTransaction.amount,
              newAmount: editTransactionDto.amount,
              reason: editTransactionDto.reason
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for transaction edit override:', auditError);
      }

      return { success: true, transaction };
    } catch (error) {
      console.error('Error in editTransaction:', error);
      throw error;
    }
  }

  /**
   * Cancel financial transaction
   * POST /api/clubs/:clubId/financial-overrides/transactions/:transactionId/cancel
   */
  @Post(':clubId/financial-overrides/transactions/:transactionId/cancel')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.CASHIER)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async cancelTransactionOverride(
    @Param('clubId', new ParseUUIDPipe()) clubId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() cancelTransactionDto: CancelTransactionDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    try {
      // Get original transaction for audit log
      const originalTransaction = await this.financialTransactionsService.findOne(transactionId, clubId);
      
      const transaction = await this.financialTransactionsService.cancelTransaction(
        transactionId,
        clubId,
        cancelTransactionDto,
        userId,
      );

      // Audit log: Cancel transaction (override)
      try {
        if (userId && originalTransaction) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'transaction_cancelled_override',
            actionCategory: ActionCategory.OVERRIDE,
            description: `Cancelled ${originalTransaction.type} transaction of ₹${originalTransaction.amount} for player ${originalTransaction.playerName} (Override)`,
            targetType: 'player',
            targetId: originalTransaction.playerId,
            targetName: originalTransaction.playerName,
            metadata: { 
              transactionId: transactionId,
              type: originalTransaction.type,
              amount: originalTransaction.amount,
              reason: cancelTransactionDto.reason
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for transaction cancel override:', auditError);
      }

      return { success: true, transaction };
    } catch (error) {
      console.error('Error in cancelTransactionOverride:', error);
      throw error;
    }
  }

  // ==================== CHAT ENDPOINTS ====================

  /**
   * Create staff chat session
   * POST /api/clubs/:clubId/chat/staff/sessions
   */
  @Post(':clubId/chat/staff/sessions')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async createStaffChatSession(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Body() dto: CreateStaffChatSessionDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const session = await this.chatService.createStaffChatSession(clubId, userId || '', dto);
    
    // Audit log: Create staff chat session
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'chat_session_created_staff',
          actionCategory: ActionCategory.SYSTEM,
          description: `Created staff chat session with recipient ${dto.recipientStaffId}${dto.subject ? ` - Subject: ${dto.subject}` : ''}`,
          targetType: 'chat_session',
          targetId: session.id,
          targetName: `Staff Chat Session`,
          metadata: { 
            sessionType: 'staff',
            recipientStaffId: dto.recipientStaffId,
            subject: dto.subject
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for staff chat session creation:', auditError);
    }
    
    return { success: true, session };
  }

  /**
   * Get all chatable users for a club (staff + Super Admin + Admin users)
   * GET /api/clubs/:clubId/chat/chatable-users
   */
  @Get(':clubId/chat/chatable-users')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getChatableUsers(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    try {
      const users = await this.chatService.getChatableUsers(clubId, tenantId);
      return { success: true, users };
    } catch (error) {
      console.error('Error in getChatableUsers:', error);
      throw error;
    }
  }

  /**
   * Get staff chat sessions
   * GET /api/clubs/:clubId/chat/staff/sessions
   */
  @Get(':clubId/chat/staff/sessions')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getStaffChatSessions(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const result = await this.chatService.getStaffChatSessions(
      clubId,
      userId || '',
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      role
    );
    return { success: true, ...result };
  }

  /**
   * Create player chat session
   * POST /api/clubs/:clubId/chat/player/sessions
   */
  @Post(':clubId/chat/player/sessions')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB)
  @UseGuards(RolesGuard)
  async createPlayerChatSession(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Body() dto: CreatePlayerChatSessionDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const session = await this.chatService.createPlayerChatSession(clubId, dto);
    
    // Audit log: Create player chat session
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'chat_session_created_player',
          actionCategory: ActionCategory.SYSTEM,
          description: `Created player chat session${dto.playerId ? ` for player ${dto.playerId}` : ''}`,
          targetType: 'chat_session',
          targetId: session.id,
          targetName: `Player Chat Session`,
          metadata: { 
            sessionType: 'player',
            playerId: dto.playerId
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for player chat session creation:', auditError);
    }
    
    return { success: true, session };
  }

  /**
   * Get player chat sessions
   * GET /api/clubs/:clubId/chat/player/sessions
   */
  @Get(':clubId/chat/player/sessions')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB)
  @UseGuards(RolesGuard)
  async getPlayerChatSessions(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.chatService.getPlayerChatSessions(
      clubId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status as any,
      search
    );
    return { success: true, ...result };
  }

  /**
   * Send message
   * POST /api/clubs/:clubId/chat/sessions/:sessionId/messages
   */
  @Post(':clubId/chat/sessions/:sessionId/messages')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async sendMessage(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const message = await this.chatService.sendMessage(clubId, sessionId, userId || '', dto);
    
    // Audit log: Send chat message
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'chat_message_sent',
          actionCategory: ActionCategory.SYSTEM,
          description: `Sent chat message in session ${sessionId}${dto.message ? `: ${dto.message.substring(0, 50)}${dto.message.length > 50 ? '...' : ''}` : ''}`,
          targetType: 'chat_message',
          targetId: message.id,
          targetName: `Chat Message`,
          metadata: { 
            sessionId: sessionId,
            hasMessage: !!dto.message
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for chat message send:', auditError);
    }
    
    return { success: true, message };
  }

  /**
   * Get session messages
   * GET /api/clubs/:clubId/chat/sessions/:sessionId/messages
   */
  @Get(':clubId/chat/sessions/:sessionId/messages')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getSessionMessages(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const result = await this.chatService.getSessionMessages(
      clubId,
      sessionId,
      userId || '',
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50
    );
    return { success: true, ...result };
  }

  /**
   * Update chat session
   * PATCH /api/clubs/:clubId/chat/sessions/:sessionId
   */
  @Patch(':clubId/chat/sessions/:sessionId')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UseGuards(RolesGuard)
  async updateChatSession(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateChatSessionDto,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const session = await this.chatService.updateChatSession(clubId, sessionId, dto);
    
    // Audit log: Update chat session
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        const changes: string[] = [];
        if (dto.status !== undefined) {
          changes.push(`status: ${dto.status}`);
        }
        if (dto.assignedStaffId !== undefined) {
          changes.push(`assignedStaffId: ${dto.assignedStaffId}`);
        }
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'chat_session_updated',
          actionCategory: ActionCategory.SYSTEM,
          description: `Updated chat session ${sessionId}: ${changes.length > 0 ? changes.join(', ') : 'details updated'}`,
          targetType: 'chat_session',
          targetId: sessionId,
          targetName: `Chat Session ${sessionId}`,
          metadata: { 
            sessionId: sessionId,
            changes: changes
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for chat session update:', auditError);
    }
    
    return { success: true, session };
  }

  /**
   * Archive chat session (one-sided deletion)
   * DELETE /api/clubs/:clubId/chat/sessions/:sessionId
   */
  @Delete(':clubId/chat/sessions/:sessionId')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async archiveChatSession(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const session = await this.chatService.archiveChatSession(clubId, sessionId, userId || '');
    
    // Audit log: Archive chat session
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'chat_session_archived',
          actionCategory: ActionCategory.SYSTEM,
          description: `Archived chat session ${sessionId}`,
          targetType: 'chat_session',
          targetId: sessionId,
          targetName: `Chat Session ${sessionId}`,
          metadata: { 
            sessionId: sessionId
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for chat session archive:', auditError);
    }
    
    return { success: true, session };
  }

  /**
   * Get unread counts
   * GET /api/clubs/:clubId/chat/unread-counts
   */
  @Get(':clubId/chat/unread-counts')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.GRE, ClubRole.CASHIER, ClubRole.FNB, ClubRole.STAFF, ClubRole.DEALER)
  @UseGuards(RolesGuard)
  async getUnreadCounts(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const counts = await this.chatService.getUnreadCounts(clubId, userId || '');
    return { success: true, ...counts };
  }

  // ==================== REPORTS ENDPOINTS ====================

  /**
   * Generate report
   * POST /api/clubs/:clubId/reports/generate
   */
  @Post(':clubId/reports/generate')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UseGuards(RolesGuard)
  async generateReport(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Body() dto: GenerateReportDto,
    @Res() res: any,
    @Headers('x-user-id') userId?: string,
    @Req() req?: Request
  ) {
    const buffer = await this.reportsService.generateReport(clubId, dto);
    
    // Audit log: Generate report
    try {
      if (userId) {
        const user = await this.usersService.findById(userId);
        const allStaff = await this.staffService.findAll(clubId);
        const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
        
        await this.auditLogsService.logAction({
          clubId,
          staffId: staff?.id || userId,
          staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
          staffRole: staff?.role || 'Admin',
          actionType: 'report_generated',
          actionCategory: ActionCategory.SYSTEM,
          description: `Generated ${dto.reportType} report (Format: ${dto.format}${dto.startDate && dto.endDate ? `, Date Range: ${dto.startDate} to ${dto.endDate}` : ''})`,
          targetType: 'report',
          targetId: `report_${Date.now()}`,
          targetName: `${dto.reportType} Report`,
          metadata: { 
            reportType: dto.reportType,
            format: dto.format,
            startDate: dto.startDate,
            endDate: dto.endDate
          },
          ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
          userAgent: (req as any)?.headers?.['user-agent'] || undefined
        });
      }
    } catch (auditError) {
      console.error('Failed to create audit log for report generation:', auditError);
    }
    
    const filename = `${dto.reportType}_report_${new Date().toISOString().split('T')[0]}.${dto.format === 'excel' ? 'xlsx' : 'pdf'}`;
    const contentType = dto.format === 'excel' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  /**
   * ============================================
   * AUDIT LOGS ENDPOINTS
   * ============================================
   */

  /**
   * Get audit logs with pagination and filters
   * GET /api/clubs/:clubId/audit-logs
   */
  @Get(':clubId/audit-logs')
  @Roles(ClubRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getAuditLogs(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Query() query: any,
  ) {
    return await this.auditLogsService.getAuditLogs(clubId, query);
  }

  /**
   * Get audit log statistics
   * GET /api/clubs/:clubId/audit-logs/statistics
   */
  @Get(':clubId/audit-logs/statistics')
  @Roles(ClubRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getAuditLogStatistics(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Query('days') days?: number,
  ) {
    return await this.auditLogsService.getStatistics(clubId, days);
  }

  /**
   * ============================================
   * SYSTEM CONTROL - FACTORY RESET
   * ============================================
   */

  /**
   * Factory Reset - Wipe all club data
   * POST /api/clubs/:clubId/system/factory-reset
   * WARNING: This is destructive and irreversible
   */
  @Post(':clubId/system/factory-reset')
  @Roles(ClubRole.SUPER_ADMIN, ClubRole.ADMIN)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @HttpCode(HttpStatus.OK)
  async factoryReset(
    @Param('clubId', ParseUUIDPipe) clubId: string,
    @Body() dto: FactoryResetDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    // Verify confirmation text
    if (dto.confirmationText !== 'DELETE ALL DATA') {
      throw new BadRequestException('Confirmation text must be exactly "DELETE ALL DATA"');
    }

    // Verify club exists
    const club = await this.clubsService.findById(clubId);
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Verify user password
    const user = await this.usersService.findById(userId, true); // Include password hash
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('User does not have a password set');
    }

    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Get staff member to determine actual role
    const allStaff = await this.staffService.findAll(clubId);
    const staff = allStaff.find(s => s.userId === userId || s.email === user.email);
    const staffRole = staff?.role || 'Super Admin';

    // Log the factory reset action
    await this.auditLogsService.logAction({
      clubId,
      staffId: staff?.id || userId,
      staffName: user.displayName || user.email,
      staffRole: staffRole,
      actionType: 'factory_reset',
      actionCategory: ActionCategory.SYSTEM,
      description: `FACTORY RESET: All club data wiped by ${user.displayName || user.email} (${staffRole})`,
    });

    // Execute factory reset - delete all data (preserves SUPER_ADMIN and ADMIN accounts)
    await this.clubsService.factoryReset(clubId);

    return {
      success: true,
      message: 'Factory reset completed successfully. All club data has been wiped. Admin and Super Admin accounts have been preserved.',
      clubId,
      resetAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // RAKE COLLECTION ENDPOINTS (Manager Only)
  // ============================================================================

  @Get(':id/rake-collections/active-tables')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getActiveTablesForRakeCollection(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access tables for your assigned club');
        }
      }
      const tables = await this.rakeCollectionService.getActiveTables(clubId);
      return tables;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get active tables: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/rake-collections')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createRakeCollection(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateRakeCollectionDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only create rake collections for your assigned club');
        }
      }
      if (!userId) {
        throw new BadRequestException('x-user-id header is required');
      }
      const collection = await this.rakeCollectionService.createRakeCollection(clubId, dto, userId);
      
      // Audit log: Create rake collection
      try {
        if (userId && collection) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'rake_collection_created',
            actionCategory: ActionCategory.TABLE_MANAGEMENT,
            description: `Created rake collection for Table ${dto.tableId} - Amount: ₹${dto.totalRakeAmount}${dto.notes ? ` (${dto.notes})` : ''}`,
            targetType: 'table',
            targetId: dto.tableId,
            targetName: `Table ${dto.tableId}`,
            metadata: { 
              tableId: dto.tableId,
              totalRakeAmount: dto.totalRakeAmount,
              notes: dto.notes
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for rake collection creation:', auditError);
      }
      
      return collection;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to create rake collection: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/rake-collections')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getRakeCollections(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query() query: QueryRakeCollectionsDto
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access rake collections for your assigned club');
        }
      }
      const result = await this.rakeCollectionService.getRakeCollections(clubId, query);
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get rake collections: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/rake-collections/stats')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getRakeCollectionStats(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access rake collection stats for your assigned club');
        }
      }
      const stats = await this.rakeCollectionService.getRakeCollectionStats(clubId, startDate, endDate);
      return stats;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get rake collection stats: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // BUY-OUT REQUEST ENDPOINTS (Manager Only)
  // ============================================================================

  @Get(':id/buyout-requests')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  async getBuyOutRequests(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('status') status?: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access buy-out requests for your assigned club');
        }
      }
      const requests = await this.buyOutRequestService.getPendingBuyOutRequests(clubId);
      return requests;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get buy-out requests: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/buyout-requests/:requestId/approve')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async approveBuyOutRequest(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: ApproveBuyOutDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only approve buy-out requests for your assigned club');
        }
      }
      if (!userId) {
        throw new BadRequestException('x-user-id header is required');
      }
      
      // Get request details for audit log
      const buyOutRequest = await this.buyOutRequestService.getPendingBuyOutRequests(clubId);
      const request = buyOutRequest.find(r => r.id === requestId);
      
      const result = await this.buyOutRequestService.approveBuyOutRequest(clubId, requestId, dto, userId);
      
      // Audit log: Approve buyout request
      try {
        if (userId && request) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'buyout_request_approved',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Approved buyout request of ₹${result.amount} for player ${request.playerName} (Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''})`,
            targetType: 'player',
            targetId: request.playerId,
            targetName: request.playerName,
            metadata: { 
              requestId: requestId,
              amount: result.amount,
              tableNumber: request.tableNumber,
              seatNumber: request.seatNumber
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for buyout approval:', auditError);
      }
      
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to approve buy-out request: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/buyout-requests/:requestId/reject')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rejectBuyOutRequest(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: RejectBuyOutDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only reject buy-out requests for your assigned club');
        }
      }
      if (!userId) {
        throw new BadRequestException('x-user-id header is required');
      }
      
      // Get request details for audit log
      const buyOutRequest = await this.buyOutRequestService.getPendingBuyOutRequests(clubId);
      const request = buyOutRequest.find(r => r.id === requestId);
      
      const result = await this.buyOutRequestService.rejectBuyOutRequest(clubId, requestId, dto, userId);
      
      // Audit log: Reject buyout request
      try {
        if (userId && request) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'buyout_request_rejected',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Rejected buyout request for player ${request.playerName} (Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''}) - Reason: ${dto.reason}`,
            targetType: 'player',
            targetId: request.playerId,
            targetName: request.playerName,
            metadata: { 
              requestId: requestId,
              reason: dto.reason,
              tableNumber: request.tableNumber,
              seatNumber: request.seatNumber
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for buyout rejection:', auditError);
      }
      
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to reject buy-out request: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // =========================================================================
  // BUY-IN REQUESTS (Cashier)
  // =========================================================================

  @Get(':id/buyin-requests')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  async getBuyInRequests(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('status') status?: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access buy-in requests for your assigned club');
        }
      }
      const requests = await this.buyInRequestService.getPendingBuyInRequests(clubId);
      return requests;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get buy-in requests: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/buyin-requests/:requestId/approve')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async approveBuyInRequest(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: ApproveBuyInDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only approve buy-in requests for your assigned club');
        }
      }
      if (!userId) {
        throw new BadRequestException('x-user-id header is required');
      }
      
      // Get request details for audit log
      const buyInRequest = await this.buyInRequestService.getPendingBuyInRequests(clubId);
      const request = buyInRequest.find(r => r.id === requestId);
      
      const result = await this.buyInRequestService.approveBuyInRequest(clubId, requestId, dto, userId);
      
      // Audit log: Approve buyin request
      try {
        if (userId && request) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'buyin_request_approved',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Approved buyin request of ₹${result.amount} for player ${request.playerName} (Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''})`,
            targetType: 'player',
            targetId: request.playerId,
            targetName: request.playerName,
            metadata: { 
              requestId: requestId,
              amount: result.amount,
              tableNumber: request.tableNumber,
              seatNumber: request.seatNumber
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for buyin approval:', auditError);
      }
      
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to approve buy-in request: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/buyin-requests/:requestId/reject')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rejectBuyInRequest(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: RejectBuyInDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only reject buy-in requests for your assigned club');
        }
      }
      if (!userId) {
        throw new BadRequestException('x-user-id header is required');
      }
      
      // Get request details for audit log
      const buyInRequest = await this.buyInRequestService.getPendingBuyInRequests(clubId);
      const request = buyInRequest.find(r => r.id === requestId);
      
      const result = await this.buyInRequestService.rejectBuyInRequest(clubId, requestId, dto, userId);
      
      // Audit log: Reject buyin request
      try {
        if (userId && request) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'buyin_request_rejected',
            actionCategory: ActionCategory.FINANCIAL,
            description: `Rejected buyin request for player ${request.playerName} (Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''}) - Reason: ${dto.reason}`,
            targetType: 'player',
            targetId: request.playerId,
            targetName: request.playerName,
            metadata: { 
              requestId: requestId,
              reason: dto.reason,
              tableNumber: request.tableNumber,
              seatNumber: request.seatNumber
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for buyin rejection:', auditError);
      }
      
      return result;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to reject buy-in request: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // =========================================================================
  // ATTENDANCE TRACKING (HR)
  // =========================================================================

  @Get(':id/attendance')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR)
  async getAttendanceRecords(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('staffId') staffId?: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access attendance records for your assigned club');
        }
      }
      const records = await this.attendanceTrackingService.getAttendanceRecords(
        clubId,
        startDate,
        endDate,
        staffId
      );
      return records;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get attendance records: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Get(':id/attendance/stats')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR)
  async getAttendanceStats(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only access attendance stats for your assigned club');
        }
      }
      const stats = await this.attendanceTrackingService.getAttendanceStats(clubId, startDate, endDate);
      return stats;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to get attendance stats: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  @Post(':id/attendance')
  @Roles(TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createAttendanceRecord(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-club-id') headerClubId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id', new ParseUUIDPipe()) clubId: string,
    @Body() dto: CreateAttendanceDto,
    @Req() req?: Request
  ) {
    try {
      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
        if (headerClubId.trim() !== clubId) {
          throw new ForbiddenException('You can only create attendance records for your assigned club');
        }
      }
      const record = await this.attendanceTrackingService.createAttendanceRecord(clubId, dto, userId || '');
      
      // Audit log: Record attendance
      try {
        if (userId && record) {
          const user = await this.usersService.findById(userId);
          const allStaff = await this.staffService.findAll(clubId);
          const staff = allStaff.find(s => s.userId === userId || s.email === user?.email);
          
          await this.auditLogsService.logAction({
            clubId,
            staffId: staff?.id || userId,
            staffName: staff?.name || user?.displayName || user?.email || 'Unknown',
            staffRole: staff?.role || 'Admin',
            actionType: 'attendance_recorded',
            actionCategory: ActionCategory.PAYROLL,
            description: `Recorded attendance for staff ${dto.staffId} on ${dto.date}${dto.loginTime ? ` (Login: ${dto.loginTime}${dto.logoutTime ? `, Logout: ${dto.logoutTime}` : ''})` : ''}`,
            targetType: 'staff',
            targetId: dto.staffId,
            targetName: `Staff ${dto.staffId}`,
            metadata: { 
              staffId: dto.staffId,
              date: dto.date,
              loginTime: dto.loginTime,
              logoutTime: dto.logoutTime
            },
            ipAddress: (req as any)?.ip || (req as any)?.socket?.remoteAddress || undefined,
            userAgent: (req as any)?.headers?.['user-agent'] || undefined
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for attendance recording:', auditError);
      }
      
      return { success: true, record };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(`Failed to create attendance record: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
}

