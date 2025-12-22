import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Affiliate } from '../entities/affiliate.entity';
import { Player } from '../entities/player.entity';
import { User } from '../../users/user.entity';
import { Club } from '../club.entity';
import { UsersService } from '../../users/users.service';
import { ClubRole } from '../../common/rbac/roles';

@Injectable()
export class AffiliatesService {
  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliatesRepo: Repository<Affiliate>,
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Club)
    private readonly clubsRepo: Repository<Club>,
    private readonly usersService: UsersService
  ) {}

  /**
   * Generate a unique affiliate code
   */
  private generateAffiliateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Create a new affiliate
   */
  async createAffiliate(
    clubId: string,
    email: string,
    displayName?: string,
    customCode?: string,
    commissionRate: number = 5.0
  ): Promise<Affiliate> {
    // Edge case: Validate inputs
    if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
      throw new BadRequestException('Club ID is required');
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clubId.trim())) {
      throw new BadRequestException('Invalid club ID format');
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    if (email.trim().length > 200) {
      throw new BadRequestException('Email cannot exceed 200 characters');
    }

    if (displayName !== undefined && displayName !== null) {
      if (typeof displayName !== 'string') {
        throw new BadRequestException('Display name must be a string');
      }
      if (displayName.trim().length > 200) {
        throw new BadRequestException('Display name cannot exceed 200 characters');
      }
    }

    if (customCode !== undefined && customCode !== null) {
      if (typeof customCode !== 'string') {
        throw new BadRequestException('Custom code must be a string');
      }
      if (customCode.trim().length < 3 || customCode.trim().length > 20) {
        throw new BadRequestException('Custom code must be between 3 and 20 characters');
      }
    }

    if (typeof commissionRate !== 'number' || isNaN(commissionRate)) {
      throw new BadRequestException('Commission rate must be a valid number');
    }
    if (commissionRate < 0 || commissionRate > 100) {
      throw new BadRequestException('Commission rate must be between 0 and 100');
    }

    // Validate club exists
    const club = await this.clubsRepo.findOne({ where: { id: clubId.trim() } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Find or create user
    let user = await this.usersService.findByEmail(email);
    if (!user) {
      // Create new user
      const tempPassword = this.generateTempPassword();
      const saltRounds = 12;
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

      user = this.usersRepo.create({
        email,
        displayName: displayName || null,
        passwordHash
      });
      user = await this.usersRepo.save(user);
    }

    // Check if user already has affiliate role for this club
    const existingAffiliate = await this.affiliatesRepo.findOne({
      where: { club: { id: clubId }, user: { id: user.id } }
    });
    if (existingAffiliate) {
      throw new ConflictException('User is already an affiliate for this club');
    }

    // Generate or use custom code
    let code = customCode?.toUpperCase().trim();
    if (!code) {
      code = this.generateAffiliateCode();
    }

    // Check if code already exists
    const existingCode = await this.affiliatesRepo.findOne({
      where: { code }
    });
    if (existingCode) {
      if (customCode) {
        throw new ConflictException('Affiliate code already exists');
      }
      // Regenerate if auto-generated code conflicts
      code = this.generateAffiliateCode();
      const checkAgain = await this.affiliatesRepo.findOne({ where: { code } });
      if (checkAgain) {
        code = this.generateAffiliateCode(); // One more try
      }
    }

    // Assign affiliate role to user
    await this.usersService.assignClubRole(user.id, clubId, ClubRole.AFFILIATE);

    // Create affiliate
    const affiliate = this.affiliatesRepo.create({
      club,
      user,
      code,
      name: displayName || user.displayName || null,
      commissionRate,
      status: 'Active'
    });

    return await this.affiliatesRepo.save(affiliate);
  }

  /**
   * Get affiliate by code
   */
  async findByCode(code: string): Promise<Affiliate | null> {
    // Edge case: Validate code
    if (!code || typeof code !== 'string' || !code.trim()) {
      return null;
    }
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 3 || trimmedCode.length > 20) {
      return null;
    }
    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
      return null;
    }

    return await this.affiliatesRepo.findOne({
      where: { code: trimmedCode },
      relations: ['club', 'user']
    });
  }

  /**
   * Get affiliate by user ID and club ID
   */
  async findByUserAndClub(userId: string, clubId: string): Promise<Affiliate | null> {
    // Edge case: Validate inputs
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new BadRequestException('User ID is required');
    }
    if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
      throw new BadRequestException('Club ID is required');
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId.trim())) {
      throw new BadRequestException('Invalid user ID format');
    }
    if (!uuidRegex.test(clubId.trim())) {
      throw new BadRequestException('Invalid club ID format');
    }

    return await this.affiliatesRepo.findOne({
      where: { user: { id: userId.trim() }, club: { id: clubId.trim() } },
      relations: ['club', 'user', 'players']
    });
  }

  /**
   * Get all affiliates for a club
   */
  async findByClub(clubId: string): Promise<Affiliate[]> {
    // Edge case: Validate club ID
    if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
      throw new BadRequestException('Club ID is required');
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clubId.trim())) {
      throw new BadRequestException('Invalid club ID format');
    }

    // Edge case: Verify club exists
    const club = await this.clubsRepo.findOne({ where: { id: clubId.trim() } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return await this.affiliatesRepo.find({
      where: { club: { id: clubId.trim() } },
      relations: ['user', 'players'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Create a player with optional affiliate code
   */
  async createPlayer(
    clubId: string,
    name: string,
    email: string,
    phoneNumber?: string,
    playerId?: string,
    affiliateCode?: string,
    notes?: string
  ): Promise<Player> {
    // Edge case: Validate inputs
    if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
      throw new BadRequestException('Club ID is required');
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clubId.trim())) {
      throw new BadRequestException('Invalid club ID format');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (name.trim().length < 2 || name.trim().length > 200) {
      throw new BadRequestException('Name must be between 2 and 200 characters');
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length > 200) {
      throw new BadRequestException('Email cannot exceed 200 characters');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    if (phoneNumber !== undefined && phoneNumber !== null) {
      if (typeof phoneNumber !== 'string') {
        throw new BadRequestException('Phone number must be a string');
      }
      if (phoneNumber.trim().length < 10 || phoneNumber.trim().length > 20) {
        throw new BadRequestException('Phone number must be between 10 and 20 characters');
      }
    }

    if (playerId !== undefined && playerId !== null) {
      if (typeof playerId !== 'string') {
        throw new BadRequestException('Player ID must be a string');
      }
      if (playerId.trim().length > 100) {
        throw new BadRequestException('Player ID cannot exceed 100 characters');
      }
    }

    if (affiliateCode !== undefined && affiliateCode !== null) {
      if (typeof affiliateCode !== 'string') {
        throw new BadRequestException('Affiliate code must be a string');
      }
      if (affiliateCode.trim().length < 3 || affiliateCode.trim().length > 20) {
        throw new BadRequestException('Affiliate code must be between 3 and 20 characters');
      }
    }

    if (notes !== undefined && notes !== null) {
      if (typeof notes !== 'string') {
        throw new BadRequestException('Notes must be a string');
      }
      if (notes.trim().length > 500) {
        throw new BadRequestException('Notes cannot exceed 500 characters');
      }
    }

    // Validate club exists
    const club = await this.clubsRepo.findOne({ where: { id: clubId.trim() } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if player already exists
    const existingPlayer = await this.playersRepo.findOne({
      where: { club: { id: clubId.trim() }, email: trimmedEmail }
    });
    if (existingPlayer) {
      throw new ConflictException('Player with this email already exists for this club');
    }

    // Find affiliate if code provided
    let affiliate: Affiliate | null = null;
    if (affiliateCode) {
      const trimmedCode = affiliateCode.trim().toUpperCase();
      affiliate = await this.findByCode(trimmedCode);
      if (!affiliate) {
        throw new NotFoundException('Invalid or expired affiliate code');
      }
      if (affiliate.club.id !== clubId.trim()) {
        throw new BadRequestException('Affiliate code does not belong to this club');
      }
      if (affiliate.status !== 'Active') {
        throw new BadRequestException('Affiliate is not active. Please contact support.');
      }
    }

    // Create player
    const player = this.playersRepo.create({
      club,
      affiliate,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber?.trim() || null,
      playerId: playerId?.trim() || null,
      status: 'Active',
      notes: notes?.trim() || null
    });

    const savedPlayer = await this.playersRepo.save(player);

    // Update affiliate stats if applicable
    if (affiliate) {
      affiliate.totalReferrals += 1;
      await this.affiliatesRepo.save(affiliate);
    }

    return savedPlayer;
  }

  /**
   * Get all players for an affiliate
   */
  async getAffiliatePlayers(affiliateId: string): Promise<Player[]> {
    // Edge case: Validate affiliate ID
    if (!affiliateId || typeof affiliateId !== 'string' || !affiliateId.trim()) {
      throw new BadRequestException('Affiliate ID is required');
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(affiliateId.trim())) {
      throw new BadRequestException('Invalid affiliate ID format');
    }

    // Edge case: Verify affiliate exists
    const affiliate = await this.affiliatesRepo.findOne({
      where: { id: affiliateId.trim() }
    });
    if (!affiliate) {
      throw new NotFoundException('Affiliate not found');
    }

    return await this.playersRepo.find({
      where: { affiliate: { id: affiliateId.trim() } },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(affiliateId: string) {
    // Edge case: Validate affiliate ID
    if (!affiliateId || typeof affiliateId !== 'string' || !affiliateId.trim()) {
      throw new BadRequestException('Affiliate ID is required');
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(affiliateId.trim())) {
      throw new BadRequestException('Invalid affiliate ID format');
    }

    const affiliate = await this.affiliatesRepo.findOne({
      where: { id: affiliateId.trim() },
      relations: ['players']
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate not found');
    }

    const players = affiliate.players || [];
    const activePlayers = players.filter(p => p.status === 'Active').length;
    const totalSpent = players.reduce((sum, p) => sum + Number(p.totalSpent || 0), 0);
    const totalCommission = players.reduce((sum, p) => sum + Number(p.totalCommission || 0), 0);

    return {
      affiliate: {
        id: affiliate.id,
        code: affiliate.code,
        name: affiliate.name,
        commissionRate: affiliate.commissionRate,
        status: affiliate.status
      },
      stats: {
        totalReferrals: affiliate.totalReferrals,
        activePlayers,
        totalPlayers: players.length,
        totalSpent,
        totalCommission,
        averageSpent: players.length > 0 ? totalSpent / players.length : 0
      },
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        totalSpent: p.totalSpent,
        totalCommission: p.totalCommission,
        status: p.status,
        createdAt: p.createdAt
      }))
    };
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%&*';
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

