import {verifyOtpChallenge} from '../../src/server/auth-store.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({error: 'Method not allowed.'});
    return;
  }

  try {
    const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
    const otp = typeof req.body?.otp === 'string' ? req.body.otp : '';
    const session = await verifyOtpChallenge(challengeId, otp);
    res.status(200).json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify OTP.';
    res.status(400).json({error: message});
  }
}
