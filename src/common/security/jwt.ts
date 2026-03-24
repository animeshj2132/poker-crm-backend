import * as jwt from 'jsonwebtoken';

type JwtSubjectType = 'staff' | 'player';

export interface AppJwtPayload {
  sub: string;
  type: JwtSubjectType;
  clubId?: string;
  tenantId?: string;
  email?: string;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'change-this-in-production';
}

export function signAppJwt(payload: AppJwtPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  });
}

export function verifyAppJwt(token: string): AppJwtPayload {
  return jwt.verify(token, getJwtSecret()) as AppJwtPayload;
}
