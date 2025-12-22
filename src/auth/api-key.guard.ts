import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserTenantRole } from '../users/user-tenant-role.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRole, ClubRole } from '../common/rbac/roles';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    @InjectRepository(UserTenantRole) private readonly userTenantRoleRepo: Repository<UserTenantRole>,
    @InjectRepository(UserClubRole) private readonly userClubRoleRepo: Repository<UserClubRole>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    
    // Try API key authentication first (for Master Admin)
    const apiKey: string | undefined = req.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      const user = await this.authService.validateApiKey(apiKey);
      if (user) {
        req.user = user;
        return true;
      }
    }

    // Try user ID authentication (for Super Admin and other users)
    const userId: string | undefined = req.headers['x-user-id'] as string | undefined;
    if (userId) {
      const user = await this.usersService.findById(userId);
      if (user) {
        // Get tenant roles
        const tenantRoles = await this.userTenantRoleRepo.find({
          where: { user: { id: userId } },
          relations: ['tenant']
        });

        // Get club roles
        const clubRoles = await this.userClubRoleRepo.find({
          where: { user: { id: userId } },
          relations: ['club']
        });

        req.user = {
          id: user.id,
          globalRoles: user.isMasterAdmin ? ['MASTER_ADMIN'] : [],
          tenantRoles: tenantRoles.map(tr => ({
            tenantId: tr.tenant.id,
            roles: [tr.role]
          })),
          clubRoles: clubRoles.map(cr => ({
            clubId: cr.club.id,
            roles: [cr.role]
          }))
        };
        return true;
      }
    }

    // If neither authentication method worked, don't set user
    // RolesGuard will handle authorization
    return true;
  }
}



