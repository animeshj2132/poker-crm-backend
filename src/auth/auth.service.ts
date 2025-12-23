import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { GlobalRole } from '../common/rbac/roles';
import { UsersService } from '../users/users.service';
import { ClubsService } from '../clubs/clubs.service';
import { UserTenantRole } from '../users/user-tenant-role.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { Player } from '../clubs/entities/player.entity';
import { FinancialTransaction, TransactionStatus } from '../clubs/entities/financial-transaction.entity';
import { WaitlistEntry, WaitlistStatus } from '../clubs/entities/waitlist-entry.entity';
import { Table, TableStatus } from '../clubs/entities/table.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRole, ClubRole } from '../common/rbac/roles';
import * as bcrypt from 'bcrypt';
import { AffiliatesService } from '../clubs/services/affiliates.service';
import { FinancialTransactionsService } from '../clubs/services/financial-transactions.service';
import { WaitlistSeatingService } from '../clubs/services/waitlist-seating.service';
import { CreditRequestsService } from '../clubs/services/credit-requests.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly clubsService: ClubsService,
    private readonly affiliatesService: AffiliatesService,
    private readonly financialTransactionsService: FinancialTransactionsService,
    private readonly waitlistSeatingService: WaitlistSeatingService,
    private readonly creditRequestsService: CreditRequestsService,
    @InjectRepository(UserTenantRole) private readonly userTenantRoleRepo: Repository<UserTenantRole>,
    @InjectRepository(UserClubRole) private readonly userClubRoleRepo: Repository<UserClubRole>,
    @InjectRepository(Player) private readonly playersRepo: Repository<Player>,
    @InjectRepository(FinancialTransaction) private readonly transactionsRepo: Repository<FinancialTransaction>,
    @InjectRepository(WaitlistEntry) private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Table) private readonly tablesRepo: Repository<Table>
  ) {}

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

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isMasterAdmin: user.isMasterAdmin || false
        },
        mustResetPassword: user.mustResetPassword || false,
        tenants: tenantRoles.map(tr => ({
          tenantId: tr.tenant?.id || '',
          tenantName: (tr.tenant as any)?.name || ''
        })),
        clubs: clubRoles.map(cr => ({
          clubId: cr.club?.id || '',
          clubName: (cr.club as any)?.name || '',
          tenantId: (cr.club as any)?.tenant?.id || '',
          tenantName: (cr.club as any)?.tenant?.name || '',
          roles: [cr.role] // User can have multiple roles in the same club
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

      return {
        player: {
          id: player.id,
          name: player.name.trim(),
          email: player.email.trim().toLowerCase(),
          phoneNumber: player.phoneNumber ? player.phoneNumber.trim() : null,
          nickname: player.playerId ? player.playerId.trim() : null,
          status: player.status || 'Active',
          kycStatus: (player as any).kycStatus || 'pending',
          kycApproved: (player as any).kycStatus === 'approved' || (player as any).kycStatus === 'verified'
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
      const player = this.playersRepo.create({
        club: club,
        name: fullName,
        email: lowerEmail,
        phoneNumber: trimmedPhone,
        playerId: trimmedNickname,
        passwordHash: passwordHash,
        affiliate: affiliate,
        status: 'Active'
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
          nickname: playerWithRelations.playerId ? playerWithRelations.playerId.trim() : trimmedNickname,
          status: playerWithRelations.status || 'Active',
          kycStatus: (playerWithRelations as any).kycStatus || 'pending',
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
          nickname: player.playerId ? player.playerId.trim() : null,
          status: player.status || 'Active',
          kycStatus: (player as any).kycStatus || 'pending',
          kycApproved: (player as any).kycStatus === 'approved' || (player as any).kycStatus === 'verified',
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
   * Update player profile
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

      // Update name if provided
      if (firstName || lastName) {
        const currentName = player.name.split(' ');
        const newFirstName = firstName?.trim() || currentName[0] || '';
        const newLastName = lastName?.trim() || currentName.slice(1).join(' ') || '';
        
        if (newFirstName.length < 2) {
          throw new BadRequestException('First name must be at least 2 characters');
        }
        if (newFirstName.length > 100) {
          throw new BadRequestException('First name cannot exceed 100 characters');
        }
        if (newLastName.length < 2) {
          throw new BadRequestException('Last name must be at least 2 characters');
        }
        if (newLastName.length > 100) {
          throw new BadRequestException('Last name cannot exceed 100 characters');
        }
        if (!/^[a-zA-Z\s\-'\.]+$/.test(newFirstName)) {
          throw new BadRequestException('First name contains invalid characters');
        }
        if (!/^[a-zA-Z\s\-'\.]+$/.test(newLastName)) {
          throw new BadRequestException('Last name contains invalid characters');
        }

        player.name = `${newFirstName} ${newLastName}`.trim();
      }

      // Update phone number if provided
      if (phoneNumber !== undefined) {
        if (phoneNumber === null || phoneNumber === '') {
          player.phoneNumber = null;
        } else {
          if (typeof phoneNumber !== 'string') {
            throw new BadRequestException('Phone number must be a string');
          }
          const trimmedPhone = phoneNumber.trim();
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

      // Update nickname if provided
      if (nickname !== undefined) {
        if (nickname === null || nickname === '') {
          player.playerId = null;
        } else {
          if (typeof nickname !== 'string') {
            throw new BadRequestException('Nickname must be a string');
          }
          const trimmedNickname = nickname.trim();
          if (trimmedNickname.length > 50) {
            throw new BadRequestException('Nickname cannot exceed 50 characters');
          }
          player.playerId = trimmedNickname;
        }
      }

      const savedPlayer = await this.playersRepo.save(player);

      return {
        player: {
          id: savedPlayer.id,
          name: savedPlayer.name,
          email: savedPlayer.email,
          phoneNumber: savedPlayer.phoneNumber,
          nickname: savedPlayer.playerId,
          status: savedPlayer.status
        }
      };
    } catch (err) {
      console.error('Update player profile error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException('Failed to update player profile');
    }
  }

  /**
   * Change player password
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
   */
  async getPlayerBalance(playerId: string, clubId: string) {
    try {
      // Edge case: Validate inputs
      if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
        throw new BadRequestException('Player ID is required');
      }
      if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
        throw new BadRequestException('Club ID is required');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId.trim(), club: { id: clubId.trim() } }
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // CRITICAL: KYC CHECK - Players with pending KYC can view balance but cannot perform actions
      const kycStatus = (player as any).kycStatus || 'pending';
      if (kycStatus !== 'approved' && kycStatus !== 'verified') {
        // Return zero balance for pending KYC - they must complete KYC first
        return {
          availableBalance: 0,
          tableBalance: 0,
          totalBalance: 0,
          tableId: null,
          seatNumber: null,
          kycStatus: kycStatus,
          kycRequired: true,
          message: 'Please complete KYC verification to view your balance'
        };
      }

      // Edge case: Get completed transactions with error handling
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
        console.error('Database error fetching transactions:', dbError);
        // Continue with empty transactions array
        transactions = [];
      }

      // Edge case: Calculate balance from transactions
      let availableBalance = 0;
      for (const txn of transactions) {
        try {
          const amount = Number(txn.amount);
          if (isNaN(amount)) {
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

      // Edge case: Ensure balance is not negative (shouldn't happen but safety check)
      availableBalance = Math.max(0, availableBalance);

      // Get table balance (if seated)
      const waitlistEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: clubId.trim() },
          email: player.email,
          status: WaitlistStatus.SEATED
        },
        relations: ['club']
      });

      let tableBalance = 0;
      let tableId = null;
      let seatNumber = null;

      if (waitlistEntry && waitlistEntry.tableNumber) {
        const table = await this.tablesRepo.findOne({
          where: { club: { id: clubId.trim() }, tableNumber: waitlistEntry.tableNumber }
        });
        if (table) {
          tableId = table.id;
          // Estimate table balance (would need actual game state)
          tableBalance = 0; // Placeholder
        }
      }

      // Get credit information
      const creditEnabled = (player as any).creditEnabled || false;
      const creditLimit = (player as any).creditLimit || 0;
      const creditUsed = 0; // TODO: Calculate from active credit requests
      const availableCredit = creditEnabled ? Math.max(0, creditLimit - creditUsed) : 0;

      return {
        availableBalance: Math.max(0, availableBalance),
        tableBalance,
        totalBalance: Math.max(0, availableBalance) + tableBalance,
        tableId,
        seatNumber: waitlistEntry?.tableNumber || null,
        creditEnabled,
        creditLimit,
        availableCredit
      };
    } catch (err) {
      console.error('Get player balance error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to get player balance');
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
        [transactions, total] = await this.transactionsRepo.findAndCount({
          where: {
            club: { id: clubId.trim() },
            playerId: player.id
          },
          order: { createdAt: 'DESC' },
          take: limit,
          skip: offset
        });
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
  async joinWaitlist(playerId: string, clubId: string, tableType?: string, partySize: number = 1) {
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

      // Check if already on waitlist
      const existingEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: clubId.trim() },
          email: player.email,
          status: WaitlistStatus.PENDING
        }
      });

      if (existingEntry) {
        throw new ConflictException('You are already on the waitlist');
      }

      // Check if already seated
      const seatedEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: clubId.trim() },
          email: player.email,
          status: WaitlistStatus.SEATED
        }
      });

      if (seatedEntry) {
        throw new ConflictException('You are already seated at a table');
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

      // Edge case: Check if any tables are available (if tableType specified)
      if (tableType && tableType.trim()) {
        let availableTables = [];
        try {
          availableTables = await this.tablesRepo.find({
            where: {
              club: { id: clubId.trim() },
              tableType: tableType.trim() as any,
              status: TableStatus.AVAILABLE
            }
          });
        } catch (dbError) {
          console.error('Database error checking available tables:', dbError);
          // Continue - still allow joining waitlist
        }

        if (availableTables.length === 0) {
          // Still allow joining waitlist, but inform player
          // They'll be notified when tables become available
        }
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
          tableType: tableType && tableType.trim() ? tableType.trim() : undefined
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

      // Edge case: Check if there are any available tables
      let availableTablesCount = 0;
      try {
        availableTablesCount = await this.tablesRepo.count({
          where: {
            club: { id: clubId.trim() },
            status: TableStatus.AVAILABLE
          }
        });
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
      let entry = null;
      try {
        entry = await this.waitlistRepo.findOne({
          where: {
            club: { id: clubId.trim() },
            playerId: playerId.trim(),
            status: WaitlistStatus.PENDING
          },
          order: { createdAt: 'DESC' }
        });
      } catch (dbError) {
        console.error('Database error fetching waitlist entry:', dbError);
        throw new BadRequestException('Unable to fetch waitlist status. Please try again.');
      }

      if (!entry) {
        // Edge case: Check if any tables exist
        const tablesCount = await this.tablesRepo.count({
          where: { club: { id: clubId.trim() } }
        });

        const availableTables = await this.tablesRepo.count({
          where: {
            club: { id: clubId.trim() },
            status: TableStatus.AVAILABLE
          }
        });

        return {
          onWaitlist: false,
          entry: null,
          position: null,
          totalInQueue: 0,
          availableTables: tablesCount > 0 ? availableTables : null,
          message: tablesCount === 0
            ? 'No tables are configured for this club.'
            : availableTables === 0
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

        // Edge case: Check available tables
        try {
          availableTables = await this.tablesRepo.count({
            where: {
              club: { id: clubId.trim() },
              status: TableStatus.AVAILABLE
            }
          });
        } catch (dbError) {
          console.error('Database error counting available tables:', dbError);
          // Continue with 0
        }
      }

      return {
        onWaitlist: true,
        entry: {
          id: entry.id,
          playerName: entry.playerName,
          partySize: entry.partySize,
          tableType: entry.tableType,
          status: entry.status,
          tableNumber: entry.tableNumber,
          createdAt: entry.createdAt
        },
        position,
        totalInQueue,
        availableTables: entry.status === WaitlistStatus.PENDING ? availableTables : null,
        message: entry.status === WaitlistStatus.PENDING && availableTables === 0
          ? 'No tables are currently available. You will be notified when a table becomes available.'
          : undefined
      };
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

      // Edge case: Get tables with error handling
      let tables = [];
      try {
        tables = await this.tablesRepo.find({
          where: {
            club: { id: clubId.trim() },
            status: TableStatus.AVAILABLE
          },
          relations: ['club'], // CRITICAL: Load club relation
          order: { tableNumber: 'ASC' }
        });
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
            : 'No tables are currently available. All tables may be occupied or reserved.'
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
            status: t.status || 'Unknown'
          };
        } catch (mapError) {
          console.error('Error mapping table:', t.id, mapError);
          return null;
        }
      }).filter(t => t !== null);

      return {
        tables: mappedTables,
        totalAvailable: mappedTables.length,
        totalTables: mappedTables.length
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

      // Edge case: Get table with error handling
      let table = null;
      try {
        table = await this.tablesRepo.findOne({
          where: {
            id: tableId.trim(),
            club: { id: clubId.trim() }
          }
        });
      } catch (dbError) {
        console.error('Database error fetching table:', dbError);
        throw new BadRequestException('Unable to fetch table details. Please try again.');
      }

      if (!table) {
        throw new NotFoundException('Table not found');
      }

      // Edge case: Verify table belongs to club
      if (!table.club || (table.club as any).id !== clubId.trim()) {
        throw new ForbiddenException('Table does not belong to this club');
      }

      // Edge case: Validate table data
      if (!table.id || !table.tableNumber) {
        throw new BadRequestException('Table data is incomplete. Please contact support.');
      }

      const maxSeats = Number(table.maxSeats) || 0;
      const currentSeats = Number(table.currentSeats) || 0;
      const availableSeats = Math.max(0, maxSeats - currentSeats);

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
        notes: table.notes ? table.notes.trim() : null
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

      // Edge case: Create credit request with error handling
      let creditRequest;
      try {
        creditRequest = await this.creditRequestsService.create(clubId.trim(), {
          playerId: player.id,
          playerName: player.name.trim(),
          amount,
          notes: notes && notes.trim() ? notes.trim() : undefined
        });
      } catch (createError) {
        console.error('Error creating credit request:', createError);
        if (createError instanceof BadRequestException || createError instanceof NotFoundException || createError instanceof ConflictException) {
          throw createError;
        }
        throw new BadRequestException('Failed to create credit request. Please try again.');
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
      console.error('Request credit error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException('Failed to request credit');
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

      // For now, return success - full FNB implementation will come later
      // This allows players to place orders after KYC approval
      return {
        success: true,
        message: 'Order received successfully',
        orderId: `fnb-${Date.now()}`,
        orderData: {
          playerId: player.id,
          playerName: player.name,
          clubId: club.id,
          clubName: club.name,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          notes: orderData.notes,
          tableNumber: orderData.tableNumber,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
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

      // Query F&B menu from database
      let query = `
        SELECT 
          id, 
          name, 
          description,
          category,
          price,
          is_available as "isAvailable",
          image_url as "imageUrl"
        FROM fnb_menu 
        WHERE club_id = $1 AND is_available = true
      `;
      const params: any[] = [clubId];

      if (category) {
        query += ` AND LOWER(category) = LOWER($2)`;
        params.push(category);
      }

      query += ` ORDER BY category ASC, name ASC`;

      const menuItems = await this.playersRepo.query(query, params);

      return {
        menuItems: menuItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          price: parseFloat(item.price),
          isAvailable: item.isAvailable,
          imageUrl: item.imageUrl,
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
}



