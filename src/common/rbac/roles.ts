export enum GlobalRole {
  MASTER_ADMIN = 'MASTER_ADMIN'
}

export enum TenantRole {
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum ClubRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  HR = 'HR',
  STAFF = 'STAFF',
  AFFILIATE = 'AFFILIATE',
  CASHIER = 'CASHIER',
  GRE = 'GRE',
  FNB = 'FNB'
}

export type AnyRole = GlobalRole | TenantRole | ClubRole;



