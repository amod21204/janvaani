export async function sendOtpEmail(_email: string, otp: string) {
  return {
    delivered: false,
    demoOtp: otp,
  };
}
