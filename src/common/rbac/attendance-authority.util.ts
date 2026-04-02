import { ClubRole, GlobalRole, TenantRole } from './roles';
import type { RequestUser } from './roles.guard';

/**
 * Who wins when multiple users mark the same staff/day:
 * 3 = global master / tenant SUPER_ADMIN, 2 = club SUPER_ADMIN, 1 = HR/ADMIN/MANAGER, 0 = other.
 */
export function getAttendanceMarkTier(
  user: RequestUser | undefined,
  clubId: string,
  tenantIdHeader?: string,
): number {
  if (!user) return 0;
  if (user.globalRoles?.includes(GlobalRole.MASTER_ADMIN)) return 3;
  const tid = tenantIdHeader?.trim();
  if (tid) {
    const te = user.tenantRoles?.find((x) => x.tenantId === tid);
    if (te?.roles?.includes(TenantRole.SUPER_ADMIN)) return 3;
  } else if (user.tenantRoles?.some((t) => t.roles?.includes(TenantRole.SUPER_ADMIN))) {
    // CRM clients sometimes omit x-tenant-id; tenant SUPER_ADMIN still outranks club roles
    return 3;
  }
  const cid = clubId?.trim();
  if (!cid) return 0;
  const c = user.clubRoles?.find((r) => r.clubId === cid);
  if (!c?.roles?.length) return 0;
  if (c.roles.includes(ClubRole.SUPER_ADMIN)) return 2;
  if (c.roles.some((r) => [ClubRole.HR, ClubRole.ADMIN, ClubRole.MANAGER].includes(r))) return 1;
  return 0;
}

export function canOverrideAttendance(existingTier: number, newTier: number): boolean {
  if (existingTier <= 0) return newTier >= 1;
  return newTier >= existingTier;
}
