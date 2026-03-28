import nodemailer from 'nodemailer';

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
