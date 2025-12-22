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

    const hasRole = requiredRoles.some((role) => {
      if (Object.values(GlobalRole).includes(role as GlobalRole)) {
        return user.globalRoles?.includes(role as GlobalRole);
      }
      if (Object.values(TenantRole).includes(role as TenantRole)) {
        const tenantId = request.headers['x-tenant-id'] as string | undefined;
        if (!tenantId) return false;
        const entry = user.tenantRoles?.find((r) => r.tenantId === tenantId);
        return entry?.roles?.includes(role as TenantRole) ?? false;
      }
      if (Object.values(ClubRole).includes(role as ClubRole)) {
        const clubId = request.headers['x-club-id'] as string | undefined;
        if (!clubId) return false;
        const entry = user.clubRoles?.find((r) => r.clubId === clubId);
        return entry?.roles?.includes(role as ClubRole) ?? false;
      }
      return false;
    });

    if (!hasRole) throw new ForbiddenException('Insufficient role');
    return true;
  }
}



