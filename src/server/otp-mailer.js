export async function sendOtpEmail(_email, otp) {
  return {
    delivered: false,
    demoOtp: otp,
  };
}
