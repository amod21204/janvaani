import nodemailer from 'nodemailer';
import twilio from 'twilio';

export async function sendOtpEmail(email: string, otp: string) {
  const {SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM} = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return {delivered: false, demoOtp: otp};
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Your JAN-VAANI login OTP',
    text: `Your JAN-VAANI OTP is ${otp}. It is valid for 10 minutes.`,
    html: `<p>Your JAN-VAANI OTP is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`,
  });

  return {delivered: true};
}

export async function sendOtpSms(phoneNumber: string, otp: string, purpose: 'login' | 'reset-password') {
  const {TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM} = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_SMS_FROM) {
    return {delivered: false, demoOtp: otp};
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const digits = phoneNumber.replace(/\D/g, '');
  const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${digits.startsWith('91') ? digits : `91${digits}`}`;
  const label = purpose === 'login' ? 'login' : 'password reset';

  await client.messages.create({
    from: TWILIO_SMS_FROM,
    to: normalized,
    body: `Your JAN-VAANI ${label} OTP is ${otp}. It is valid for 10 minutes.`,
  });

  return {delivered: true};
}
