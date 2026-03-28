export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  occupation: string;
  age: string;
  address: string;
  phoneNumber: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  occupation: string;
  age: string;
  address: string;
  phoneNumber: string;
  password: string;
}

export interface LoginResult {
  challengeId: string;
  message: string;
  demoOtp?: string;
}

export interface VerifyOtpResult {
  token: string;
  user: AuthUser;
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {data: null as Record<string, unknown> | null, text: ''};
  }

  try {
    return {
      data: JSON.parse(text) as Record<string, unknown>,
      text,
    };
  } catch {
    return {
      data: null as Record<string, unknown> | null,
      text,
    };
  }
}

function extractErrorMessage(parsed: {data: Record<string, unknown> | null; text: string}, fallback: string) {
  if (typeof parsed.data?.error === 'string') {
    return parsed.data.error;
  }

  if (parsed.text && !parsed.text.startsWith('<!doctype') && !parsed.text.startsWith('<html')) {
    return parsed.text;
  }

  return fallback;
}

export async function signup(payload: SignupPayload) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });

  const parsed = await parseResponse(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(parsed, 'Unable to create account.'));
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password}),
  });

  const parsed = await parseResponse(response);
  if (!response.ok || !parsed.data || typeof parsed.data.challengeId !== 'string') {
    throw new Error(extractErrorMessage(parsed, 'Unable to login.'));
  }

  return {
    challengeId: parsed.data.challengeId,
    message: typeof parsed.data.message === 'string' ? parsed.data.message : 'OTP generated.',
    demoOtp: typeof parsed.data.demoOtp === 'string' ? parsed.data.demoOtp : undefined,
  };
}

export async function verifyOtp(challengeId: string, otp: string): Promise<VerifyOtpResult> {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({challengeId, otp}),
  });

  const parsed = await parseResponse(response);
  if (
    !response.ok ||
    !parsed.data ||
    typeof parsed.data.token !== 'string' ||
    typeof parsed.data.user !== 'object' ||
    !parsed.data.user
  ) {
    throw new Error(extractErrorMessage(parsed, 'Unable to verify OTP.'));
  }

  return {
    token: parsed.data.token,
    user: parsed.data.user as AuthUser,
  };
}

export async function requestPasswordReset(phoneNumber: string): Promise<LoginResult> {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({phoneNumber}),
  });

  const parsed = await parseResponse(response);
  if (!response.ok || !parsed.data || typeof parsed.data.challengeId !== 'string') {
    throw new Error(extractErrorMessage(parsed, 'Unable to start password reset.'));
  }

  return {
    challengeId: parsed.data.challengeId,
    message: typeof parsed.data.message === 'string' ? parsed.data.message : 'OTP generated.',
    demoOtp: typeof parsed.data.demoOtp === 'string' ? parsed.data.demoOtp : undefined,
  };
}

export async function resetPassword(phoneNumber: string, challengeId: string, otp: string, newPassword: string) {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({phoneNumber, challengeId, otp, newPassword}),
  });

  const parsed = await parseResponse(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(parsed, 'Unable to reset password.'));
  }
}

export async function restoreSession(token: string): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/session', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const parsed = await parseResponse(response);
  if (!response.ok || !parsed.data || typeof parsed.data.user !== 'object' || !parsed.data.user) {
    return null;
  }

  return parsed.data.user as AuthUser;
}
