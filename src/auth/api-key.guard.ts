import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserTenantRole } from '../users/user-tenant-role.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { Club } from '../clubs/club.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRole, ClubRole } from '../common/rbac/roles';
import { verifyAppJwt } from '../common/security/jwt';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly publicRoutes: Array<{ method: string; path: RegExp }> = [
    { method: 'GET', path: /^\/api\/health$/ },
    { method: 'POST', path: /^\/api\/auth\/login$/ },
    { method: 'POST', path: /^\/api\/auth\/player\/login$/ },
    { method: 'POST', path: /^\/api\/auth\/player\/signup$/ },
    { method: 'POST', path: /^\/api\/auth\/reset-password$/ },
    { method: 'POST', path: /^\/api\/auth\/player\/reset-password$/ },
    // Public pre-auth club discovery endpoints used by player login flow.
    { method: 'POST', path: /^\/api\/clubs\/verify-code$/ },
    { method: 'GET', path: /^\/api\/clubs\/[0-9a-fA-F-]{36}\/branding$/ },
  ];

  private isPublicRoute(method: string, path: string): boolean {
    return this.publicRoutes.some((route) => route.method === method && route.path.test(path));
  }

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(UserTenantRole) private readonly userTenantRoleRepo: Repository<UserTenantRole>,
    @InjectRepository(UserClubRole) private readonly userClubRoleRepo: Repository<UserClubRole>,
    @InjectRepository(Club) private readonly clubRepo: Repository<Club>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const method = String(req.method || 'GET').toUpperCase();
    const path = String(req.path || req.originalUrl || '');

    if (this.isPublicRoute(method, path)) {
      return true;
    }

    const authHeader: string | undefined = req.headers['authorization'] as string | undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    let jwtPayload: { sub: string; type: 'staff' | 'player'; clubId?: string; tenantId?: string };
    try {
      jwtPayload = verifyAppJwt(token);
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }

    const userId = jwtPayload.sub;

    if (jwtPayload.type === 'staff') {
      // Enforce JWT claims as canonical identity for downstream legacy header consumers.
      req.headers['x-user-id'] = jwtPayload.sub;
      if (jwtPayload.clubId) req.headers['x-club-id'] = jwtPayload.clubId;
      else delete req.headers['x-club-id'];
      if (jwtPayload.tenantId) req.headers['x-tenant-id'] = jwtPayload.tenantId;
      else delete req.headers['x-tenant-id'];
      delete req.headers['x-player-id'];

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found for bearer token');
      }

      const tenantRoles = await this.userTenantRoleRepo.find({
        where: { user: { id: userId } },
        relations: ['tenant']
      });

      const clubRoles = await this.userClubRoleRepo.find({
        where: { user: { id: userId } },
        relations: ['club']
      });

      const mappedClubRoles = clubRoles.map(cr => ({
        clubId: cr.club.id,
        roles: [cr.role]
      }));

      const superAdminTenantIds = tenantRoles
        .filter(tr => tr.role === TenantRole.SUPER_ADMIN)
        .map(tr => tr.tenant.id);

      if (superAdminTenantIds.length > 0) {
        const tenantClubs = await this.clubRepo.find({
          where: superAdminTenantIds.map(tid => ({ tenant: { id: tid } })),
          relations: ['tenant']
        });

        for (const club of tenantClubs) {
          const existing = mappedClubRoles.find(cr => cr.clubId === club.id);
          if (existing) {
            if (!existing.roles.includes(ClubRole.SUPER_ADMIN)) {
              existing.roles.push(ClubRole.SUPER_ADMIN);
            }
          } else {
            mappedClubRoles.push({ clubId: club.id, roles: [ClubRole.SUPER_ADMIN] });
          }
        }
      }

      req.user = {
        id: userId,
        globalRoles: user.isMasterAdmin ? ['MASTER_ADMIN'] : [],
        tenantRoles: tenantRoles.map(tr => ({
          tenantId: tr.tenant.id,
          roles: [tr.role]
        })),
        clubRoles: mappedClubRoles
      };
      return true;
    }

    // Player token: auth context (legacy headers are hydrated in middleware).
    req.headers['x-player-id'] = jwtPayload.sub;
    if (jwtPayload.clubId) req.headers['x-club-id'] = jwtPayload.clubId;
    else delete req.headers['x-club-id'];
    delete req.headers['x-user-id'];
    delete req.headers['x-tenant-id'];

    req.user = {
      id: userId,
      globalRoles: [],
      tenantRoles: [],
      clubRoles: jwtPayload.clubId ? [{ clubId: jwtPayload.clubId, roles: [] }] : []
    };
    return true;
  }
}



