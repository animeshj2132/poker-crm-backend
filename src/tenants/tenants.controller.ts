import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { RolesGuard } from '../common/rbac/roles.guard';
import { GlobalRole, TenantRole } from '../common/rbac/roles';
import { Roles } from '../common/rbac/roles.decorator';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { SetupTenantDto } from './dto/setup-tenant.dto';
import { CreateClubWithBrandingDto } from '../clubs/dto/create-club-with-branding.dto';
import { StorageService } from '../storage/storage.service';
import { ClubsService } from '../clubs/clubs.service';
import { UsersService } from '../users/users.service';

@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly storageService: StorageService,
    private readonly clubsService: ClubsService,
    private readonly usersService: UsersService
  ) {}

  @Get()
  @Roles(GlobalRole.MASTER_ADMIN)
  async list() {
    try {
      return await this.tenantsService.findAll();
    } catch (e) {
      console.error('Error in tenants.list():', e);
      throw e;
    }
  }

  @Post()
  @Roles(GlobalRole.MASTER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Body() dto: CreateTenantDto) {
    try {
      if (!dto.name || !dto.name.trim()) {
        throw new BadRequestException('Tenant name is required');
      }
      return this.tenantsService.create(dto.name);
    } catch (e) {
      throw e;
    }
  }

  @Patch(':id/branding')
  @Roles(GlobalRole.MASTER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  updateBranding(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBrandingDto
  ) {
    try {
      return this.tenantsService.updateBranding(id, dto);
    } catch (e) {
      throw e;
    }
  }

  @Post(':id/branding/logo-upload-url')
  @Roles(GlobalRole.MASTER_ADMIN)
  async createLogoUploadUrl(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const path = `tenants/${id}/logo.png`;
      return await this.storageService.createSignedUploadUrl(path);
    } catch (e) {
      throw new BadRequestException('Failed to create signed upload URL');
    }
  }

  // Master Admin: Create a club with branding under a tenant
  @Post(':id/clubs')
  @Roles(GlobalRole.MASTER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createClubWithBranding(
    @Param('id', new ParseUUIDPipe()) tenantId: string,
    @Body() dto: CreateClubWithBrandingDto
  ) {
    try {
      if (!dto.name || !dto.name.trim()) {
        throw new BadRequestException('Club name is required');
      }
      if (!dto.superAdminEmail || !dto.superAdminEmail.trim()) {
        throw new BadRequestException('Super Admin email is required');
      }

      // Ensure storage bucket exists (for logo/video uploads)
      await this.storageService.ensureBucket();

      const club = await this.clubsService.createWithBranding(tenantId, {
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        videoUrl: dto.videoUrl,
        skinColor: dto.skinColor,
        gradient: dto.gradient
      });
      return club;
    } catch (e) {
      throw e;
    }
  }

  // Master Admin or Super Admin: Create Super Admin and assign to tenant
  @Post(':id/super-admins')
  @Roles(GlobalRole.MASTER_ADMIN, TenantRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createSuperAdmin(
    @Headers('x-tenant-id') headerTenantId: string | undefined,
    @Param('id', new ParseUUIDPipe()) tenantId: string,
    @Body() dto: CreateSuperAdminDto
  ) {
    try {
      if (!dto.email || !dto.email.trim()) {
        throw new BadRequestException('Email is required');
      }

      // If Super Admin is calling, validate they can only create for their own tenant
      if (headerTenantId) {
        if (headerTenantId !== tenantId) {
          throw new BadRequestException('Tenant ID mismatch. Super Admin can only create Super Admins for their own tenant.');
        }
      }

      const result = await this.usersService.createSuperAdmin(
        dto.email,
        dto.displayName || null,
        tenantId
      );

      return {
        message: result.isExistingUser 
          ? 'Super Admin already exists and has been assigned to this tenant'
          : 'Super Admin created successfully',
        user: result.user,
        tempPassword: result.tempPassword, // Auto-generated strong password (null if existing user)
        tenantId: result.tenantId,
        isExistingUser: result.isExistingUser || false
      };
    } catch (e) {
      throw e;
    }
  }

  // Master Admin: Setup tenant with club and super admin in one go (CMS-style)
  @Post(':id/setup')
  @Roles(GlobalRole.MASTER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async setupTenant(
    @Param('id', new ParseUUIDPipe()) tenantId: string,
    @Body() dto: SetupTenantDto
  ) {
    try {
      // Ensure storage bucket exists (for logo/video uploads)
      await this.storageService.ensureBucket();

      // Create club with branding (logo, video, colors, gradient)
      const club = await this.clubsService.createWithBranding(tenantId, {
        name: dto.clubName,
        description: dto.clubDescription,
        logoUrl: dto.logoUrl,
        videoUrl: dto.videoUrl,
        skinColor: dto.skinColor,
        gradient: dto.gradient
      });

      // Create Super Admin user (password auto-generated) and assign to tenant
      const superAdminResult = await this.usersService.createSuperAdmin(
        dto.superAdminEmail,
        dto.superAdminDisplayName || null,
        tenantId
      );

      return {
        message: 'Tenant setup completed successfully',
        tenant: { id: tenantId },
        club: {
          id: club.id,
          name: club.name,
          description: club.description,
          logoUrl: club.logoUrl,
          videoUrl: club.videoUrl,
          skinColor: club.skinColor,
          gradient: club.gradient
        },
        superAdmin: {
          user: superAdminResult.user,
          tempPassword: superAdminResult.tempPassword, // null if existing user
          email: superAdminResult.user.email,
          isExistingUser: superAdminResult.isExistingUser || false
        }
      };
    } catch (e) {
      throw e;
    }
  }

  // Master Admin: Get club logo upload URL
  @Post(':tenantId/clubs/:clubId/logo-upload-url')
  @Roles(GlobalRole.MASTER_ADMIN)
  async createClubLogoUploadUrl(
    @Param('tenantId', new ParseUUIDPipe()) tenantId: string,
    @Param('clubId', new ParseUUIDPipe()) clubId: string
  ) {
    try {
      await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
      const path = `tenants/${tenantId}/clubs/${clubId}/logo.png`;
      return await this.storageService.createSignedUploadUrl(path);
    } catch (e) {
      throw new BadRequestException('Failed to create signed upload URL');
    }
  }

}

