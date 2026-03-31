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

    // Enforce JWT claims as source of truth for legacy identity headers.
    // Never trust client-supplied x-*-id headers when a bearer token is present.
    if (payload.type === 'staff') {
      req.headers['x-user-id'] = payload.sub;
      if (payload.clubId) req.headers['x-club-id'] = payload.clubId;
      else delete req.headers['x-club-id'];
      if (payload.tenantId) req.headers['x-tenant-id'] = payload.tenantId;
      else delete req.headers['x-tenant-id'];
      delete req.headers['x-player-id'];
    } else {
      req.headers['x-player-id'] = payload.sub;
      if (payload.clubId) req.headers['x-club-id'] = payload.clubId;
      else delete req.headers['x-club-id'];
      delete req.headers['x-user-id'];
      delete req.headers['x-tenant-id'];
    }
  } catch {
    // Guard is responsible for rejecting invalid JWTs on protected routes.
  }

  next();
}
