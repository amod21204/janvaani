import {mkdir, readFile, writeFile} from 'fs/promises';
import os from 'os';
import path from 'path';
import {randomBytes, scryptSync, timingSafeEqual} from 'crypto';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataDir = path.resolve(__dirname, '../../data');
const writableDataDir =
  process.env.AUTH_STORE_DIR ||
  (process.env.VERCEL || process.env.AWS_REGION ? path.join(os.tmpdir(), 'janvaani-data') : defaultDataDir);
const authStorePath = path.join(writableDataDir, 'auth-store.json');

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  occupation: string;
  age: string;
  address: string;
  phoneNumber: string;
  passwordHash: string;
  createdAt: string;
}

interface OtpChallenge {
  id: string;
  userId: string;
  otp: string;
  expiresAt: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

interface AuthStore {
  users: StoredUser[];
  otpChallenges: OtpChallenge[];
  sessions: SessionRecord[];
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

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  occupation: string;
  age: string;
  address: string;
  phoneNumber: string;
}

const emptyStore: AuthStore = {
  users: [],
  otpChallenges: [],
  sessions: [],
};

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    occupation: user.occupation,
    age: user.age,
    address: user.address,
    phoneNumber: user.phoneNumber,
  };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, hash: string) {
  const [salt, derived] = hash.split(':');
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(derived, 'hex'));
}

function normalizePhoneNumber(value: string) {
  return value.replace(/[^0-9+]/g, '');
}

function findUserByIdentifier(store: AuthStore, identifier: string) {
  const trimmed = identifier.trim();
  const normalizedEmail = trimmed.toLowerCase();
  const normalizedPhone = normalizePhoneNumber(trimmed);

  return store.users.find(
    (candidate) =>
      candidate.email === normalizedEmail ||
      normalizePhoneNumber(candidate.phoneNumber) === normalizedPhone,
  );
}

async function readStore(): Promise<AuthStore> {
  try {
    const raw = await readFile(authStorePath, 'utf8');
    return JSON.parse(raw) as AuthStore;
  } catch {
    await mkdir(writableDataDir, {recursive: true});
    await writeFile(authStorePath, JSON.stringify(emptyStore, null, 2));
    return {...emptyStore};
  }
}

async function writeStore(store: AuthStore) {
  await mkdir(writableDataDir, {recursive: true});
  await writeFile(authStorePath, JSON.stringify(store, null, 2));
}

export async function registerUser(payload: SignupPayload): Promise<PublicUser> {
  const store = await readStore();
  const email = payload.email.trim().toLowerCase();
  const phoneNumber = payload.phoneNumber.trim();
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (store.users.some((user) => user.email === email)) {
    throw new Error('An account with this email already exists.');
  }

  if (store.users.some((user) => normalizePhoneNumber(user.phoneNumber) === normalizedPhoneNumber)) {
    throw new Error('An account with this phone number already exists.');
  }

  const newUser: StoredUser = {
    id: randomBytes(12).toString('hex'),
    fullName: payload.fullName.trim(),
    email,
    occupation: payload.occupation.trim(),
    age: payload.age.trim(),
    address: payload.address.trim(),
    phoneNumber,
    passwordHash: hashPassword(payload.password),
    createdAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  await writeStore(store);
  return toPublicUser(newUser);
}

export async function validateLogin(identifier: string, password: string): Promise<PublicUser> {
  const store = await readStore();
  const user = findUserByIdentifier(store, identifier);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  return toPublicUser(user);
}

export async function createOtpChallenge(identifier: string) {
  const store = await readStore();
  const user = findUserByIdentifier(store, identifier);
  if (!user) {
    throw new Error('Account not found.');
  }

  const challenge: OtpChallenge = {
    id: randomBytes(10).toString('hex'),
    userId: user.id,
    otp: `${Math.floor(100000 + Math.random() * 900000)}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };

  store.otpChallenges = store.otpChallenges.filter((item) => item.userId !== user.id);
  store.otpChallenges.push(challenge);
  await writeStore(store);

  return {
    challengeId: challenge.id,
    otp: challenge.otp,
    user: toPublicUser(user),
  };
}

export async function verifyOtpChallenge(challengeId: string, otp: string) {
  const store = await readStore();
  const challenge = store.otpChallenges.find((item) => item.id === challengeId);

  if (!challenge) {
    throw new Error('OTP session not found. Please login again.');
  }

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new Error('OTP expired. Please login again.');
  }

  if (challenge.otp !== otp.trim()) {
    throw new Error('Invalid OTP. Please try again.');
  }

  const user = store.users.find((item) => item.id === challenge.userId);
  if (!user) {
    throw new Error('Account not found.');
  }

  const session: SessionRecord = {
    token: randomBytes(24).toString('hex'),
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  store.otpChallenges = store.otpChallenges.filter((item) => item.id !== challengeId);
  store.sessions = store.sessions.filter((item) => item.userId !== user.id);
  store.sessions.push(session);
  await writeStore(store);

  return {
    token: session.token,
    user: toPublicUser(user),
  };
}

export async function getUserFromSession(token: string): Promise<PublicUser | null> {
  const store = await readStore();
  const session = store.sessions.find((item) => item.token === token);

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = store.users.find((item) => item.id === session.userId);
  return user ? toPublicUser(user) : null;
}
