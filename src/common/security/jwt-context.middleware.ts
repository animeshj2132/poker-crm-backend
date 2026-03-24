import { NextFunction, Request, Response } from 'express';
import { verifyAppJwt } from './jwt';

type MutableRequest = Request & { auth?: { sub: string; type: 'staff' | 'player'; clubId?: string; tenantId?: string } };

export function jwtContextMiddleware(req: MutableRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAppJwt(token);
    req.auth = payload;

    // Hydrate legacy headers from JWT so existing controllers keep working.
    if (payload.type === 'staff') {
      req.headers['x-user-id'] = req.headers['x-user-id'] || payload.sub;
      if (payload.clubId) req.headers['x-club-id'] = req.headers['x-club-id'] || payload.clubId;
      if (payload.tenantId) req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || payload.tenantId;
    } else {
      req.headers['x-player-id'] = req.headers['x-player-id'] || payload.sub;
      if (payload.clubId) req.headers['x-club-id'] = req.headers['x-club-id'] || payload.clubId;
    }
  } catch {
    // Guard is responsible for rejecting invalid JWTs on protected routes.
  }

  next();
}
