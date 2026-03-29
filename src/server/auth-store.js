function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

const users = new Map();
const sessions = new Map();
const challenges = new Map();

export async function registerUser(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const email = typeof input?.email === 'string' ? normalizeEmail(input.email) : '';
  const password = typeof input?.password === 'string' ? input.password : '';

  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required.');
  }

  if (users.has(email)) {
    throw new Error('Account already exists for this email.');
  }

  const user = { id: randomId('user'), name, email, password };
  users.set(email, user);
  return { id: user.id, name: user.name, email: user.email };
}

export async function validateLogin(email, password) {
  const user = users.get(normalizeEmail(email));
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }

  return { id: user.id, name: user.name, email: user.email };
}

export async function createOtpChallenge(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!users.has(normalizedEmail)) {
    throw new Error('Account not found.');
  }

  const challenge = {
    challengeId: randomId('otp'),
    email: normalizedEmail,
    otp: '123456',
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  challenges.set(challenge.challengeId, challenge);
  return challenge;
}

export async function verifyOtpChallenge(challengeId, otp) {
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.expiresAt < Date.now()) {
    throw new Error('OTP challenge expired.');
  }
  if (challenge.otp !== otp) {
    throw new Error('Incorrect OTP.');
  }

  const user = users.get(challenge.email);
  if (!user) {
    throw new Error('Account not found.');
  }

  const token = randomId('session');
  sessions.set(token, { token, email: user.email });
  challenges.delete(challengeId);

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

export async function getUserFromSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  const user = users.get(session.email);
  return user ? { id: user.id, name: user.name, email: user.email } : null;
}
