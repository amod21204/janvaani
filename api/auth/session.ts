import {getUserFromSession} from '../../src/server/auth-store.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({error: 'Method not allowed.'});
    return;
  }

  const authorization = req.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const user = token ? await getUserFromSession(token) : null;

  if (!user) {
    res.status(401).json({error: 'Session not found.'});
    return;
  }

  res.status(200).json({user});
}
