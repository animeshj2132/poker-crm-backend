import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Roles } from '../common/rbac/roles.decorator';
import { GlobalRole, TenantRole, ClubRole } from '../common/rbac/roles';
import { RolesGuard } from '../common/rbac/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(GlobalRole.MASTER_ADMIN)
  async listUsers() {
    // Return users without password hash
    const users = await this.usersService.findAll();
    return users.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isMasterAdmin: user.isMasterAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
      // passwordHash is NEVER included
    }));
  }

  @Get(':id')
  @Roles(GlobalRole.MASTER_ADMIN, TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.STAFF, ClubRole.AFFILIATE, ClubRole.CASHIER, ClubRole.GRE)
  async getUser(@Param('id', new ParseUUIDPipe()) userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isMasterAdmin: user.isMasterAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
      // passwordHash is NEVER included
    };
  }

  // Get all tenants a Super Admin has access to
  @Get(':id/tenants')
  @Roles(GlobalRole.MASTER_ADMIN, TenantRole.SUPER_ADMIN)
  async getSuperAdminTenants(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.usersService.getSuperAdminTenants(userId);
  }

  // Get all clubs a Super Admin can access
  @Get(':id/clubs')
  @Roles(GlobalRole.MASTER_ADMIN, TenantRole.SUPER_ADMIN)
  async getSuperAdminClubs(
    @Param('id', new ParseUUIDPipe()) userId: string
  ) {
    return this.usersService.getSuperAdminClubs(userId);
  }

  // Get all clubs an Admin (or other club-scoped user) has access to
  @Get(':id/admin-clubs')
  @Roles(GlobalRole.MASTER_ADMIN, TenantRole.SUPER_ADMIN, ClubRole.ADMIN, ClubRole.MANAGER, ClubRole.HR, ClubRole.STAFF, ClubRole.AFFILIATE, ClubRole.CASHIER, ClubRole.GRE)
  async getAdminClubs(
    @Param('id', new ParseUUIDPipe()) userId: string
  ) {
    return this.usersService.getAdminClubs(userId);
  }
}



