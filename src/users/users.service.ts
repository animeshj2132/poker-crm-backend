import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UserClubRole } from './user-club-role.entity';
import { UserTenantRole } from './user-tenant-role.entity';
import { Club } from '../clubs/club.entity';
import { ClubRole, TenantRole } from '../common/rbac/roles';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserClubRole) private readonly userClubRoleRepo: Repository<UserClubRole>,
    @InjectRepository(UserTenantRole) private readonly userTenantRoleRepo: Repository<UserTenantRole>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>
  ) {}

  async findByEmail(email: string, includePassword = false) {
    if (includePassword) {
      // When password is needed (for login), explicitly select it
      return this.usersRepo.findOne({ 
        where: { email },
        select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'passwordHash', 'createdAt', 'updatedAt']
      });
    }
    // Default: exclude password hash for security
    return this.usersRepo.findOne({ 
      where: { email },
      select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'createdAt', 'updatedAt']
    });
  }

  /**
   * Verify password against stored hash
   * Use this for login authentication
   */
  async verifyPassword(email: string, plainPassword: string): Promise<boolean> {
    const user = await this.findByEmail(email, true); // Include password hash for verification
    if (!user || !user.passwordHash) return false;
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await this.usersRepo.update(userId, { 
      passwordHash,
      mustResetPassword: false // Clear the reset flag after password change
    });
  }

  /**
   * Reset password (for first login or password reset)
   */
  async resetPassword(email: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; mustResetPassword: boolean }> {
    // Validate inputs
    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    if (!currentPassword || !currentPassword.trim()) {
      throw new BadRequestException('Current password is required');
    }
    if (!newPassword || !newPassword.trim()) {
      throw new BadRequestException('New password is required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }
    if (newPassword.length > 120) {
      throw new BadRequestException('New password cannot exceed 120 characters');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const user = await this.findByEmail(email.trim(), true); // Include password hash
    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ConflictException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password and clear reset flag
    await this.usersRepo.update(user.id, {
      passwordHash,
      mustResetPassword: false
    });

    return {
      success: true,
      mustResetPassword: false
    };
  }

  async createUser(email: string, displayName: string | null, password?: string) {
    // Validate email
    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new BadRequestException('Invalid email format');
    }

    const existing = await this.findByEmail(email.trim());
    if (existing) throw new ConflictException('User with this email already exists');
    
    // Validate password if provided
    if (password) {
      if (password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }
      if (password.length > 120) {
        throw new BadRequestException('Password cannot exceed 120 characters');
      }
    }
    
    let passwordHash: string | null = null;
    if (password) {
      // Hash password if provided
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }
    
    const user = this.usersRepo.create({
      email: email.trim(),
      displayName: displayName?.trim() || null,
      passwordHash,
      isMasterAdmin: false
    });
    return this.usersRepo.save(user);
  }

  async assignClubRole(userId: string, clubId: string, role: ClubRole) {
    // Validate inputs
    if (!userId) throw new BadRequestException('User ID is required');
    if (!clubId) throw new BadRequestException('Club ID is required');
    if (!Object.values(ClubRole).includes(role)) {
      throw new BadRequestException('Invalid club role');
    }

    // Validate user exists
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Validate club exists
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const existing = await this.userClubRoleRepo.findOne({
      where: { user: { id: userId }, club: { id: clubId }, role }
    });
    if (existing) throw new ConflictException('User already has this role for this club');
    
    const userClubRole = this.userClubRoleRepo.create({
      user: { id: userId } as User,
      club: { id: clubId } as any,
      role
    });
    return this.userClubRoleRepo.save(userClubRole);
  }

  async removeClubRole(userId: string, clubId: string, role: ClubRole) {
    // Validate inputs
    if (!userId) throw new BadRequestException('User ID is required');
    if (!clubId) throw new BadRequestException('Club ID is required');
    if (!Object.values(ClubRole).includes(role)) {
      throw new BadRequestException('Invalid club role');
    }

    const roleRecord = await this.userClubRoleRepo.findOne({
      where: { user: { id: userId }, club: { id: clubId }, role }
    });
    if (!roleRecord) throw new NotFoundException('Role assignment not found');
    await this.userClubRoleRepo.remove(roleRecord);
  }

  async findById(id: string, includePassword = false) {
    if (includePassword) {
      return this.usersRepo.findOne({ 
        where: { id },
        select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'passwordHash', 'createdAt', 'updatedAt']
      });
    }
    return this.usersRepo.findOne({ 
      where: { id },
      select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'createdAt', 'updatedAt']
    });
  }

  async findAll() {
    return this.usersRepo.find({
      select: ['id', 'email', 'displayName', 'isMasterAdmin', 'createdAt', 'updatedAt']
    });
  }

  /**
   * Generate a strong random password
   * Format: 12 characters with uppercase, lowercase, numbers, and special chars
   */
  private generateStrongPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%&*';
    
    // Ensure at least one of each type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining 8 characters randomly
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if a user has Super Admin role for any tenant
   */
  async checkSuperAdminRole(userId: string): Promise<boolean> {
    const role = await this.userTenantRoleRepo.findOne({
      where: { user: { id: userId }, role: TenantRole.SUPER_ADMIN }
    });
    return !!role;
  }

  /**
   * Get Super Admin user for a tenant
   */
  async getSuperAdminForTenant(tenantId: string) {
    const tenantRole = await this.userTenantRoleRepo.findOne({
      where: { tenant: { id: tenantId }, role: TenantRole.SUPER_ADMIN },
      relations: ['user']
    });
    return tenantRole?.user || null;
  }

  async createSuperAdmin(
    email: string,
    displayName: string | null,
    tenantId: string
  ) {
    // Validate email
    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate tenant exists
    const tenant = await this.clubsRepo.manager.getRepository('tenants').findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user already exists
    let user = await this.findByEmail(email.trim());
    let isNewUser = false;
    let tempPassword: string | null = null;

    if (user) {
      // User exists - check if they already have Super Admin role for this tenant
      const existingRole = await this.userTenantRoleRepo.findOne({
        where: { user: { id: user.id }, tenant: { id: tenantId }, role: TenantRole.SUPER_ADMIN }
      });
      if (existingRole) {
        // User already has access to this tenant - just return success (no password needed)
        // Password hash is NEVER returned - user uses their existing password
        return {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName
            // passwordHash is NEVER included
          },
          tempPassword: null, // No new password - user already exists with hashed password
          tenantId,
          isExistingUser: true
        };
      }
      // User exists but doesn't have access to this tenant - assign them
      // Update display name if provided and different
      if (displayName && user.displayName !== displayName) {
        user.displayName = displayName;
        await this.usersRepo.save(user);
      }
      // User already has a password hash - no need to generate new one
    } else {
      // Create new user
      isNewUser = true;
      // Generate strong password
      tempPassword = this.generateStrongPassword();
      // Hash the password before storing
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
      
      user = this.usersRepo.create({
        email,
        displayName,
        passwordHash,
        mustResetPassword: true, // Force password reset on first login
        isMasterAdmin: false
      });
      user = await this.usersRepo.save(user);
    }

    // Assign Super Admin role to tenant (this ensures tenant isolation)
    const userTenantRole = this.userTenantRoleRepo.create({
      user,
      tenant: { id: tenantId } as any,
      role: TenantRole.SUPER_ADMIN
    });
    await this.userTenantRoleRepo.save(userTenantRole);

    // Return user data WITHOUT password hash
    // Password is only returned during creation (tempPassword) and never stored in plain text
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
        // passwordHash is NEVER returned
      },
      tempPassword, // Only set for new users - this is the ONLY time password is visible
      tenantId,
      isExistingUser: !isNewUser
    };
  }

  async assignTenantRole(userId: string, tenantId: string, role: TenantRole) {
    const existing = await this.userTenantRoleRepo.findOne({
      where: { user: { id: userId }, tenant: { id: tenantId }, role }
    });
    if (existing) throw new ConflictException('User already has this role for this tenant');
    const userTenantRole = this.userTenantRoleRepo.create({
      user: { id: userId } as User,
      tenant: { id: tenantId } as any,
      role
    });
    return this.userTenantRoleRepo.save(userTenantRole);
  }

  async removeTenantRole(userId: string, tenantId: string, role: TenantRole) {
    const roleRecord = await this.userTenantRoleRepo.findOne({
      where: { user: { id: userId }, tenant: { id: tenantId }, role }
    });
    if (!roleRecord) throw new NotFoundException('Role assignment not found');
    await this.userTenantRoleRepo.remove(roleRecord);
  }

  /**
   * Get all tenants a user has Super Admin access to
   */
  async getSuperAdminTenants(userId: string) {
    const roles = await this.userTenantRoleRepo.find({
      where: { user: { id: userId }, role: TenantRole.SUPER_ADMIN },
      relations: ['tenant']
    });
    return roles.map((r) => ({
      tenantId: r.tenant.id,
      tenantName: r.tenant.name,
      roleId: r.id
    }));
  }

  /**
   * Create or assign a club-scoped user
   * Key constraint: A user can only belong to ONE club
   * A user can have multiple roles within the same club
   */
  async createClubUser(
    email: string,
    displayName: string | null,
    clubId: string,
    role: ClubRole
  ) {
    // Validate email
    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate role
    if (!Object.values(ClubRole).includes(role)) {
      throw new BadRequestException('Invalid club role');
    }

    // Validate club exists
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user already exists
    let user = await this.findByEmail(email.trim());
    let isNewUser = false;
    let tempPassword: string | null = null;

    if (user) {
      // Check if user already has roles in a different club
      const existingClubRoles = await this.userClubRoleRepo.find({
        where: { user: { id: user.id } },
        relations: ['club']
      });

      // If user has roles in a different club, reject
      if (existingClubRoles.length > 0) {
        const userClubId = existingClubRoles[0].club.id;
        if (userClubId !== clubId) {
          throw new ConflictException(
            `User ${email} already belongs to another club. A user can only belong to one club.`
          );
        }
        // User already belongs to this club - check if they already have this role
        const existingRole = existingClubRoles.find(r => r.role === role);
        if (existingRole) {
          return {
            user: { id: user.id, email: user.email, displayName: user.displayName },
            tempPassword: null,
            clubId,
            role,
            isExistingUser: true,
            roleAlreadyAssigned: true
          };
        }
        // User belongs to same club but doesn't have this role - we'll add it below
      }

      // Update display name if provided and different
      if (displayName && user.displayName !== displayName) {
        user.displayName = displayName;
        await this.usersRepo.save(user);
      }
    } else {
      // Create new user
      isNewUser = true;
      tempPassword = this.generateStrongPassword();
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
      
      user = this.usersRepo.create({
        email,
        displayName,
        passwordHash,
        mustResetPassword: true, // Force password reset on first login
        isMasterAdmin: false
      });
      user = await this.usersRepo.save(user);
    }

    // Assign club role
    const existingRole = await this.userClubRoleRepo.findOne({
      where: { user: { id: user.id }, club: { id: clubId }, role }
    });

    if (!existingRole) {
      const userClubRole = this.userClubRoleRepo.create({
        user,
        club: { id: clubId } as any,
        role
      });
      await this.userClubRoleRepo.save(userClubRole);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      tempPassword, // Only set for new users
      clubId,
      role,
      isExistingUser: !isNewUser,
      roleAlreadyAssigned: !!existingRole
    };
  }

  /**
   * Get all clubs a Super Admin can access (through their tenant access)
   */
  async getSuperAdminClubs(userId: string, tenantId?: string) {
    // Get all tenants user has access to
    const tenantRoles = await this.userTenantRoleRepo.find({
      where: tenantId
        ? { user: { id: userId }, tenant: { id: tenantId }, role: TenantRole.SUPER_ADMIN }
        : { user: { id: userId }, role: TenantRole.SUPER_ADMIN },
      relations: ['tenant']
    });

    // Get clubs for each tenant (using ClubsService would be better, but for now we'll query directly)
    const clubs: Array<{ clubId: string; clubName: string; tenantId: string; tenantName: string; description?: string; logoUrl?: string; code?: string; rummyEnabled?: boolean }> = [];
    
    for (const role of tenantRoles) {
      const tenant = role.tenant as any;
      // Query clubs for this tenant
      const tenantClubs = await this.clubsRepo.find({
        where: { tenant: { id: tenant.id } },
        relations: ['tenant']
      });
      
      for (const club of tenantClubs) {
        clubs.push({
          clubId: club.id,
          clubName: club.name,
          tenantId: tenant.id,
          tenantName: tenant.name,
          description: club.description || undefined,
          logoUrl: club.logoUrl || undefined,
          code: club.code || undefined, // Include club code
          rummyEnabled: club.rummyEnabled || false // Include rummy enabled status
        });
      }
    }
    return clubs;
  }

  /**
   * Get all clubs a user has club-scoped roles in (Admin, Manager, HR, etc.)
   * Note: A user can only belong to ONE club, but can have multiple roles in that club
   */
  async getAdminClubs(userId: string) {
    const roles = await this.userClubRoleRepo.find({
      where: { user: { id: userId } },
      relations: ['club', 'club.tenant']
    });

    // Group by club (should only be one club per user, but handle multiple just in case)
    const clubMap = new Map<string, {
      clubId: string;
      clubName: string;
      tenantId: string;
      tenantName: string;
      description?: string;
      logoUrl?: string;
      roles: ClubRole[];
    }>();

    for (const role of roles) {
      const club = role.club as any;
      const clubId = club.id;
      
      if (!clubMap.has(clubId)) {
        clubMap.set(clubId, {
          clubId: club.id,
          clubName: club.name,
          tenantId: club.tenant?.id || '',
          tenantName: club.tenant?.name || '',
          description: club.description || undefined,
          logoUrl: club.logoUrl || undefined,
          roles: []
        });
      }
      
      clubMap.get(clubId)!.roles.push(role.role);
    }

    return Array.from(clubMap.values());
  }
}



