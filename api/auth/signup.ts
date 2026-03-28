import {registerUser} from '../../src/server/auth-store.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({error: 'Method not allowed.'});
    return;
  }

  try {
    const user = await registerUser(req.body);
    res.status(201).json({user});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account.';
    res.status(400).json({error: message});
  }
}
