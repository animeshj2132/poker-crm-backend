import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException, ForbiddenException, Inject, forwardRef, Optional } from '@nestjs/common';
import { GlobalRole } from '../common/rbac/roles';
import { UsersService } from '../users/users.service';
import { ClubsService } from '../clubs/clubs.service';
import { UserTenantRole } from '../users/user-tenant-role.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { Player } from '../clubs/entities/player.entity';
import { Staff } from '../clubs/entities/staff.entity';
import { Club } from '../clubs/club.entity';
import {
  FinancialTransaction,
  TransactionStatus,
  SESSION_TABLE_CHIPS_SUM_CASE_INNER,
  TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER,
  CREDIT_BALANCE_SQL,
} from '../clubs/entities/financial-transaction.entity';
import { WaitlistEntry, WaitlistStatus } from '../clubs/entities/waitlist-entry.entity';
import { Table, TableStatus } from '../clubs/entities/table.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { tableHasActiveStaffSession } from '../clubs/table-session.util';
import { playerMeetsTableMinBuyIn } from '../clubs/waitlist-buyin.util';
import { TenantRole, ClubRole } from '../common/rbac/roles';
import * as bcrypt from 'bcrypt';
import { FinancialTransactionsService } from '../clubs/services/financial-transactions.service';
import { WaitlistSeatingService } from '../clubs/services/waitlist-seating.service';
import { CreditRequestsService } from '../clubs/services/credit-requests.service';
import { AffiliatesService } from '../clubs/services/affiliates.service';
import { FnbEnhancedService } from '../clubs/services/fnb-enhanced.service';
import { EventsService } from '../events/events.service';
import { generateTiltIdCandidate } from '../common/utils/tilt-id';
import {
  computeCreditFacilityBreakdown,
  sumApprovedCreditLimitSince,
} from '../clubs/credit-used.util';
import { playerKycDocsMeetSubmitPanGate } from '../clubs/player-kyc-readiness.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly clubsService: ClubsService,
    private readonly financialTransactionsService: FinancialTransactionsService,
    private readonly waitlistSeatingService: WaitlistSeatingService,
    private readonly creditRequestsService: CreditRequestsService,
    private readonly affiliatesService: AffiliatesService,
    private readonly fnbService: FnbEnhancedService,
    @Inject(forwardRef(() => EventsService)) @Optional() private readonly eventsService: EventsService,
    private readonly dataSource: DataSource,
    @InjectRepository(UserTenantRole) private readonly userTenantRoleRepo: Repository<UserTenantRole>,
    @InjectRepository(UserClubRole) private readonly userClubRoleRepo: Repository<UserClubRole>,
    @InjectRepository(Player) private readonly playersRepo: Repository<Player>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(FinancialTransaction) private readonly transactionsRepo: Repository<FinancialTransaction>,
    @InjectRepository(WaitlistEntry) private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Table) private readonly tablesRepo: Repository<Table>
  ) {}

  private async generateUniqueTiltId(clubId: string, clubName?: string): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const candidate = generateTiltIdCandidate(clubName);
      const existing = await this.playersRepo.findOne({
        where: { club: { id: clubId }, playerId: candidate },
      });
      if (!existing) return candidate;
    }
    throw new BadRequestException('Unable to generate unique Tilt ID. Please try again.');
  }

  private tableMatchesWaitlistGame(table: Table, game: 'POKER' | 'RUMMY'): boolean {
    const tt = String(table.tableType || '').toUpperCase();
    if (game === 'RUMMY') return tt === 'RUMMY';
    return tt === 'CASH' || tt === 'HIGH_STAKES' || tt === 'PRIVATE' || tt === 'TOURNAMENT';
  }

  // Placeholder: integrate Supabase Auth/JWT verification later
  async validateApiKey(apiKey: string | undefined) {
    // Extremely basic bootstrap: treat API key 'master' as master admin
    if (apiKey === process.env.MASTER_API_KEY) {
      return {
        id: 'master-user',
        globalRoles: [GlobalRole.MASTER_ADMIN],
        tenantRoles: [],
        clubRoles: []
      };
    }
    return undefined;
  }

  /**
   * Login with email and password
   * Returns user info and whether password reset is required
   */
  async login(email: string, password: string) {
    try {
      // Validate inputs
      if (!email || !email.trim()) {
        throw new UnauthorizedException('Email is required');
      }
      if (!password || !password.trim()) {
        throw new UnauthorizedException('Password is required');
      }

      const isValid = await this.usersService.verifyPassword(email.trim(), password);
      if (!isValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const user = await this.usersService.findByEmail(email.trim());
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Get tenant roles for this user (Super Admin)
      let tenantRoles: UserTenantRole[] = [];
      try {
        tenantRoles = await this.userTenantRoleRepo.find({
          where: { user: { id: user.id }, role: TenantRole.SUPER_ADMIN },
          relations: ['tenant']
        });
      } catch (err) {
        console.error('Error fetching tenant roles:', err);
        tenantRoles = [];
      }

      // Get club roles for this user (Admin, Manager, HR, Staff, etc.)
      let clubRoles: UserClubRole[] = [];
      try {
        clubRoles = await this.userClubRoleRepo.find({
          where: { user: { id: user.id } },
          relations: ['club', 'club.tenant']
        });
      } catch (err) {
        console.error('Error fetching club roles:', err);
        clubRoles = [];
      }

      // Check if user has club roles and validate club/staff status
      let staffId: string | undefined;
      if (clubRoles.length > 0) {
        const clubId = clubRoles[0].club?.id;
        
        if (clubId) {
          // Check club status
          const club = await this.clubsService.findById(clubId);
          if (!club) {
            throw new UnauthorizedException('Club not found');
          }

          // If club is suspended or killed, block staff login (except Super Admin)
          const isSuperAdmin = tenantRoles.some(tr => tr.role === TenantRole.SUPER_ADMIN);
          if (!isSuperAdmin && !user.isMasterAdmin) {
            if (club.status === 'killed') {
              throw new UnauthorizedException('Club not found');
            }
            if (club.status === 'suspended') {
              throw new UnauthorizedException('Club not found');
            }
          }

          // Check staff status (if user is not Super Admin or Master Admin)
          if (!isSuperAdmin && !user.isMasterAdmin) {
            try {
              const staff = await this.staffRepo.findOne({
                where: { email: email.trim(), club: { id: clubId } }
              });

              if (staff) {
                staffId = staff.id; // Store staff ID for response
                if (staff.status === 'Suspended') {
                  throw new UnauthorizedException('Your account is suspended by admin. Please contact them.');
                }
                if (staff.status === 'Deactivated') {
                  throw new UnauthorizedException('Your account has been deactivated. Please contact admin.');
                }
              }
            } catch (err) {
              // If it's our custom error, re-throw it
              if (err instanceof UnauthorizedException) {
                throw err;
              }
              // Otherwise, log and continue (staff might not exist in staff table for some roles)
              console.error('Error checking staff status:', err);
            }
          }
        }
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isMasterAdmin: user.isMasterAdmin || false,
          mustResetPassword: user.mustResetPassword || false,
          staffId: staffId // Include staff ID if available
        },
        tenantRoles: tenantRoles.map(tr => ({
          role: tr.role,
          tenant: {
            id: tr.tenant?.id || '',
            name: (tr.tenant as any)?.name || ''
          }
        })),
        clubRoles: clubRoles.map(cr => ({
          role: cr.role,
          club: {
            id: cr.club?.id || '',
            name: (cr.club as any)?.name || '',
            tenantId: (cr.club as any)?.tenant?.id || '',
            status: (cr.club as any)?.status || 'active'
          }
        }))
      };
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new UnauthorizedException('Login failed: ' + errorMessage);
    }
  }

  /**
   * Player login with club code, email, and password
   */
  async playerLogin(clubCode: string, email: string, password: string) {
    try {
      // Edge case: Validate club code exists and is string
      if (!clubCode || typeof clubCode !== 'string') {
        throw new BadRequestException('Club code is required and must be a string');
      }
      const trimmedClubCode = clubCode.trim();
      if (!trimmedClubCode) {
        throw new BadRequestException('Club code cannot be empty');
      }
      if (trimmedClubCode.length !== 6) {
        throw new BadRequestException('Club code must be exactly 6 digits');
      }
      if (!/^\d{6}$/.test(trimmedClubCode)) {
        throw new BadRequestException('Club code must contain only digits');
      }
      // Edge case: Prevent SQL injection
      if (trimmedClubCode.length > 10 || trimmedClubCode.includes(';') || trimmedClubCode.includes('--')) {
        throw new BadRequestException('Invalid club code format');
      }

      // Edge case: Validate email exists and is string
      if (!email || typeof email !== 'string') {
        throw new BadRequestException('Email is required and must be a string');
      }
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        throw new BadRequestException('Email cannot be empty');
      }
      if (trimmedEmail.length > 200) {
        throw new BadRequestException('Email is too long (maximum 200 characters)');
      }
      // Edge case: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new BadRequestException('Invalid email format');
      }
      // Edge case: Validate email domain
      const emailParts = trimmedEmail.split('@');
      if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
        throw new BadRequestException('Invalid email domain');
      }
      // Edge case: Prevent email injection
      if (trimmedEmail.includes(';') || trimmedEmail.includes('--') || trimmedEmail.includes('/*')) {
        throw new BadRequestException('Invalid email format');
      }
      const lowerEmail = trimmedEmail.toLowerCase();

      // Edge case: Validate password exists and is string
      if (!password || typeof password !== 'string') {
        throw new BadRequestException('Password is required and must be a string');
      }
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        throw new BadRequestException('Password cannot be empty');
      }
      if (trimmedPassword.length < 1) {
        throw new BadRequestException('Password is required');
      }
      if (trimmedPassword.length > 100) {
        throw new BadRequestException('Password is too long (maximum 100 characters)');
      }

      // Edge case: Find club by code with error handling
      let club;
      try {
        club = await this.clubsService.findByCode(trimmedClubCode);
      } catch (dbError) {
        console.error('Database error finding club:', dbError);
        throw new NotFoundException('Unable to verify club code. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Invalid club code');
      }
      // Edge case: Club has no code
      if (!club.code || typeof club.code !== 'string') {
        throw new NotFoundException('Club code not configured');
      }
      // Edge case: Code mismatch (shouldn't happen but verify)
      if (club.code !== trimmedClubCode) {
        throw new NotFoundException('Invalid club code');
      }
      // Edge case: Verify tenant exists
      if (!club.tenant) {
        throw new NotFoundException('Club configuration error');
      }
      if (!club.tenant.id) {
        throw new NotFoundException('Club configuration error');
      }
      // Edge case: Verify club ID exists
      if (!club.id) {
        throw new NotFoundException('Club configuration error');
      }

      // Edge case: Find player in this club with error handling
      // CRITICAL: Only find players that belong to THIS specific club
      let player;
      try {
        player = await this.playersRepo.findOne({
          where: { 
            club: { id: club.id },
            email: lowerEmail
          },
          relations: ['club', 'club.tenant', 'affiliate']
        });
      } catch (dbError) {
        console.error('Database error finding player:', dbError);
        // Don't reveal database errors - security best practice
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!player) {
        // SECURITY: Don't reveal if email exists in another club
        // This prevents information leakage about which clubs a player might be registered with
        throw new UnauthorizedException('Invalid email or password');
      }

      // CRITICAL SECURITY CHECK: Verify player belongs to the club specified by club code
      // This prevents cross-club login attempts
      if (!player.club || !player.club.id) {
        throw new UnauthorizedException('Player account error. Please contact support.');
      }
      if (player.club.id !== club.id) {
        // This should never happen due to the query filter, but double-check for security
        console.error(`SECURITY ALERT: Player ${player.id} attempted cross-club login. Club code: ${trimmedClubCode}, Player's club: ${player.club.id}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Edge case: Check if player has password set
      if (!player.passwordHash) {
        throw new UnauthorizedException('Account not set up. Please sign up first.');
      }

      // Edge case: Check player status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new UnauthorizedException('Account is suspended. Please contact support.');
      }
      if (player.status && player.status.toLowerCase() === 'inactive') {
        throw new UnauthorizedException('Account is inactive. Please contact support.');
      }

      // Edge case: Verify password (with timing attack prevention)
      let isValid = false;
      try {
        isValid = await bcrypt.compare(trimmedPassword, player.passwordHash);
      } catch (bcryptError) {
        console.error('Password comparison error:', bcryptError);
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!isValid) {
        // Don't reveal which field is wrong - security best practice
        throw new UnauthorizedException('Invalid email or password');
      }

      // CRITICAL SECURITY CHECK: Final verification that player belongs to this club
      // This is a redundant check but important for security (defense in depth)
      // Prevents any edge cases where player might have been moved between clubs
      if (!player.club) {
        throw new UnauthorizedException('Player account error. Please contact support.');
      }
      if (!player.club.id) {
        throw new UnauthorizedException('Player account error. Please contact support.');
      }
      if (player.club.id !== club.id) {
        // This should never happen, but log it as a security issue
        console.error(`SECURITY ALERT: Player ${player.id} club mismatch after password verification. Expected club: ${club.id}, Player's club: ${player.club.id}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Edge case: Verify club still exists
      if (!player.club.tenant) {
        throw new UnauthorizedException('Club configuration error. Please contact support.');
      }
      if (!player.club.tenant.id) {
        throw new UnauthorizedException('Club configuration error. Please contact support.');
      }

      // Edge case: Validate player data integrity
      if (!player.id) {
        throw new UnauthorizedException('Player account error. Please contact support.');
      }
      if (!player.email || typeof player.email !== 'string') {
        throw new UnauthorizedException('Player account error. Please contact support.');
      }
      if (!player.name || typeof player.name !== 'string') {
        throw new UnauthorizedException('Player account error. Please contact support.');
      }

      // Edge case: Validate club data integrity
      if (!club.name || typeof club.name !== 'string') {
        throw new UnauthorizedException('Club configuration error. Please contact support.');
      }

      // Get KYC status from player entity
      const playerKycStatus = player.kycStatus || (player as any).kycStatus;
      
      return {
        player: {
          id: player.id,
          name: player.name.trim(),
          email: player.email.trim().toLowerCase(),
          phoneNumber: player.phoneNumber ? player.phoneNumber.trim() : null,
          panCard: (player as any).panCard || (player as any).pan_card || null,
          playerId: player.playerId ? player.playerId.trim() : null,
          nickname: player.nickname ? player.nickname.trim() : (player.playerId ? player.playerId.trim() : null),
          status: player.status || 'Active',
          kycStatus: playerKycStatus || 'pending', // Use actual kycStatus from database
          kycApproved: playerKycStatus === 'approved' || playerKycStatus === 'verified',
          kycDocuments: (player as any).kycDocuments || null,
          createdAt: player.createdAt,
          mustResetPassword: (player as any).mustResetPassword || false // For first-time login detection
        },
        club: {
          id: club.id,
          name: club.name.trim(),
          code: club.code.trim(),
          tenantId: club.tenant.id,
          tenantName: (club.tenant.name || '').trim()
        },
        affiliate: player.affiliate && player.affiliate.id ? {
          id: player.affiliate.id,
          code: (player.affiliate as any).code ? String((player.affiliate as any).code).trim() : null
        } : null
      };
    } catch (err) {
      console.error('Player login error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof UnauthorizedException) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new UnauthorizedException('Login failed: ' + errorMessage);
    }
  }

  /**
   * Player signup with club code
   */
  async playerSignup(
    clubCode: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    phoneNumber?: string,
    nickname?: string,
    referralCode?: string
  ) {
    try {
      // Edge case: Validate clubCode exists and is string
      if (clubCode === null || clubCode === undefined) {
        throw new BadRequestException('Club code is required');
      }
      if (typeof clubCode !== 'string') {
        throw new BadRequestException('Club code must be a string');
      }
      const trimmedClubCode = clubCode.trim();
      if (!trimmedClubCode) {
        throw new BadRequestException('Club code cannot be empty');
      }
      if (trimmedClubCode.length !== 6) {
        throw new BadRequestException('Club code must be exactly 6 digits');
      }
      if (!/^\d{6}$/.test(trimmedClubCode)) {
        throw new BadRequestException('Club code must contain only digits (0-9)');
      }
      // Edge case: Prevent SQL injection attempts
      if (trimmedClubCode.includes(';') || trimmedClubCode.includes('--') || trimmedClubCode.includes('/*')) {
        throw new BadRequestException('Invalid club code format');
      }

      // Edge case: Validate firstName exists and is string
      if (firstName === null || firstName === undefined) {
        throw new BadRequestException('First name is required');
      }
      if (typeof firstName !== 'string') {
        throw new BadRequestException('First name must be a string');
      }
      const trimmedFirstName = firstName.trim();
      if (!trimmedFirstName) {
        throw new BadRequestException('First name cannot be empty');
      }
      if (trimmedFirstName.length < 2) {
        throw new BadRequestException('First name must be at least 2 characters');
      }
      if (trimmedFirstName.length > 100) {
        throw new BadRequestException('First name cannot exceed 100 characters');
      }
      // Edge case: Validate name contains only valid characters
      if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedFirstName)) {
        throw new BadRequestException('First name can only contain letters, spaces, hyphens, apostrophes, and periods');
      }
      // Edge case: Prevent SQL injection in name
      if (trimmedFirstName.includes(';') || trimmedFirstName.includes('--') || trimmedFirstName.includes('/*')) {
        throw new BadRequestException('First name contains invalid characters');
      }

      // Edge case: Validate lastName exists and is string
      if (lastName === null || lastName === undefined) {
        throw new BadRequestException('Last name is required');
      }
      if (typeof lastName !== 'string') {
        throw new BadRequestException('Last name must be a string');
      }
      const trimmedLastName = lastName.trim();
      if (!trimmedLastName) {
        throw new BadRequestException('Last name cannot be empty');
      }
      if (trimmedLastName.length < 2) {
        throw new BadRequestException('Last name must be at least 2 characters');
      }
      if (trimmedLastName.length > 100) {
        throw new BadRequestException('Last name cannot exceed 100 characters');
      }
      // Edge case: Validate name contains only valid characters
      if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedLastName)) {
        throw new BadRequestException('Last name can only contain letters, spaces, hyphens, apostrophes, and periods');
      }
      // Edge case: Prevent SQL injection in name
      if (trimmedLastName.includes(';') || trimmedLastName.includes('--') || trimmedLastName.includes('/*')) {
        throw new BadRequestException('Last name contains invalid characters');
      }

      // Edge case: Validate full name length (combined)
      const fullName = `${trimmedFirstName} ${trimmedLastName}`;
      if (fullName.length > 200) {
        throw new BadRequestException('Full name (first + last) cannot exceed 200 characters');
      }

      // Edge case: Validate email exists and is string
      if (email === null || email === undefined) {
        throw new BadRequestException('Email is required');
      }
      if (typeof email !== 'string') {
        throw new BadRequestException('Email must be a string');
      }
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        throw new BadRequestException('Email cannot be empty');
      }
      if (trimmedEmail.length > 200) {
        throw new BadRequestException('Email is too long (maximum 200 characters)');
      }
      if (trimmedEmail.length < 5) {
        throw new BadRequestException('Email is too short (minimum 5 characters)');
      }
      // Edge case: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new BadRequestException('Invalid email format');
      }
      // Edge case: Validate email domain
      const emailParts = trimmedEmail.split('@');
      if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
        throw new BadRequestException('Invalid email domain');
      }
      // Edge case: Check for multiple @ symbols
      if ((trimmedEmail.match(/@/g) || []).length !== 1) {
        throw new BadRequestException('Invalid email format');
      }
      // Edge case: Prevent email injection
      if (trimmedEmail.includes(';') || trimmedEmail.includes('--') || trimmedEmail.includes('/*')) {
        throw new BadRequestException('Invalid email format');
      }
      const lowerEmail = trimmedEmail.toLowerCase();

      // Edge case: Validate password exists and is string
      if (password === null || password === undefined) {
        throw new BadRequestException('Password is required');
      }
      if (typeof password !== 'string') {
        throw new BadRequestException('Password must be a string');
      }
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        throw new BadRequestException('Password cannot be empty');
      }
      if (trimmedPassword.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters');
      }
      if (trimmedPassword.length > 100) {
        throw new BadRequestException('Password is too long (maximum 100 characters)');
      }
      // Edge case: Check for common weak passwords (optional)
      const commonPasswords = ['password', '12345678', 'password123', 'qwerty123', 'admin123'];
      if (commonPasswords.includes(trimmedPassword.toLowerCase())) {
        throw new BadRequestException('Password is too common. Please choose a stronger password.');
      }

      // Edge case: Validate phoneNumber if provided
      let trimmedPhone: string | null = null;
      if (phoneNumber !== null && phoneNumber !== undefined) {
        if (typeof phoneNumber !== 'string') {
          throw new BadRequestException('Phone number must be a string');
        }
        trimmedPhone = phoneNumber.trim();
        if (trimmedPhone) {
          if (trimmedPhone.length < 10) {
            throw new BadRequestException('Phone number must be at least 10 characters');
          }
          if (trimmedPhone.length > 20) {
            throw new BadRequestException('Phone number cannot exceed 20 characters');
          }
          // Edge case: Validate phone number format
          if (!/^[\+]?[0-9\s\-\(\)]+$/.test(trimmedPhone)) {
            throw new BadRequestException('Phone number contains invalid characters');
          }
        }
      }

      // Edge case: Validate nickname if provided
      let trimmedNickname: string | null = null;
      if (nickname !== null && nickname !== undefined) {
        if (typeof nickname !== 'string') {
          throw new BadRequestException('Nickname must be a string');
        }
        trimmedNickname = nickname.trim();
        if (trimmedNickname) {
          if (trimmedNickname.length > 50) {
            throw new BadRequestException('Nickname cannot exceed 50 characters');
          }
          // Edge case: Prevent SQL injection in nickname
          if (trimmedNickname.includes(';') || trimmedNickname.includes('--') || trimmedNickname.includes('/*')) {
            throw new BadRequestException('Nickname contains invalid characters');
          }
        }
      }

      // Edge case: Validate referralCode if provided
      let trimmedRefCode: string | null = null;
      if (referralCode !== null && referralCode !== undefined) {
        if (typeof referralCode !== 'string') {
          throw new BadRequestException('Referral code must be a string');
        }
        trimmedRefCode = referralCode.trim();
        if (trimmedRefCode) {
          if (trimmedRefCode.length < 3) {
            throw new BadRequestException('Referral code must be at least 3 characters');
          }
          if (trimmedRefCode.length > 20) {
            throw new BadRequestException('Referral code cannot exceed 20 characters');
          }
          if (!/^[A-Z0-9]+$/.test(trimmedRefCode)) {
            throw new BadRequestException('Referral code can only contain uppercase letters and numbers');
          }
        }
      }

      // Edge case: Find club by code with error handling
      let club;
      try {
        club = await this.clubsService.findByCode(trimmedClubCode);
      } catch (dbError) {
        console.error('Database error finding club:', dbError);
        throw new NotFoundException('Unable to verify club code. Please try again.');
      }
      if (!club) {
        throw new NotFoundException('Invalid club code');
      }
      // Edge case: Club has no code
      if (!club.code || typeof club.code !== 'string') {
        throw new NotFoundException('Club code not configured');
      }
      // Edge case: Code mismatch
      if (club.code !== trimmedClubCode) {
        throw new NotFoundException('Invalid club code');
      }
      // Edge case: Verify tenant exists
      if (!club.tenant || !club.tenant.id) {
        throw new NotFoundException('Club configuration error');
      }
      // Edge case: Verify club ID exists
      if (!club.id) {
        throw new NotFoundException('Club configuration error');
      }

      // Edge case: Check if player already exists in this club (with error handling)
      let existingPlayer;
      try {
        existingPlayer = await this.playersRepo.findOne({
          where: { 
            club: { id: club.id },
            email: lowerEmail
          }
        });
      } catch (dbError) {
        console.error('Database error checking existing player:', dbError);
        throw new BadRequestException('Unable to verify account. Please try again.');
      }

      if (existingPlayer) {
        throw new ConflictException('A player with this email already exists in this club. Please login instead.');
      }

      // Edge case: Handle referral code if provided
      let affiliate = null;
      if (trimmedRefCode) {
        try {
          const foundAffiliate = await this.affiliatesService.findByCode(trimmedRefCode);
          if (foundAffiliate) {
            // Edge case: Verify affiliate belongs to this club
            if ((foundAffiliate as any).club?.id === club.id) {
              affiliate = foundAffiliate;
            } else {
              // Referral code exists but for different club - silently ignore
              console.warn(`Referral code ${trimmedRefCode} belongs to different club`);
            }
          }
        } catch (err) {
          // If affiliate not found or error, continue without referral
          console.warn('Referral code not found or error:', trimmedRefCode, err);
        }
      }

      // Edge case: Hash password with error handling
      let passwordHash: string;
      try {
        const saltRounds = 12;
        passwordHash = await bcrypt.hash(trimmedPassword, saltRounds);
      } catch (bcryptError) {
        console.error('Password hashing error:', bcryptError);
        throw new BadRequestException('Unable to create account. Please try again.');
      }

      // Edge case: Create player with error handling
      // Players created from player portal signup should NOT need password reset
      // (they set their own password during signup)
      // ✅ Self-signup players get 'pending' KYC status (must complete verification)
      const generatedTiltId = await this.generateUniqueTiltId(club.id, club.name);
      const player = this.playersRepo.create({
        club: club,
        name: fullName,
        email: lowerEmail,
        phoneNumber: trimmedPhone,
        playerId: generatedTiltId,
        nickname: trimmedNickname,
        passwordHash: passwordHash,
        affiliate: affiliate,
        status: 'Active',
        kycStatus: 'pending', // ✅ Self-signup players need KYC verification
        mustResetPassword: false // Player portal signups set their own password
      });

      let savedPlayer;
      try {
        savedPlayer = await this.playersRepo.save(player);
      } catch (saveError: any) {
        console.error('Error saving player:', saveError);
        // Edge case: Check for duplicate email constraint violation
        if (saveError.code === '23505' || saveError.message?.includes('unique') || saveError.message?.includes('duplicate')) {
          throw new ConflictException('A player with this email already exists in this club. Please login instead.');
        }
        throw new BadRequestException('Unable to create account. Please try again.');
      }

      // Edge case: Verify player was saved
      if (!savedPlayer || !savedPlayer.id) {
        throw new BadRequestException('Account creation failed. Please try again.');
      }

      // Edge case: Reload with relations and error handling
      let playerWithRelations;
      try {
        playerWithRelations = await this.playersRepo.findOne({
          where: { id: savedPlayer.id },
          relations: ['club', 'club.tenant', 'affiliate']
        });
      } catch (dbError) {
        console.error('Database error reloading player:', dbError);
        throw new BadRequestException('Account created but unable to retrieve details. Please try logging in.');
      }

      if (!playerWithRelations) {
        throw new BadRequestException('Account created but unable to retrieve details. Please try logging in.');
      }

      // Edge case: Validate returned data integrity
      if (!playerWithRelations.club || !playerWithRelations.club.id) {
        throw new BadRequestException('Account created but club information is missing.');
      }
      if (!playerWithRelations.club.tenant || !playerWithRelations.club.tenant.id) {
        throw new BadRequestException('Account created but tenant information is missing.');
      }

      return {
        player: {
          id: playerWithRelations.id,
          name: playerWithRelations.name ? playerWithRelations.name.trim() : fullName,
          email: playerWithRelations.email ? playerWithRelations.email.trim().toLowerCase() : lowerEmail,
          phoneNumber: playerWithRelations.phoneNumber ? playerWithRelations.phoneNumber.trim() : trimmedPhone,
          nickname: playerWithRelations.nickname ? playerWithRelations.nickname.trim() : trimmedNickname,
          status: playerWithRelations.status || 'Active',
          kycStatus: playerWithRelations.kycStatus || (playerWithRelations as any).kycStatus || 'pending',
          kycRequired: true // New players must complete KYC
        },
        club: {
          id: club.id,
          name: club.name ? club.name.trim() : '',
          code: club.code ? club.code.trim() : trimmedClubCode,
          tenantId: club.tenant.id,
          tenantName: (club.tenant.name || '').trim()
        },
        affiliate: playerWithRelations.affiliate && playerWithRelations.affiliate.id ? {
          id: playerWithRelations.affiliate.id,
          code: (playerWithRelations.affiliate as any).code ? String((playerWithRelations.affiliate as any).code).trim() : null
        } : null
      };
    } catch (err) {
      console.error('Player signup error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ConflictException) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException('Signup failed: ' + errorMessage);
    }
  }

  /**
   * Get player profile by ID
   */
  async getPlayerProfile(playerId: string, clubId: string) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Check if club exists first
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club', 'club.tenant', 'affiliate']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId.trim()) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Please contact support.');
      }

      // Edge case: Validate data integrity
      if (!player.id || !player.email || !player.name) {
        throw new BadRequestException('Player data is incomplete. Please contact support.');
      }

      // Edge case: Validate club data
      if (!player.club.id || !player.club.name) {
        throw new BadRequestException('Club data is incomplete. Please contact support.');
      }

      return {
        player: {
          id: player.id,
          name: player.name.trim(),
          email: player.email.trim().toLowerCase(),
          phoneNumber: player.phoneNumber ? player.phoneNumber.trim() : null,
          panCard: (player as any).panCard || (player as any).pan_card || null,
          playerId: player.playerId ? player.playerId.trim() : null,
          nickname: player.nickname ? player.nickname.trim() : (player.playerId ? player.playerId.trim() : null),
          status: player.status || 'Active',
          kycStatus: player.kycStatus || (player as any).kycStatus || 'pending',
          kycApproved: (player.kycStatus || (player as any).kycStatus) === 'approved' || (player.kycStatus || (player as any).kycStatus) === 'verified',
          kycDocuments: (player as any).kycDocuments || null,
          totalSpent: Number(player.totalSpent) || 0,
          totalCommission: Number(player.totalCommission) || 0,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt
        },
        club: {
          id: player.club.id,
          name: player.club.name.trim(),
          code: player.club.code ? player.club.code.trim() : null
        },
        affiliate: player.affiliate && player.affiliate.id ? {
          id: player.affiliate.id,
          code: (player.affiliate as any).code ? String((player.affiliate as any).code).trim() : null
        } : null
      };
    } catch (err) {
      console.error('Get player profile error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException('Failed to get player profile');
    }
  }

  /**
   * Submit PAN card (unique per club)
   */
  async submitPanCard(playerId: string, clubId: string, panCard: string) {
    try {
      // Validate inputs
      if (!playerId || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }
      if (!panCard || !panCard.trim()) {
        throw new BadRequestException('PAN card number is required');
      }

      const trimmedPlayerId = playerId.trim();
      const trimmedClubId = clubId.trim();
      const trimmedPanCard = panCard.trim().toUpperCase();

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmedPlayerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(trimmedClubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Validate PAN card format
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(trimmedPanCard)) {
        throw new BadRequestException('Invalid PAN card format. Expected: ABCDE1234F');
      }

      // Check if club exists
      const club = await this.clubsService.findById(trimmedClubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Check if player exists
      const player = await this.playersRepo.findOne({
        where: { id: trimmedPlayerId, club: { id: trimmedClubId } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Require Aadhaar front + back (or legacy single government_id) and PAN document before PAN submission.
      if (!playerKycDocsMeetSubmitPanGate(player)) {
        throw new BadRequestException(
          'Please upload Aadhaar Front, Aadhaar Back, and PAN Card documents before submitting PAN number.'
        );
      }

      // Check if PAN card is already used by another player in the same club
      const existingPlayer = await this.playersRepo.findOne({
        where: {
          club: { id: trimmedClubId },
          panCard: trimmedPanCard
        }
      });

      if (existingPlayer && existingPlayer.id !== trimmedPlayerId) {
        throw new ConflictException('This PAN card is already registered with another player in your club');
      }

      // Update player with PAN card
      player.panCard = trimmedPanCard;
      await this.playersRepo.save(player);

      return {
        success: true,
        message: 'PAN card submitted successfully',
        panCard: trimmedPanCard
      };
    } catch (err) {
      console.error('Submit PAN card error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ConflictException) {
        throw err;
      }
      throw new BadRequestException('Failed to submit PAN card');
    }
  }

  /**
   * Update player profile - Now creates update requests instead of direct updates
   * Players CANNOT directly update their profile - all changes must be approved by staff
   */
  async updatePlayerProfile(
    playerId: string,
    clubId: string,
    firstName?: string,
    lastName?: string,
    phoneNumber?: string,
    nickname?: string
  ) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (player.club.id !== clubId.trim()) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check player status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot update profile.');
      }

      // IMPORTANT: Players cannot directly update their profile
      // All profile changes must be submitted as update requests for staff approval
      throw new BadRequestException(
        'Direct profile updates are not allowed. Please submit your changes through the profile update request system. All changes require staff approval.'
      );
    } catch (err) {
      console.error('Update player profile error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException('Failed to update player profile');
    }
  }

  /**
   * Reset player password (for first-time password reset)
   * This is used when a player is created with mustResetPassword=true
   * Requires current/temporary password for security verification
   */
  async resetPlayerPassword(email: string, currentPassword: string, newPassword: string, clubCode: string) {
    try {
      // Validate inputs
      if (!email || typeof email !== 'string' || !email.trim()) {
        throw new BadRequestException('Email is required');
      }
      if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
        throw new BadRequestException('Current password is required');
      }
      if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
        throw new BadRequestException('New password is required');
      }
      if (!clubCode || typeof clubCode !== 'string' || !clubCode.trim()) {
        throw new BadRequestException('Club code is required');
      }
      if (newPassword.trim().length < 8) {
        throw new BadRequestException('New password must be at least 8 characters');
      }
      if (newPassword.trim().length > 100) {
        throw new BadRequestException('New password cannot exceed 100 characters');
      }
      if (currentPassword.trim() === newPassword.trim()) {
        throw new BadRequestException('New password must be different from current password');
      }

      // Find club by code
      const club = await this.clubsRepo.findOne({
        where: { code: clubCode.trim() }
      });

      if (!club) {
        // Don't reveal if club exists - security best practice
        throw new UnauthorizedException('Invalid credentials');
      }

      // Find player by email and club
      const player = await this.playersRepo.findOne({
        where: { 
          email: email.trim().toLowerCase(),
          club: { id: club.id }
        },
        relations: ['club']
      });

      if (!player) {
        // Don't reveal if player exists - security best practice
        throw new UnauthorizedException('Invalid credentials');
      }

      // SECURITY: Verify player belongs to this club
      if (player.club.id !== club.id) {
        console.error(`SECURITY ALERT: Cross-club password reset attempt for player ${player.id}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if password is set
      if (!player.passwordHash) {
        throw new BadRequestException('Account not set up properly. Please contact support.');
      }

      // Only allow reset if mustResetPassword is true
      if (!player.mustResetPassword) {
        throw new BadRequestException('Password reset not required. Use change password instead.');
      }

      // SECURITY: Verify current/temporary password
      const isValid = await bcrypt.compare(currentPassword.trim(), player.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      player.passwordHash = await bcrypt.hash(newPassword.trim(), saltRounds);
      player.mustResetPassword = false; // Clear the flag

      await this.playersRepo.save(player);

      return { success: true, message: 'Password reset successfully' };
    } catch (err) {
      console.error('Reset player password error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof UnauthorizedException) {
        throw err;
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  /**
   * Change player password (for regular password changes)
   * Requires current password verification
   */
  async changePlayerPassword(playerId: string, clubId: string, currentPassword: string, newPassword: string) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }
      if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
        throw new BadRequestException('Current password is required');
      }
      if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
        throw new BadRequestException('New password is required');
      }
      if (newPassword.trim().length < 8) {
        throw new BadRequestException('New password must be at least 8 characters');
      }
      if (newPassword.trim().length > 100) {
        throw new BadRequestException('New password cannot exceed 100 characters');
      }
      if (currentPassword.trim() === newPassword.trim()) {
        throw new BadRequestException('New password must be different from current password');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } }
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Verify player belongs to club
      if (player.club.id !== clubId.trim()) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check if password is set
      if (!player.passwordHash) {
        throw new BadRequestException('Password not set. Please contact support.');
      }

      // Edge case: Verify current password
      const isValid = await bcrypt.compare(currentPassword.trim(), player.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Edge case: Hash new password
      const saltRounds = 12;
      player.passwordHash = await bcrypt.hash(newPassword.trim(), saltRounds);
      player.mustResetPassword = false; // Reset flag after successful password change

      await this.playersRepo.save(player);

      return { success: true, message: 'Password changed successfully' };
    } catch (err) {
      console.error('Change player password error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException('Failed to change password');
    }
  }

  /**
   * Get player balance
   * @param clubIdHint Optional x-club-id from client; all balances use the player's assigned club from DB.
   */
  async getPlayerBalance(playerId: string, clubIdHint?: string) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim() },
        relations: ['club'],
      });

      if (!player) {
        console.log('❌ [BALANCE] Player not found');
        throw new NotFoundException('Player not found');
      }

      const resolvedClubId = String((player as any).club?.id || '').trim();
      if (!resolvedClubId) {
        throw new BadRequestException('Player has no assigned club');
      }

      const hint = typeof clubIdHint === 'string' ? clubIdHint.trim() : '';
      if (hint && hint !== resolvedClubId) {
        console.warn(
          `💰 [BALANCE] x-club-id (${hint}) does not match player assigned club (${resolvedClubId}); using assigned club`,
        );
      }

      console.log('💰 [BALANCE] Fetching balance for player:', playerId, 'club:', resolvedClubId);
      console.log('✅ [BALANCE] Player found:', player.email);

      // CRITICAL: KYC CHECK - Players with pending KYC can view balance but cannot perform actions
      const kycStatus = (player as any).kycStatus || 'pending';
      console.log('🔍 [BALANCE] Player KYC status:', kycStatus);
      
      if (kycStatus !== 'approved' && kycStatus !== 'verified') {
        console.log('⚠️ [BALANCE] KYC not approved, returning zero balance');
        // Return zero balance for pending KYC - they must complete KYC first
        return {
          availableBalance: 0,
          tableBalance: 0,
          totalBalance: 0,
          tableId: null,
          seatNumber: null,
          kycStatus: kycStatus,
          kycRequired: true,
          message: 'Please complete KYC verification to view your balance',
          assignedClubId: resolvedClubId,
        };
      }

      // Edge case: Get completed transactions with error handling
      let transactions: FinancialTransaction[] = [];
      try {
        transactions = await this.transactionsRepo.find({
          where: {
            club: { id: resolvedClubId },
            playerId: player.id,
            status: TransactionStatus.COMPLETED
          },
          order: { createdAt: 'DESC' }
        });
        console.log('💰 [BALANCE] Found', transactions.length, 'completed transactions');
      } catch (dbError) {
        console.error('❌ [BALANCE] Database error fetching transactions:', dbError);
        // Continue with empty transactions array
        transactions = [];
      }

      // Get table info (if seated) - use playerId for reliable lookup
      const waitlistEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: resolvedClubId },
          playerId: player.id,
          status: WaitlistStatus.SEATED
        },
        relations: ['club']
      });

      let tableId = null;
      let seatNumber = null;
      const isSeated = waitlistEntry && waitlistEntry.tableNumber && waitlistEntry.status === WaitlistStatus.SEATED;
      const seatedAt = waitlistEntry?.seatedAt || null;

      if (isSeated && waitlistEntry.tableNumber) {
        const table = await this.tablesRepo.findOne({
          where: { club: { id: resolvedClubId }, tableNumber: waitlistEntry.tableNumber }
        });
        if (table) {
          tableId = table.id;
          seatNumber = waitlistEntry.tableNumber;
        }
      }

      let cashBalance = 0;
      let tableBalance = 0;
      let creditUsedOnTable = 0;
      
      for (const txn of transactions) {
        try {
          const amount = Number(txn.amount);
          if (isNaN(amount)) continue;
          const upperType = (txn.type || '').toUpperCase();
          
          // Table balance: only count transactions from current session (since seated_at — exact boundary)
          const sessionStart = seatedAt ? new Date(seatedAt.getTime()) : null;
          const txnMs = new Date(txn.createdAt as Date | string).getTime();
          const seatMs = sessionStart ? sessionStart.getTime() : 0;
          const isCurrentSession = isSeated && sessionStart && Number.isFinite(txnMs) && txnMs >= seatMs;
          
          if (['DEPOSIT', 'CLUB BUY IN'].includes(upperType)) {
            cashBalance += amount;
          } else if (['CASHOUT', 'WITHDRAWAL', 'CLUB BUY OUT'].includes(upperType)) {
            cashBalance -= amount;
          } else if (['TABLE BUY IN', 'BUY IN'].includes(upperType)) {
            const walletOnlyCreditPair =
              typeof txn.notes === 'string' &&
              txn.notes.includes(TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER);
            // Paired row mirrors credit-to-table; chips live on the Credit txn — do not debit wallet cash.
            if (!walletOnlyCreditPair) {
              cashBalance -= amount;
            }
            if (isCurrentSession) {
              if (!walletOnlyCreditPair) {
                tableBalance += amount;
              }
            }
          } else if (['TABLE BUY OUT'].includes(upperType)) {
            cashBalance += amount;
            if (isCurrentSession) {
              tableBalance -= amount;
            }
          } else if (['CREDIT'].includes(upperType)) {
            if (isCurrentSession) {
              tableBalance += amount;
              creditUsedOnTable += amount;
            }
          } else if (['DEBIT'].includes(upperType)) {
            cashBalance -= amount;
            if (isCurrentSession) {
              creditUsedOnTable -= amount;
            }
          } else if (['BONUS', 'REFUND'].includes(upperType)) {
            cashBalance += amount;
          }
        } catch (calcError) {
          console.error('Error calculating balance from transaction:', txn.id, calcError);
        }
      }

      // Ensure creditUsedOnTable is never negative
      creditUsedOnTable = Math.max(0, creditUsedOnTable);

      if (!isSeated) {
        tableBalance = 0;
        creditUsedOnTable = 0;
      }

      // Wallet balance can go negative if using more credit than cash
      const availableBalance = cashBalance;

      // Get credit information
      const creditEnabled = (player as any).creditEnabled || false;

      // When credit facility is locked, chips from past Credit ledger rows are still on the table but
      // must not appear under "credit on table" — show them as cash-on-table so total matches chips.
      let creditUsedOnTableDisplay = creditUsedOnTable;
      let cashOnTableDisplay = Math.max(0, tableBalance - creditUsedOnTable);
      if (!creditEnabled && isSeated && tableBalance > 0) {
        creditUsedOnTableDisplay = 0;
        cashOnTableDisplay = Math.max(0, tableBalance);
      }

      console.log(
        `💰 [BALANCE] Cash: ₹${cashBalance}, Table: ₹${tableBalance}, Credit on table (ledger): ₹${creditUsedOnTable}, Seated: ${!!isSeated}, creditEnabled: ${creditEnabled}`,
      );
      const creditLimitNum = Number((player as any).creditLimit) || 0;

      // Approved limits since this credit line was last enabled (lock → unlock = fresh line).
      let creditUsedFromApprovals = 0;
      if (creditEnabled) {
        try {
          creditUsedFromApprovals = await sumApprovedCreditLimitSince(
            (sql, p) => this.dataSource.query(sql, p),
            resolvedClubId,
            player.id,
            (player as any).creditEnabledAt,
          );
        } catch (creditError) {
          console.warn('💰 [BALANCE] Failed to calculate credit used:', creditError);
          creditUsedFromApprovals = 0;
        }
      }
      creditUsedFromApprovals = Math.min(Math.max(0, creditUsedFromApprovals), creditLimitNum);

      // Ledger: Credit − Debit (chips drawn on the line). Negative wallet is treated as cash paid
      // toward that debt first, so "credit on line" drops (e.g. ₹199 owed, wallet −₹189 → ₹10 on line).
      let creditLedgerNet = 0;
      if (creditEnabled) {
        try {
          const crRows = await this.dataSource.query(
            `SELECT ${CREDIT_BALANCE_SQL} as total FROM financial_transactions
             WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
            [resolvedClubId, player.id],
          );
          creditLedgerNet = Number(crRows?.[0]?.total ?? 0);
        } catch (e) {
          console.warn('💰 [BALANCE] Failed to read credit ledger:', e);
          creditLedgerNet = 0;
        }
      }
      const facility = computeCreditFacilityBreakdown({
        creditLimit: creditLimitNum,
        creditUsedFromApprovals: creditUsedFromApprovals,
        creditLedgerNet,
        availableBalance,
        creditEnabled,
      });
      const { creditRepaidViaWallet, effectiveCreditOnLine, availableCredit } = facility;

      const result = {
        // Wallet balance (can be negative if using credit)
        availableBalance: availableBalance,
        cashBalance: availableBalance, // Alias for clarity
        
        // Table balance (money currently on table)
        tableBalance,
        creditUsedOnTable: creditUsedOnTableDisplay,
        cashOnTable: cashOnTableDisplay,
        
        // Total balance (cash + table)
        totalBalance: availableBalance + tableBalance,
        
        // Table info
        tableId,
        seatNumber: waitlistEntry?.tableNumber || null,
        isSeated: !!isSeated,
        
        // Credit info (player-facing names; numbers unchanged)
        creditEnabled,
        creditLimit: creditLimitNum,
        /** Chips/facility still drawn on the line after wallet payback (e.g. ₹10). */
        creditUsed: effectiveCreditOnLine,
        /** Negative wallet applied toward line debt (show as "credit used" in red; e.g. ₹189). */
        creditRepaidViaWallet,
        availableCredit,
        totalCredit: creditLimitNum,
        creditInAccount: effectiveCreditOnLine,
        creditRemaining: availableCredit,
        /** Canonical club for this player — clients should align x-club-id with this. */
        assignedClubId: resolvedClubId,
      };
      
      console.log('💰 [BALANCE] Returning balance:', JSON.stringify(result, null, 2));
      return result;
    } catch (err) {
      console.error('❌ [BALANCE] Get player balance error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get player balance');
    }
  }

  /**
   * Player requests a Club Buy-In while seated at a table.
   * Creates a buy-in REQUEST that goes to staff (cashier/admin) in real-time.
   * When staff approves, the player's TABLE balance increases.
   * Wallet is always 0 when seated (everything moved to table on seating).
   */
  async playerTableBuyInRequest(playerId: string, clubId: string, amount: number, notes?: string) {
    try {
      // 1. Validate player exists and belongs to club
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
      });
      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // 2. Verify player is currently seated at a table
      const waitlistEntry = await this.dataSource.query(
        `SELECT * FROM waitlist_entries
         WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'
         LIMIT 1`,
        [playerId, clubId],
      );

      if (!waitlistEntry || waitlistEntry.length === 0) {
        throw new BadRequestException('You must be seated at a table to request a buy-in');
      }

      const seatInfo = waitlistEntry[0];
      const tableNumber = seatInfo.table_number;
      const seatNumber = seatInfo.requested_seat;

      // 3. Get table info
      const tableData = await this.dataSource.query(
        `SELECT id, table_number FROM tables
         WHERE club_id = $1 AND table_number = $2 LIMIT 1`,
        [clubId, tableNumber],
      );
      const tableId = tableData && tableData.length > 0 ? tableData[0].id : null;

      // 4. Check for existing pending buy-in request
      const existingPending = await this.dataSource.query(
        `SELECT id FROM buyin_requests
         WHERE club_id = $1 AND player_id = $2 AND status = 'pending'
         LIMIT 1`,
        [clubId, playerId],
      );

      if (existingPending && existingPending.length > 0) {
        throw new BadRequestException('You already have a pending buy-in request. Please wait for approval.');
      }

      // 5. Calculate current table balance scoped to current session (since seated_at)
      const seatedAt = seatInfo.seated_at || new Date(0);
      const balanceResult = await this.dataSource.query(
        `SELECT
           COALESCE(SUM(CASE
             ${SESSION_TABLE_CHIPS_SUM_CASE_INNER}
           END), 0) AS table_balance
         FROM financial_transactions
         WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'
         AND created_at >= $3`,
        [clubId, playerId, seatedAt],
      );
      const currentTableBalance = Number(balanceResult[0]?.table_balance || 0);

      // 6. Create buy-in request
      await this.dataSource.query(
        `INSERT INTO buyin_requests
         (club_id, player_id, table_id, table_number, seat_number, requested_amount, current_table_balance, status, requested_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW(), NOW())`,
        [clubId, playerId, tableId, tableNumber, seatNumber, amount, currentTableBalance],
      );

      console.log(`📋 [BUYIN REQUEST] Player ${player.name} requested ₹${amount} buy-in at Table ${tableNumber} (current table balance: ₹${currentTableBalance})`);

      // Emit WebSocket event to ALL staff subscribed to this club
      if (this.eventsService) {
        this.eventsService.emitBuyInRequest(clubId, {
          player_id: playerId,
          player_name: player.name,
          table_number: tableNumber,
          seat_number: seatNumber,
          requested_amount: amount,
          current_table_balance: currentTableBalance,
          requested_at: new Date().toISOString(),
          status: 'pending',
        });
      }

      return {
        success: true,
        message: `Buy-in request for ₹${amount.toLocaleString()} submitted. Waiting for staff approval.`,
        amount,
        tableNumber,
        seatNumber,
        currentTableBalance,
        status: 'pending',
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ [BUYIN REQUEST] Error:', error);
      throw new BadRequestException(`Failed to submit buy-in request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get player's buy-in requests (history + pending status)
   */
  async getPlayerBuyInRequests(playerId: string, clubId: string) {
    try {
      const requests = await this.dataSource.query(
        `SELECT id, table_number, seat_number, requested_amount, current_table_balance,
                status, requested_at, processed_at, rejection_reason, created_at
         FROM buyin_requests
         WHERE club_id = $1 AND player_id = $2
         ORDER BY created_at DESC
         LIMIT 20`,
        [clubId, playerId],
      );

      return requests.map((r: any) => ({
        id: r.id,
        tableNumber: r.table_number,
        seatNumber: r.seat_number,
        requestedAmount: Number(r.requested_amount),
        currentTableBalance: r.current_table_balance ? Number(r.current_table_balance) : null,
        status: r.status,
        requestedAt: r.requested_at,
        processedAt: r.processed_at,
        rejectionReason: r.rejection_reason,
      }));
    } catch (error) {
      console.error('❌ [BUYIN REQUESTS] Error:', error);
      throw new BadRequestException('Failed to fetch buy-in requests');
    }
  }

  /**
   * Get player transactions
   */
  async getPlayerTransactions(playerId: string, clubId: string, limit: number = 50, offset: number = 0) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate limit and offset
      if (limit === null || limit === undefined || typeof limit !== 'number' || isNaN(limit)) {
        throw new BadRequestException('Limit must be a valid number');
      }
      if (limit < 1) {
        throw new BadRequestException('Limit must be at least 1');
      }
      if (limit > 100) {
        throw new BadRequestException('Limit cannot exceed 100');
      }
      if (offset === null || offset === undefined || typeof offset !== 'number' || isNaN(offset)) {
        throw new BadRequestException('Offset must be a valid number');
      }
      if (offset < 0) {
        throw new BadRequestException('Offset must be 0 or greater');
      }
      if (offset > 10000) {
        throw new BadRequestException('Offset cannot exceed 10000');
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot access transactions.');
      }

      // Edge case: Get transactions with error handling
      let transactions = [];
      let total = 0;
      try {
        console.log(`📊 [PLAYER TRANSACTIONS] Fetching for player ${player.id} in club ${clubId.trim()}`);
        // Hide paired "Table Buy In" rows that only mirror a Credit ledger row (same rupees, same moment).
        // Players should see one line: the Credit / staff-approved draw — not the accounting mirror.
        const wb = TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER;
        const qb = this.transactionsRepo
          .createQueryBuilder('t')
          .where('t.club_id = :clubId', { clubId: clubId.trim() })
          .andWhere('t.player_id = :playerId', { playerId: player.id })
          .andWhere(
            `(TRIM(UPPER(t.type)) <> :tbi OR POSITION(:wb IN COALESCE(t.notes, '')) = 0)`,
            { tbi: 'TABLE BUY IN', wb },
          )
          .orderBy('t.created_at', 'DESC')
          .take(limit)
          .skip(offset);
        [transactions, total] = await qb.getManyAndCount();
        console.log(`📊 [PLAYER TRANSACTIONS] Found ${total} transactions, returning ${transactions.length}`);
      } catch (dbError) {
        console.error('Database error fetching transactions:', dbError);
        throw new BadRequestException('Unable to fetch transactions. Please try again.');
      }

      // Edge case: Validate and map transactions safely
      const mappedTransactions = transactions.map(t => {
        try {
          const amount = Number(t.amount);
          return {
            id: t.id,
            type: t.type || 'Unknown',
            amount: isNaN(amount) ? 0 : amount,
            status: t.status || 'Unknown',
            notes: t.notes ? t.notes.trim() : null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          };
        } catch (mapError) {
          console.error('Error mapping transaction:', t.id, mapError);
          return null;
        }
      }).filter(t => t !== null);

      return {
        transactions: mappedTransactions,
        total: Math.max(0, total),
        limit,
        offset,
        hasMore: (offset + limit) < total
      };
    } catch (err) {
      console.error('Get player transactions error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException('Failed to get player transactions');
    }
  }

  /**
   * Join waitlist
   */
  async joinWaitlist(
    playerId: string,
    clubId: string,
    tableType?: string,
    partySize: number = 1,
    requestedSeat?: number,
    gameType?: string,
    targetTableId?: string,
  ) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate party size
      if (partySize === null || partySize === undefined || typeof partySize !== 'number' || isNaN(partySize)) {
        throw new BadRequestException('Party size must be a valid number');
      }
      if (partySize < 1) {
        throw new BadRequestException('Party size must be at least 1');
      }
      if (partySize > 10) {
        throw new BadRequestException('Party size cannot exceed 10');
      }
      if (!Number.isInteger(partySize)) {
        throw new BadRequestException('Party size must be a whole number');
      }

      // Edge case: Validate tableType if provided
      if (tableType !== null && tableType !== undefined) {
        if (typeof tableType !== 'string') {
          throw new BadRequestException('Table type must be a string');
        }
        const trimmedTableType = tableType.trim();
        if (trimmedTableType.length > 50) {
          throw new BadRequestException('Table type cannot exceed 50 characters');
        }
        // Allow empty string (no preference)
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // CRITICAL: KYC CHECK - Players cannot join waitlist without KYC approval
      const kycStatusWaitlist = (player as any).kycStatus || 'pending';
      if (kycStatusWaitlist !== 'approved' && kycStatusWaitlist !== 'verified') {
        throw new ForbiddenException('Please complete KYC verification before joining the waitlist. Submit your KYC documents for approval.');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId.trim()) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot join waitlist.');
      }
      if (player.status && player.status.toLowerCase() === 'inactive') {
        throw new ForbiddenException('Account is inactive. Please contact support.');
      }

      // CRITICAL: Check if already on waitlist (use playerId for accuracy)
      const existingEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: clubId.trim() },
          playerId: playerId.trim(),
          status: WaitlistStatus.PENDING
        }
      });

      if (existingEntry) {
        throw new ConflictException('You are already on the waitlist. Please wait to be seated or remove yourself before joining again.');
      }

      // CRITICAL: Check if already seated at a table
      const seatedEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: clubId.trim() },
          playerId: playerId.trim(),
          status: WaitlistStatus.SEATED
        }
      });

      if (seatedEntry) {
        throw new ConflictException('You are already seated at a table. Please leave the table before joining the waitlist again.');
      }

      // Edge case: Check if any tables exist for this club
      let tablesCount = 0;
      try {
        tablesCount = await this.tablesRepo.count({
          where: { club: { id: clubId.trim() } }
        });
      } catch (dbError) {
        console.error('Database error counting tables:', dbError);
        throw new BadRequestException('Unable to verify tables. Please try again.');
      }

      if (tablesCount === 0) {
        throw new BadRequestException('No tables are configured for this club. Please contact the club administrator.');
      }

      // Poker vs Rummy: normalize requested game so assign-seat only allows matching table type
      const requestedGameType = ((): 'POKER' | 'RUMMY' => {
        const g = (gameType ?? tableType ?? '').toString().trim().toUpperCase();
        if (g === 'RUMMY') return 'RUMMY';
        return 'POKER';
      })();

      let gameLiveTables: Table[] = [];
      try {
        const rows = await this.tablesRepo.find({
          where: {
            club: { id: clubId.trim() },
            status: In([TableStatus.AVAILABLE, TableStatus.OCCUPIED]),
          },
        });
        gameLiveTables = rows.filter(
          (t) =>
            tableHasActiveStaffSession(t.notes) &&
            this.tableMatchesWaitlistGame(t, requestedGameType),
        );
      } catch (dbError) {
        console.error('Database error loading live tables for waitlist:', dbError);
      }

      let minBuyInRequired = 0;
      const targetTid = targetTableId?.trim();
      if (targetTid) {
        if (!uuidRegex.test(targetTid)) {
          throw new BadRequestException('Invalid table ID format');
        }
        const target = await this.tablesRepo.findOne({
          where: { id: targetTid, club: { id: clubId.trim() } },
        });
        if (!target) {
          throw new NotFoundException('Table not found');
        }
        if (!tableHasActiveStaffSession(target.notes)) {
          throw new BadRequestException(
            'This table does not have an active session. Ask staff to start the session, then try again.',
          );
        }
        if (!this.tableMatchesWaitlistGame(target, requestedGameType)) {
          throw new BadRequestException('This table does not match the game you selected.');
        }
        minBuyInRequired = Math.max(0, Number(target.minBuyIn) || 0);
      } else if (gameLiveTables.length > 0) {
        const mins = gameLiveTables.map((t) => Number(t.minBuyIn) || 0).filter((m) => m > 0);
        if (mins.length > 0) {
          minBuyInRequired = Math.max(...mins);
        }
      }

      const playerBalance = await this.getPlayerBalance(playerId.trim(), clubId.trim());
      const wallet = Number((playerBalance as any).availableBalance) || 0;
      const credit = Math.max(0, Number((playerBalance as any).availableCredit) || 0);
      const creditOnLine = Math.max(
        0,
        Number((playerBalance as any).creditUsed ?? (playerBalance as any).creditInAccount) || 0,
      );

      // Hard stop: players with negative wallet (credit debt) cannot join any table waitlist.
      if (wallet < 0) {
        throw new BadRequestException(
          `You cannot join a table while your wallet is negative (₹${wallet.toLocaleString('en-IN')}). Please repay at the cashier first, then try again.`,
        );
      }

      // On join, only approved credit already on-line can be auto-applied (not raw unlocked headroom).
      const creditUsableOnJoin = creditOnLine;
      if (minBuyInRequired > 0 && !playerMeetsTableMinBuyIn(wallet, creditUsableOnJoin, minBuyInRequired)) {
        const reason = `Wallet: ₹${wallet.toLocaleString('en-IN')}, credit on line: ₹${creditUsableOnJoin.toLocaleString('en-IN')}, credit remaining: ₹${credit.toLocaleString('en-IN')}.`;
        throw new BadRequestException(
          `You do not meet this table's minimum buy-in (₹${minBuyInRequired.toLocaleString('en-IN')}). ${reason} Add money at the cashier or use your credit line.`,
        );
      }

      // Edge case: Create waitlist entry with error handling
      let entry;
      try {
        entry = await this.waitlistSeatingService.createWaitlistEntry(clubId.trim(), {
          playerName: player.name.trim(),
          playerId: player.id,
          phoneNumber: player.phoneNumber ? player.phoneNumber.trim() : undefined,
          email: player.email.trim().toLowerCase(),
          partySize,
          tableType: tableType && tableType.trim() ? tableType.trim() : undefined,
          requestedGameType,
          requestedSeat: requestedSeat || undefined
        });
      } catch (createError) {
        console.error('Error creating waitlist entry:', createError);
        if (createError instanceof BadRequestException || createError instanceof ConflictException) {
          throw createError;
        }
        throw new BadRequestException('Failed to join waitlist. Please try again.');
      }

      // Edge case: Verify entry was created
      if (!entry || !entry.id) {
        throw new BadRequestException('Failed to create waitlist entry. Please try again.');
      }

      // Edge case: Get position in waitlist with error handling
      let allPending: WaitlistEntry[] = [];
      try {
        allPending = await this.waitlistRepo.find({
          where: {
            club: { id: clubId.trim() },
            status: WaitlistStatus.PENDING
          },
          order: {
            priority: 'DESC',
            createdAt: 'ASC'
          }
        });
      } catch (dbError) {
        console.error('Database error fetching waitlist:', dbError);
        // Continue with empty array - position will be 1
      }

      const position = allPending.findIndex(e => e.id === entry.id) + 1;

      // Count tables with an active session (same rule as player "live tables" list)
      let availableTablesCount = 0;
      try {
        const rows = await this.tablesRepo.find({
          where: {
            club: { id: clubId.trim() },
            status: In([TableStatus.AVAILABLE, TableStatus.OCCUPIED]),
          },
        });
        availableTablesCount = rows.filter((t) => tableHasActiveStaffSession(t.notes)).length;
      } catch (dbError) {
        console.error('Database error counting available tables:', dbError);
        // Continue with 0
      }

      return {
        entry: {
          id: entry.id,
          playerName: entry.playerName,
          partySize: entry.partySize,
          tableType: entry.tableType,
          requestedSeat: entry.requestedSeat,
          status: entry.status,
          createdAt: entry.createdAt
        },
        position,
        totalInQueue: allPending.length,
        availableTables: availableTablesCount,
        message: availableTablesCount === 0 
          ? 'No tables are currently available. You will be notified when a table becomes available.'
          : undefined
      };
    } catch (err) {
      console.error('Join waitlist error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ConflictException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException('Failed to join waitlist');
    }
  }

  /**
   * Get waitlist status
   */
  async getWaitlistStatus(playerId: string, clubId: string) {
    console.log(`🎯 [WAITLIST STATUS] Request for player ${playerId} in club ${clubId}`);
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot access waitlist status.');
      }

      // Edge case: Get waitlist entry with error handling
      // CRITICAL: Check for BOTH PENDING and SEATED status (player needs to see active games)
      let entry = null;
      try {
        entry = await this.waitlistRepo.findOne({
          where: {
            club: { id: clubId.trim() },
            playerId: playerId.trim(),
            status: In([WaitlistStatus.PENDING, WaitlistStatus.SEATED])
          },
          order: { createdAt: 'DESC' }
        });
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to fetch waitlist status. Please try again.');
      }

      console.log(`🔍 [WAITLIST STATUS] Entry found:`, entry ? { id: entry.id, status: entry.status, tableNumber: entry.tableNumber, playerId: entry.playerId } : null);

      if (!entry) {
        // Edge case: Check if any tables exist
        const tablesCount = await this.tablesRepo.count({
          where: { club: { id: clubId.trim() } }
        });

        let sessionLiveCount = 0;
        try {
          const rows = await this.tablesRepo.find({
            where: {
              club: { id: clubId.trim() },
              status: In([TableStatus.AVAILABLE, TableStatus.OCCUPIED]),
            },
          });
          sessionLiveCount = rows.filter((t) => tableHasActiveStaffSession(t.notes)).length;
        } catch {
          sessionLiveCount = 0;
        }

        return {
          onWaitlist: false,
          entry: null,
          position: null,
          totalInQueue: 0,
          availableTables: tablesCount > 0 ? sessionLiveCount : null,
          message: tablesCount === 0
            ? 'No tables are configured for this club.'
            : sessionLiveCount === 0
            ? 'No tables are currently available.'
            : undefined
        };
      }

      // Edge case: Get position if pending
      let position = null;
      let totalInQueue = 0;
      let availableTables = 0;
      if (entry.status === WaitlistStatus.PENDING) {
        let allPending: WaitlistEntry[] = [];
        try {
          allPending = await this.waitlistRepo.find({
            where: {
              club: { id: clubId.trim() },
              status: WaitlistStatus.PENDING
            },
            order: {
              priority: 'DESC',
              createdAt: 'ASC'
            }
          });
        } catch (dbError) {
          console.error('Database error fetching pending waitlist:', dbError);
          // Continue with empty array
        }
        position = allPending.findIndex(e => e.id === entry.id) + 1;
        totalInQueue = allPending.length;

        // Edge case: Check tables with an active session (player-visible live tables)
        try {
          const rows = await this.tablesRepo.find({
            where: {
              club: { id: clubId.trim() },
              status: In([TableStatus.AVAILABLE, TableStatus.OCCUPIED]),
            },
          });
          availableTables = rows.filter((t) => tableHasActiveStaffSession(t.notes)).length;
        } catch (dbError) {
          console.error('Database error counting available tables:', dbError);
          // Continue with 0
        }
      }

      // Get table info if player is SEATED
      let tableInfo = null;
      if (entry.status === WaitlistStatus.SEATED && entry.tableNumber) {
        try {
          const table = await this.tablesRepo.findOne({
            where: { club: { id: clubId.trim() }, tableNumber: entry.tableNumber }
          });
          if (table) {
            tableInfo = {
              tableId: table.id,
              tableName: `Table ${table.tableNumber}`,
              tableStatus: table.status,
              gameType: table.tableType || 'Cash Game'
            };
          }
        } catch (tableError) {
          console.error('Failed to fetch table info for seated player:', tableError);
        }
      }

      const result = {
        onWaitlist: entry.status === WaitlistStatus.PENDING,
        isSeated: entry.status === WaitlistStatus.SEATED,
        entry: {
          id: entry.id,
          playerName: entry.playerName,
          partySize: entry.partySize,
          tableType: entry.tableType,
          status: entry.status.toLowerCase(), // Return lowercase for frontend compatibility
          tableNumber: entry.tableNumber,
          seatNumber: (entry as any).assignedSeat ?? entry.requestedSeat, // Prefer actual assigned seat
          seatedAt: entry.seatedAt,
          createdAt: entry.createdAt
        },
        position: entry.status === WaitlistStatus.PENDING ? position : null,
        totalInQueue: entry.status === WaitlistStatus.PENDING ? totalInQueue : null,
        availableTables: entry.status === WaitlistStatus.PENDING ? availableTables : null,
        tableInfo, // Include table details for SEATED players
        message: entry.status === WaitlistStatus.PENDING && availableTables === 0
          ? 'No tables are currently available. You will be notified when a table becomes available.'
          : entry.status === WaitlistStatus.SEATED 
          ? `You are seated at ${tableInfo?.tableName || `Table ${entry.tableNumber}`}`
          : undefined
      };
      
      console.log(`✅ [WAITLIST STATUS] Returning:`, JSON.stringify(result, null, 2));
      return result;
    } catch (err) {
      console.error('Get waitlist status error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get waitlist status');
    }
  }

  /**
   * Cancel waitlist entry
   */
  async cancelWaitlist(playerId: string, clubId: string, entryId: string) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }
      if (!entryId || typeof entryId !== 'string' || !entryId.trim()) {
        throw new BadRequestException('Entry ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(entryId.trim())) {
        throw new BadRequestException('Invalid entry ID format');
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot cancel waitlist.');
      }

      // Edge case: Get entry with error handling
      let entry = null;
      try {
        entry = await this.waitlistRepo.findOne({
          where: {
            id: entryId.trim(),
            club: { id: clubId.trim() },
            email: player.email.trim().toLowerCase()
          }
        });
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to fetch waitlist entry. Please try again.');
      }

      if (!entry) {
        throw new NotFoundException('Waitlist entry not found');
      }

      // Edge case: Verify entry belongs to player
      if (entry.email && entry.email.toLowerCase() !== player.email.trim().toLowerCase()) {
        throw new ForbiddenException('You can only cancel your own waitlist entries');
      }

      if (entry.status === WaitlistStatus.SEATED) {
        throw new BadRequestException('Cannot cancel a seated entry. Please contact staff to unseat.');
      }
      if (entry.status === WaitlistStatus.CANCELLED) {
        throw new BadRequestException('Entry is already cancelled');
      }
      if (entry.status === WaitlistStatus.NO_SHOW) {
        throw new BadRequestException('Cannot cancel a no-show entry');
      }

      await this.waitlistSeatingService.cancelWaitlistEntry(clubId.trim(), entryId.trim());

      return { success: true, message: 'Waitlist entry cancelled successfully' };
    } catch (err) {
      console.error('Cancel waitlist error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to cancel waitlist entry');
    }
  }

  /**
   * Get available tables
   */
  async getAvailableTables(clubId: string) {
    try {
      // Edge case: Validate inputs
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Edge case: Validate club data
      if (!club.id || !club.name) {
        throw new BadRequestException('Club data is incomplete. Please contact support.');
      }

      // Note: Tables API does NOT require KYC - players can view available tables
      // but they cannot JOIN tables without KYC approval

      // Only poker/rummy cash tables with an active staff session (started or paused) appear in the
      // player app — not newly created tables before "Start session", and not after session end (CLOSED).
      let tables: Table[] = [];
      try {
        tables = await this.tablesRepo.find({
          where: {
            club: { id: clubId.trim() },
            status: In([TableStatus.AVAILABLE, TableStatus.OCCUPIED]),
          },
          relations: ['club'], // CRITICAL: Load club relation
          order: { tableNumber: 'ASC' },
        });
        tables = tables.filter((t) => tableHasActiveStaffSession(t.notes));
      } catch (dbError) {
        console.error('Database error fetching tables:', dbError);
        console.error('Error details:', dbError);
        throw new BadRequestException('Unable to fetch tables. Please try again.');
      }

      // Edge case: Return empty array with message if no tables
      if (tables.length === 0) {
        // Check if any tables exist at all
        let allTablesCount = 0;
        try {
          allTablesCount = await this.tablesRepo.count({
            where: { club: { id: clubId.trim() } }
          });
        } catch (dbError) {
          console.error('Database error counting tables:', dbError);
          // Continue with 0
        }

        return {
          tables: [],
          totalAvailable: 0,
          totalTables: allTablesCount,
          message: allTablesCount === 0
            ? 'No tables are configured for this club.'
            : 'No live table sessions right now. Tables appear when staff starts a session.'
        };
      }

      // Edge case: Map tables safely
      const mappedTables = tables.map(t => {
        try {
          const maxSeats = Number(t.maxSeats) || 0;
          const currentSeats = Number(t.currentSeats) || 0;
          const availableSeats = Math.max(0, maxSeats - currentSeats);
          
          return {
            id: t.id,
            tableNumber: t.tableNumber || 0,
            tableType: t.tableType || 'Unknown',
            maxSeats,
            currentSeats,
            availableSeats,
            minBuyIn: Number(t.minBuyIn) || 0,
            maxBuyIn: Number(t.maxBuyIn) || 0,
            status: t.status || 'Unknown',
            // Rummy-specific fields
            rummyVariant: t.rummyVariant || null,
            pointsValue: t.pointsValue ? Number(t.pointsValue) : null,
            numberOfDeals: t.numberOfDeals || null,
            dropPoints: t.dropPoints || null,
            maxPoints: t.maxPoints || null,
            entryFee: t.entryFee ? Number(t.entryFee) : null,
            minPlayers: t.minPlayers || null,
          };
        } catch (mapError) {
          console.error('Error mapping table:', t.id, mapError);
          return null;
        }
      }).filter(t => t !== null);

      return {
        tables: mappedTables,
        totalAvailable: mappedTables.length,
        totalTables: mappedTables.length,
        gameAccess: {
          pokerEnabled: club.pokerEnabled !== false,
          rummyEnabled: club.rummyEnabled || false,
        },
      };
    } catch (err) {
      console.error('Get available tables error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get available tables');
    }
  }

  /**
   * Get upcoming tournaments for players
   */
  async getUpcomingTournaments(clubId: string) {
    try {
      // Validate inputs
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Get scheduled and active tournaments
      console.log('🔍 [TOURNAMENTS] Fetching for clubId:', clubId.trim());
      
      const tournaments = await this.dataSource.query(`
        SELECT 
          id,
          name,
          description,
          buy_in,
          prize_pool,
          max_players,
          current_players,
          start_time,
          status,
          structure
        FROM tournaments
        WHERE club_id = $1
        AND status IN ('scheduled', 'active', 'registering')
        ORDER BY start_time ASC
        LIMIT 50
      `, [clubId.trim()]);

      console.log('✅ [TOURNAMENTS] Found:', tournaments?.length || 0, 'tournaments');
      if (tournaments && tournaments.length > 0) {
        console.log('📊 [TOURNAMENTS] First tournament:', tournaments[0]);
      }

      return {
        tournaments: tournaments || [],
        total: tournaments ? tournaments.length : 0
      };
    } catch (err) {
      console.error('Get upcoming tournaments error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get upcoming tournaments');
    }
  }

  /**
   * Get table details
   */
  async getTableDetails(clubId: string, tableId: string) {
    try {
      // Edge case: Validate inputs
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }
      if (!tableId || typeof tableId !== 'string' || !tableId.trim()) {
        throw new BadRequestException('Table ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!uuidRegex.test(tableId.trim())) {
        throw new BadRequestException('Invalid table ID format');
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Edge case: Get table with error handling (load club relation so belong-to-club check works)
      let table = null;
      try {
        table = await this.tablesRepo.findOne({
          where: {
            id: tableId.trim(),
            club: { id: clubId.trim() }
          },
          relations: ['club']
        });
      } catch (dbError) {
        console.error('Database error fetching table:', dbError);
        throw new BadRequestException('Unable to fetch table details. Please try again.');
      }

      if (!table) {
        throw new NotFoundException('Table not found');
      }

      // Edge case: Verify table belongs to club (table.club is loaded via relations)
      const tableClubId = table.club?.id ?? (table as any).club_id;
      if (tableClubId !== clubId.trim()) {
        throw new ForbiddenException('Table does not belong to this club');
      }

      // Edge case: Validate table data
      if (!table.id || !table.tableNumber) {
        throw new BadRequestException('Table data is incomplete. Please contact support.');
      }

      if (
        table.status === TableStatus.CLOSED ||
        table.status === TableStatus.MAINTENANCE ||
        !tableHasActiveStaffSession(table.notes)
      ) {
        throw new NotFoundException(
          'This table is not open for play. The session may have ended — pull to refresh.',
        );
      }

      const maxSeats = Number(table.maxSeats) || 0;
      const currentSeats = Number(table.currentSeats) || 0;
      const availableSeats = Math.max(0, maxSeats - currentSeats);

      // Fetch seated players for this table (reuses the same logic as staff portal)
      let seatedPlayers: any[] = [];
      try {
        const raw = await this.waitlistSeatingService.getSeatedPlayersForTable(clubId.trim(), tableId.trim());
        seatedPlayers = (raw || []).map((p: any) => ({
          seatNumber: p.seatNumber,
          buyInAmount: Number(p.buyInAmount) || 0,
          walletBalance: Number(p.walletBalance) || 0,
          creditLineLimit: Number(p.creditLineLimit) || 0,
          creditLineUsed: Number(p.creditLineUsed) || 0,
          creditLineRemaining: Number(p.creditLineRemaining) || 0,
          creditFacilityEnabled: !!p.creditFacilityEnabled,
          creditOnTableThisSession: Number(p.creditOnTableThisSession) || 0,
          cashOnTableThisSession: Number(p.cashOnTableThisSession) || 0,
          playerName: p.playerName || 'Player',
          initials: p.playerName
            ? p.playerName.split(' ').map((n: string) => n[0] || '').join('').toUpperCase().substring(0, 2)
            : '??',
        }));
      } catch {
        // Non-fatal: fall back to empty array if query fails
      }

      return {
        id: table.id,
        tableNumber: table.tableNumber || 0,
        tableType: table.tableType || 'Unknown',
        maxSeats,
        currentSeats,
        availableSeats,
        minBuyIn: Number(table.minBuyIn) || 0,
        maxBuyIn: Number(table.maxBuyIn) || 0,
        status: table.status || 'Unknown',
        notes: table.notes ? table.notes.trim() : null,
        rummyVariant: table.rummyVariant || null,
        pointsValue: table.pointsValue ? Number(table.pointsValue) : null,
        numberOfDeals: table.numberOfDeals || null,
        entryFee: table.entryFee ? Number(table.entryFee) : null,
        seatedPlayers,
      };
    } catch (err) {
      console.error('Get table details error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get table details');
    }
  }

  /**
   * Request credit
   */
  async requestCredit(playerId: string, clubId: string, amount: number, notes?: string) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Validate amount
      if (amount === null || amount === undefined) {
        throw new BadRequestException('Amount is required');
      }
      if (typeof amount !== 'number') {
        throw new BadRequestException('Amount must be a number');
      }
      if (isNaN(amount)) {
        throw new BadRequestException('Amount must be a valid number');
      }
      if (amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }
      if (amount > 1000000) {
        throw new BadRequestException('Amount cannot exceed ₹1,000,000');
      }
      if (amount < 1) {
        throw new BadRequestException('Amount must be at least ₹1');
      }
      // Edge case: Check for very small amounts (potential errors)
      if (amount < 0.01) {
        throw new BadRequestException('Amount is too small');
      }

      // Edge case: Validate notes if provided
      if (notes !== null && notes !== undefined) {
        if (typeof notes !== 'string') {
          throw new BadRequestException('Notes must be a string');
        }
        if (notes.trim().length > 500) {
          throw new BadRequestException('Notes cannot exceed 500 characters');
        }
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // CRITICAL: KYC CHECK - Players cannot request credit without KYC approval
      const kycStatusCredit = (player as any).kycStatus || 'pending';
      if (kycStatusCredit !== 'approved' && kycStatusCredit !== 'verified') {
        throw new ForbiddenException('Please complete KYC verification before requesting credit. Submit your KYC documents for approval.');
      }

      // CRITICAL: CREDIT ENABLED CHECK - Credit must be enabled by super admin/club management first
      const creditEnabled = (player as any).creditEnabled || false;
      if (!creditEnabled) {
        throw new ForbiddenException('Credit facility is not enabled for your account. Please contact club management to enable credit before requesting.');
      }

      // Edge case: Verify player belongs to club
      if (!player.club || player.club.id !== clubId.trim()) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Edge case: Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot request credit.');
      }
      if (player.status && player.status.toLowerCase() === 'inactive') {
        throw new ForbiddenException('Account is inactive. Please contact support.');
      }

      const pendingRow = await this.dataSource.query(
        `SELECT id FROM credit_requests
         WHERE club_id = $1 AND player_id = $2 AND status = 'Pending'
         LIMIT 1`,
        [clubId.trim(), playerId.trim()],
      );
      if (pendingRow?.length) {
        throw new ConflictException(
          'You already have a pending credit request. Wait until staff approves or rejects it before submitting another.',
        );
      }

      // Edge case: Create credit request with error handling
      let creditRequest;
      try {
        console.log('💳 [CREDIT REQUEST] Creating credit request:', {
          clubId: clubId.trim(),
          playerId: player.id,
          playerName: player.name.trim(),
          amount,
          notes: notes && notes.trim() ? notes.trim() : undefined
        });
        
        creditRequest = await this.creditRequestsService.create(clubId.trim(), {
          playerId: player.id,
          playerName: player.name.trim(),
          amount,
          notes: notes && notes.trim() ? notes.trim() : undefined
        });
        
        console.log('💳 [CREDIT REQUEST] Credit request created successfully:', creditRequest.id);
      } catch (createError) {
        console.error('❌ [CREDIT REQUEST] Error creating credit request:', createError);
        console.error('❌ [CREDIT REQUEST] Error details:', {
          message: createError instanceof Error ? createError.message : String(createError),
          stack: createError instanceof Error ? createError.stack : undefined,
          name: createError instanceof Error ? createError.name : undefined
        });
        if (
          createError instanceof BadRequestException ||
          createError instanceof NotFoundException ||
          createError instanceof ConflictException ||
          createError instanceof ForbiddenException
        ) {
          throw createError;
        }
        throw new BadRequestException(`Failed to create credit request: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
      }

      // Edge case: Verify request was created
      if (!creditRequest || !creditRequest.id) {
        throw new BadRequestException('Credit request creation failed. Please try again.');
      }

      return {
        success: true,
        message: 'Credit request submitted successfully',
        requestId: creditRequest.id,
        amount: Number(creditRequest.amount),
        status: creditRequest.status,
        createdAt: creditRequest.createdAt
      };
    } catch (err) {
      console.error('❌ [CREDIT REQUEST] Request credit error:', err);
      console.error('❌ [CREDIT REQUEST] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined,
        constructor: err?.constructor?.name
      });
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      throw new BadRequestException(`Failed to request credit: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Upsert native FCM device token for this player + club (device_tokens.player_uuid + club_id).
   */
  async registerPlayerDeviceToken(playerId: string, clubId: string, token: string, platform?: string) {
    const t = token.trim();
    if (t.length < 10 || t.length > 4096) {
      throw new BadRequestException('Invalid device token');
    }
    const player = await this.playersRepo.findOne({
      where: { id: playerId.trim(), club: { id: clubId.trim() } },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    const plat = (platform || 'unknown').trim().slice(0, 32) || 'unknown';
    await this.dataSource.query(
      `INSERT INTO device_tokens (token, platform, player_uuid, club_id, updated_at)
       VALUES ($1, $2, $3, $4::uuid, NOW())
       ON CONFLICT (token) DO UPDATE SET
         player_uuid = EXCLUDED.player_uuid,
         platform = EXCLUDED.platform,
         club_id = EXCLUDED.club_id,
         updated_at = NOW()`,
      [t, plat, playerId.trim(), clubId.trim()],
    );
    return { success: true };
  }

  /**
   * Get player credit requests
   */
  async getPlayerCreditRequests(playerId: string, clubId: string) {
    try {
      // Verify player exists
      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Get all credit requests for this player (only visible ones)
      const requests = await this.dataSource.query(
        `SELECT 
          id,
          player_id as "playerId",
          player_name as "playerName",
          amount as "requestedAmount",
          status,
          notes as "requestNote",
          credit_limit as "approvedLimit",
          rejection_reason as "rejectedReason",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM credit_requests 
        WHERE club_id = $1 AND player_id = $2 AND visible_to_player = true
        ORDER BY created_at DESC`,
        [clubId.trim(), playerId.trim()]
      );

      console.log('💳 [GET CREDIT REQUESTS] Found', requests.length, 'requests for player:', playerId);
      
      return requests || [];
    } catch (err) {
      console.error('❌ [GET CREDIT REQUESTS] Error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get credit requests');
    }
  }

  /**
   * Place FNB order (Food & Beverage)
   */
  async placeFnbOrder(
    playerId: string,
    clubId: string,
    orderData: {
      playerId: string;
      playerName: string;
      items: Array<{ itemId: number; itemName: string; price: string; quantity: number }>;
      totalAmount: string;
      notes?: string | null;
      tableNumber?: string | null;
    }
  ) {
    try {
      // Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // CRITICAL: KYC CHECK - Players cannot order food without KYC approval
      const kycStatusFnb = (player as any).kycStatus || 'pending';
      if (kycStatusFnb !== 'approved' && kycStatusFnb !== 'verified') {
        throw new ForbiddenException('Please complete KYC verification before placing food orders. Submit your KYC documents for approval.');
      }

      // Verify player belongs to club
      if (!player.club || player.club.id !== clubId.trim()) {
        throw new ForbiddenException('Player does not belong to this club');
      }

      // Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot place orders.');
      }
      if (player.status && player.status.toLowerCase() === 'inactive') {
        throw new ForbiddenException('Account is inactive. Please contact support.');
      }

      // Validate order data
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new BadRequestException('Order must contain at least one item');
      }

      // Persist order in FNB system so staff can see and update status
      const fnbOrder = await this.fnbService.createOrder(
        clubId.trim(),
        {
          playerName: orderData.playerName || player.name,
          playerId: player.id,
          tableNumber: orderData.tableNumber || 'N/A',
          items: orderData.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price) || 0,
          })),
          totalAmount: parseFloat(orderData.totalAmount) || 0,
          specialInstructions: orderData.notes || undefined,
        }
      );

      return {
        success: true,
        message: 'Order received successfully',
        orderId: fnbOrder.id,
        orderNumber: fnbOrder.orderNumber,
        status: fnbOrder.status,
        createdAt: fnbOrder.createdAt,
      };
    } catch (err) {
      console.error('Place FNB order error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException('Failed to place order: ' + errorMessage);
    }
  }

  /**
   * Get player stats
   */
  async getPlayerStats(playerId: string, clubId: string) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      // Edge case: Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Edge case: Check if club exists
      const club = await this.clubsService.findById(clubId.trim());
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club']
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Edge case: Check player account status
      if (player.status && player.status.toLowerCase() === 'suspended') {
        throw new ForbiddenException('Account is suspended. Cannot access stats.');
      }

      // Edge case: Get transaction stats with error handling
      let transactions: FinancialTransaction[] = [];
      try {
        transactions = await this.transactionsRepo.find({
          where: {
            club: { id: clubId.trim() },
            playerId: player.id,
            status: TransactionStatus.COMPLETED
          },
          order: { createdAt: 'DESC' }
        });
      } catch (dbError) {
        console.error('Database error fetching transactions for stats:', dbError);
        // Continue with empty array
      }

      // Edge case: Calculate stats safely
      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalBuyIns = 0;

      for (const txn of transactions) {
        try {
          const amount = Number(txn.amount);
          if (isNaN(amount)) {
            console.warn('Invalid transaction amount in stats:', txn.id);
            continue;
          }
          if (['Deposit', 'Credit', 'Bonus'].includes(txn.type)) {
            totalDeposits += amount;
          } else if (['Cashout', 'Withdrawal'].includes(txn.type)) {
            totalWithdrawals += amount;
          } else if (txn.type === 'Buy In') {
            totalBuyIns += amount;
          }
        } catch (calcError) {
          console.error('Error calculating stats from transaction:', txn.id, calcError);
          // Skip this transaction
        }
      }

      // Edge case: Ensure non-negative values
      totalDeposits = Math.max(0, totalDeposits);
      totalWithdrawals = Math.max(0, totalWithdrawals);
      totalBuyIns = Math.max(0, totalBuyIns);

      return {
        totalSpent: Math.max(0, Number(player.totalSpent) || 0),
        totalCommission: Math.max(0, Number(player.totalCommission) || 0),
        totalDeposits,
        totalWithdrawals,
        totalBuyIns,
        totalTransactions: transactions.length,
        accountStatus: player.status || 'Active',
        memberSince: player.createdAt || new Date()
      };
    } catch (err) {
      console.error('Get player stats error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get player stats');
    }
  }

  /**
   * Get F&B menu for players (no auth required)
   */
  async getPlayerFnbMenu(clubId: string, category?: string) {
    try {
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Query F&B menu from database (using menu_items table)
      console.log('🍔 [FNB] Fetching menu for club:', clubId);
      let query = `
        SELECT 
          id, 
          name, 
          description,
          category,
          price,
          availability,
          image_url_1 as image_url,
          stock
        FROM menu_items 
        WHERE club_id = $1
      `;
      const params: any[] = [clubId];

      if (category) {
        query += ` AND LOWER(category) = LOWER($2)`;
        params.push(category);
      }

      query += ` ORDER BY category ASC, name ASC`;

      const menuItems = await this.playersRepo.query(query, params);
      console.log('🍔 [FNB] Found menu items:', menuItems.length, menuItems);

      return {
        menuItems: menuItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          price: parseFloat(item.price),
          isAvailable: item.availability === 'in-stock' || item.availability === 'limited',
          image_url: item.image_url,
          stock: item.stock,
          availability: item.availability,
        })),
        total: menuItems.length,
      };
    } catch (err) {
      console.error('Get player F&B menu error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get menu');
    }
  }

  /**
   * Get FNB orders for a player in a club
   */
  async getPlayerFnbOrders(
    playerId: string,
    clubId: string,
    historyPage = 1,
    historyLimit = 10,
  ) {
    try {
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId.trim())) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId.trim())) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Ensure player belongs to club
      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const mapOrder = (order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        statusHistory: order.statusHistory,
        cancellationReason: order.cancellationReason || order.cancellation_reason || null,
        rejectionReason:
          order.rejectionReason ||
          order.rejection_reason ||
          order.rejectedReason ||
          order.rejected_reason ||
          null,
      });

      const { activeOrders, history } = await this.fnbService.getPlayerOrderFeed(
        clubId.trim(),
        playerId.trim(),
        historyPage,
        historyLimit,
      );

      const historyMapped = history.orders.map(mapOrder);
      const activeMapped = activeOrders.map(mapOrder);

      return {
        success: true,
        activeOrders: activeMapped,
        history: {
          orders: historyMapped,
          total: history.total,
          page: history.page,
          limit: history.limit,
          totalPages: history.totalPages,
        },
        /** @deprecated Flat list — use activeOrders + history; kept for older builds */
        orders: [...activeMapped, ...historyMapped].sort(
          (a, b) =>
            new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
        ),
      };
    } catch (err) {
      console.error('Get player FNB orders error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get orders');
    }
  }

  /**
   * Submit player feedback
   */
  async submitPlayerFeedback(
    playerId: string,
    clubId: string,
    message: string,
    rating?: number,
  ) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Store feedback in database
      await this.playersRepo.query(
        `
        INSERT INTO player_feedback (player_id, club_id, message, rating, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT DO NOTHING
      `,
        [playerId, clubId, message, rating || null],
      );

      return {
        success: true,
        message: 'Feedback submitted successfully',
        submittedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Submit feedback error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to submit feedback');
    }
  }

  /**
   * Get feedback history for a player within a club
   */
  async getPlayerFeedbackHistory(playerId: string, clubId: string) {
    try {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      // Ensure player belongs to the club before returning feedback
      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const rows = await this.playersRepo.query(
        `
        SELECT id, message, rating, created_at
        FROM player_feedback
        WHERE player_id = $1 AND club_id = $2
        ORDER BY created_at DESC
        LIMIT 50
      `,
        [playerId, clubId],
      );

      return {
        success: true,
        feedback: rows,
      };
    } catch (err) {
      console.error('Get feedback history error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to fetch feedback history');
    }
  }

  /**
   * Create a per-field profile change request for staff review
   */
  async requestProfileFieldChange(
    playerId: string,
    clubId: string,
    fieldName: string,
    currentValue: string | null,
    requestedValue: string,
  ) {
    try {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }
      if (!fieldName || !fieldName.trim()) {
        throw new BadRequestException('Field name is required');
      }
      if (!requestedValue || !requestedValue.trim()) {
        throw new BadRequestException('Requested value is required');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const fn = fieldName.trim();
      const pendingConflict = await this.playersRepo.query(
        `
        SELECT id FROM player_profile_change_requests
        WHERE player_id = $1 AND club_id = $2 AND status = 'pending'
          AND (
            field_name = $3
            OR ($3 = 'aadhaar' AND field_name IN ('aadhaar', 'government_id', 'aadhaar_front', 'aadhaar_back'))
            OR ($3 IN ('government_id', 'aadhaar_front', 'aadhaar_back') AND field_name IN ('aadhaar', 'government_id', 'aadhaar_front', 'aadhaar_back'))
            OR ($3 = 'phone' AND field_name IN ('phone', 'phoneNumber'))
            OR ($3 = 'phoneNumber' AND field_name IN ('phone', 'phoneNumber'))
          )
        LIMIT 1
      `,
        [playerId, clubId, fn],
      );
      if (Array.isArray(pendingConflict) && pendingConflict.length > 0) {
        throw new BadRequestException(
          'You already have a pending change request for this field. Please wait for staff to review it.',
        );
      }

      await this.playersRepo.query(
        `
        INSERT INTO player_profile_change_requests
          (player_id, club_id, field_name, current_value, requested_value, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      `,
        [playerId, clubId, fn, currentValue, requestedValue],
      );

      return {
        success: true,
        message: 'Profile change request submitted',
      };
    } catch (err) {
      console.error('Profile change request error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to submit profile change request');
    }
  }

  async getPlayerProfileChangeRequests(playerId: string, clubId: string) {
    try {
      const results = await this.playersRepo.query(
        `SELECT id, field_name, current_value, requested_value, status, review_notes, created_at, reviewed_at
         FROM player_profile_change_requests
         WHERE player_id = $1 AND club_id = $2
         ORDER BY created_at DESC
         LIMIT 20`,
        [playerId, clubId],
      );

      return {
        success: true,
        requests: results.map((r: any) => ({
          id: r.id,
          fieldName: r.field_name,
          currentValue: r.current_value,
          requestedValue: r.requested_value,
          status: r.status,
          reviewNotes: r.review_notes,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at,
        })),
      };
    } catch (err) {
      console.error('Get profile change requests error:', err);
      return { success: true, requests: [] };
    }
  }

  async dismissProfileChangeRequest(requestId: string, playerId: string) {
    try {
      await this.playersRepo.query(
        `DELETE FROM player_profile_change_requests
         WHERE id = $1 AND player_id = $2 AND status = 'rejected'`,
        [requestId, playerId],
      );
      return { success: true, message: 'Request dismissed' };
    } catch (err) {
      console.error('Dismiss profile change request error:', err);
      throw new BadRequestException('Failed to dismiss request');
    }
  }
}

