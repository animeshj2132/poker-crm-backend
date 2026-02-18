import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { AnyRole, ClubRole, GlobalRole, TenantRole } from './roles';

export interface RequestUser {
  id: string;
  globalRoles: GlobalRole[];
  tenantRoles: { tenantId: string; roles: TenantRole[] }[];
  clubRoles: { clubId: string; roles: ClubRole[] }[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AnyRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) throw new UnauthorizedException('Missing authenticated user');

    // Extract IDs once for reuse
    const clubId = request.headers['x-club-id'] as string | undefined
      || request.params?.clubId || request.params?.id;
    const tenantId = request.headers['x-tenant-id'] as string | undefined;

    const hasRole = requiredRoles.some((role) => {
      // Check GlobalRole
      if (Object.values(GlobalRole).includes(role as GlobalRole)) {
        if (user.globalRoles?.includes(role as GlobalRole)) return true;
      }
      // Check TenantRole
      if (Object.values(TenantRole).includes(role as TenantRole)) {
        if (tenantId) {
          const entry = user.tenantRoles?.find((r) => r.tenantId === tenantId);
          if (entry?.roles?.includes(role as TenantRole)) return true;
        }
      }
      // Check ClubRole (also handles SUPER_ADMIN which exists in both enums)
      if (Object.values(ClubRole).includes(role as ClubRole)) {
        if (clubId) {
          const entry = user.clubRoles?.find((r) => r.clubId === clubId);
          if (entry?.roles?.includes(role as ClubRole)) return true;
        }
      }
      return false;
    });

    if (!hasRole) throw new ForbiddenException('Insufficient role');
    return true;
  }
}



