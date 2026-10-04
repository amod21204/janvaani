import type {NextFunction, Request, Response} from 'express';

import {getUserFromSession, type PublicUser} from '../server/auth-store.ts';

export interface AuthenticatedLocals {
  currentUser: PublicUser;
}

export async function requireAuth(req: Request, res: Response<unknown, Partial<AuthenticatedLocals>>, next: NextFunction) {
  const authorization = req.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) {
    res.status(401).json({error: 'Authentication required.'});
    return;
  }

  const user = await getUserFromSession(token);
  if (!user) {
    res.status(401).json({error: 'Session not found.'});
    return;
  }

  res.locals.currentUser = user;
  next();
}
