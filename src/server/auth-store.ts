import {mkdir, readFile, writeFile} from 'fs/promises';
import os from 'os';
import path from 'path';
import {randomBytes, scryptSync, timingSafeEqual} from 'crypto';
import {fileURLToPath} from 'url';
import type {RowDataPacket} from 'mysql2';

import {ensureMySqlSchema, getMySqlPool} from '../db/mysql.ts';

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

interface DbStoredUser extends RowDataPacket {
  id: string;
  full_name: string;
  email: string;
  occupation: string;
  age: string;
  address: string;
  phone_number: string;
  password_hash: string;
}

interface OtpChallenge {
  id: string;
  userId: string;
  purpose: 'login' | 'reset-password';
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

interface DbAuthLookup extends RowDataPacket {
  email: string;
  phone_number: string;
}

interface DbOtpChallenge extends RowDataPacket {
  id: string;
  user_id: string;
  purpose: string;
  otp: string;
  expires_at: Date;
}

interface DbSessionUser extends DbStoredUser {
  session_expires_at: Date;
}

const emptyStore: AuthStore = {
  users: [],
  otpChallenges: [],
  sessions: [],
};

function hasDatabaseAuth() {
  return Boolean(getMySqlPool());
}

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

function toPublicDbUser(user: DbStoredUser): PublicUser {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    occupation: user.occupation,
    age: user.age,
    address: user.address,
    phoneNumber: user.phone_number,
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
  const email = payload.email.trim().toLowerCase();
  const phoneNumber = payload.phoneNumber.trim();
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (hasDatabaseAuth()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    if (!pool) {
      throw new Error('Database unavailable.');
    }

    const [existingRows] = await pool.execute<DbAuthLookup[]>(
      'SELECT email, phone_number FROM auth_users WHERE email = ? OR phone_number = ? LIMIT 1',
      [email, phoneNumber],
    );

    if (existingRows[0]?.email === email) {
      throw new Error('An account with this email already exists.');
    }

    if (existingRows[0]?.phone_number === phoneNumber) {
      throw new Error('An account with this phone number already exists.');
    }

    const userId = randomBytes(12).toString('hex');
    await pool.execute(
      `
        INSERT INTO auth_users (id, full_name, email, occupation, age, address, phone_number, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, payload.fullName.trim(), email, payload.occupation.trim(), payload.age.trim(), payload.address.trim(), phoneNumber, hashPassword(payload.password)],
    );

    const [rows] = await pool.execute<DbStoredUser[]>(
      'SELECT id, full_name, email, occupation, age, address, phone_number, password_hash FROM auth_users WHERE id = ? LIMIT 1',
      [userId],
    );

    return toPublicDbUser(rows[0]);
  }

  const store = await readStore();
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
  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizedIdentifier.toLowerCase();
  const normalizedPhone = normalizePhoneNumber(normalizedIdentifier);

  if (hasDatabaseAuth()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    if (!pool) {
      throw new Error('Database unavailable.');
    }

    const [rows] = await pool.execute<DbStoredUser[]>(
      'SELECT id, full_name, email, occupation, age, address, phone_number, password_hash FROM auth_users WHERE email = ? OR phone_number = ? LIMIT 1',
      [normalizedEmail, normalizedPhone],
    );

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new Error('Invalid email or password.');
    }

    return toPublicDbUser(user);
  }

  const store = await readStore();
  const user = findUserByIdentifier(store, normalizedIdentifier);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  return toPublicUser(user);
}

export async function createOtpChallenge(identifier: string, purpose: 'login' | 'reset-password' = 'login') {
  if (hasDatabaseAuth()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    if (!pool) {
      throw new Error('Database unavailable.');
    }

    const normalized = identifier.trim();
    const [rows] = await pool.execute<DbStoredUser[]>(
      'SELECT id, full_name, email, occupation, age, address, phone_number, password_hash FROM auth_users WHERE email = ? OR phone_number = ? LIMIT 1',
      [normalized.toLowerCase(), normalized],
    );

    const user = rows[0];
    if (!user) {
      throw new Error('Account not found.');
    }

    const challengeId = randomBytes(10).toString('hex');
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.execute('DELETE FROM auth_otp_challenges WHERE user_id = ? AND purpose = ?', [user.id, purpose]);
    await pool.execute(
      'INSERT INTO auth_otp_challenges (id, user_id, purpose, otp, expires_at) VALUES (?, ?, ?, ?, ?)',
      [challengeId, user.id, purpose, otp, expiresAt],
    );

    return {
      challengeId,
      otp,
      user: toPublicDbUser(user),
      phoneNumber: user.phone_number,
    };
  }

  const store = await readStore();
  const user = findUserByIdentifier(store, identifier);
  if (!user) {
    throw new Error('Account not found.');
  }

  const challenge: OtpChallenge = {
    id: randomBytes(10).toString('hex'),
    userId: user.id,
    purpose,
    otp: `${Math.floor(100000 + Math.random() * 900000)}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };

  store.otpChallenges = store.otpChallenges.filter((item) => !(item.userId === user.id && item.purpose === purpose));
  store.otpChallenges.push(challenge);
  await writeStore(store);

  return {
    challengeId: challenge.id,
    otp: challenge.otp,
    user: toPublicUser(user),
    phoneNumber: user.phoneNumber,
  };
}

export async function verifyOtpChallenge(challengeId: string, otp: string, purpose: 'login' | 'reset-password' = 'login') {
  if (hasDatabaseAuth()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    if (!pool) {
      throw new Error('Database unavailable.');
    }

    const [challengeRows] = await pool.execute<DbOtpChallenge[]>(
      'SELECT id, user_id, purpose, otp, expires_at FROM auth_otp_challenges WHERE id = ? LIMIT 1',
      [challengeId],
    );

    const challenge = challengeRows[0];
    if (!challenge || challenge.purpose !== purpose) {
      throw new Error('OTP session not found. Please try again.');
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      throw new Error('OTP expired. Please try again.');
    }
    if (challenge.otp !== otp.trim()) {
      throw new Error('Invalid OTP. Please try again.');
    }

    const [userRows] = await pool.execute<DbStoredUser[]>(
      'SELECT id, full_name, email, occupation, age, address, phone_number, password_hash FROM auth_users WHERE id = ? LIMIT 1',
      [challenge.user_id],
    );

    const user = userRows[0];
    if (!user) {
      throw new Error('Account not found.');
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.execute('DELETE FROM auth_otp_challenges WHERE id = ?', [challengeId]);
    await pool.execute('DELETE FROM auth_sessions WHERE user_id = ?', [user.id]);
    await pool.execute('INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, user.id, expiresAt]);

    return {
      token,
      user: toPublicDbUser(user),
    };
  }

  const store = await readStore();
  const challenge = store.otpChallenges.find((item) => item.id === challengeId && item.purpose === purpose);
  if (!challenge) {
    throw new Error('OTP session not found. Please try again.');
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new Error('OTP expired. Please try again.');
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

export async function requestPasswordReset(phoneNumber: string) {
  return createOtpChallenge(phoneNumber, 'reset-password');
}

export async function resetPasswordWithOtp(phoneNumber: string, challengeId: string, otp: string, newPassword: string) {
  const normalized = phoneNumber.trim();
  const nextHash = hashPassword(newPassword.trim());

  if (hasDatabaseAuth()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    if (!pool) {
      throw new Error('Database unavailable.');
    }

    const [userRows] = await pool.execute<DbStoredUser[]>(
      'SELECT id, full_name, email, occupation, age, address, phone_number, password_hash FROM auth_users WHERE phone_number = ? LIMIT 1',
      [normalized],
    );

    const user = userRows[0];
    if (!user) {
      throw new Error('Account not found.');
    }

    const [challengeRows] = await pool.execute<DbOtpChallenge[]>(
      'SELECT id, user_id, purpose, otp, expires_at FROM auth_otp_challenges WHERE id = ? LIMIT 1',
      [challengeId],
    );

    const challenge = challengeRows[0];
    if (!challenge || challenge.user_id !== user.id || challenge.purpose !== 'reset-password') {
      throw new Error('OTP session not found. Please try again.');
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      throw new Error('OTP expired. Please try again.');
    }
    if (challenge.otp !== otp.trim()) {
      throw new Error('Invalid OTP. Please try again.');
    }

    await pool.execute('UPDATE auth_users SET password_hash = ? WHERE id = ?', [nextHash, user.id]);
    await pool.execute('DELETE FROM auth_otp_challenges WHERE id = ?', [challengeId]);
    await pool.execute('DELETE FROM auth_sessions WHERE user_id = ?', [user.id]);
    return;
  }

  const store = await readStore();
  const user = store.users.find((candidate) => candidate.phoneNumber === normalized);
  if (!user) {
    throw new Error('Account not found.');
  }

  const challenge = store.otpChallenges.find((item) => item.id === challengeId && item.userId === user.id && item.purpose === 'reset-password');
  if (!challenge) {
    throw new Error('OTP session not found. Please try again.');
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new Error('OTP expired. Please try again.');
  }
  if (challenge.otp !== otp.trim()) {
    throw new Error('Invalid OTP. Please try again.');
  }

  user.passwordHash = nextHash;
  store.otpChallenges = store.otpChallenges.filter((item) => item.id !== challengeId);
  store.sessions = store.sessions.filter((item) => item.userId !== user.id);
  await writeStore(store);
}

export async function getUserFromSession(token: string): Promise<PublicUser | null> {
  if (hasDatabaseAuth()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    if (!pool) {
      return null;
    }

    const [rows] = await pool.execute<DbSessionUser[]>(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.occupation,
          u.age,
          u.address,
          u.phone_number,
          u.password_hash,
          s.expires_at AS session_expires_at
        FROM auth_sessions s
        INNER JOIN auth_users u ON u.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
      `,
      [token],
    );

    const user = rows[0];
    if (!user || new Date(user.session_expires_at).getTime() < Date.now()) {
      return null;
    }

    return toPublicDbUser(user);
  }

  const store = await readStore();
  const session = store.sessions.find((item) => item.token === token);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = store.users.find((item) => item.id === session.userId);
  return user ? toPublicUser(user) : null;
}
