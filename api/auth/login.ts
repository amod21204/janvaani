import {createOtpChallenge, validateLogin} from '../../src/server/auth-store.ts';
import {sendOtpEmail} from '../../src/server/otp-mailer.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({error: 'Method not allowed.'});
    return;
  }

  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await validateLogin(email, password);
    const challenge = await createOtpChallenge(email);
    const delivery = await sendOtpEmail(user.email, challenge.otp);
    res.status(200).json({
      challengeId: challenge.challengeId,
      message: delivery.delivered ? 'OTP sent to your email address.' : 'OTP generated in demo mode.',
      demoOtp: 'demoOtp' in delivery ? delivery.demoOtp : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to login.';
    res.status(400).json({error: message});
  }
}
