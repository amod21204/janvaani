import 'dotenv/config';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { startFollowUpCron } from './src/cron/followUpCron.js';
import { initComplaintsTable } from './src/db/mysql.js';
import complaintRoutes from './src/routes/complaintRoutes.js';
import {
  createOtpChallenge,
  getUserFromSession,
  registerUser,
  validateLogin,
  verifyOtpChallenge,
} from './src/server/auth-store.js';
import { getFormSuggestions } from './src/server/form-suggestions.js';
import { generateLegalDocument, validatePrompt } from './src/server/legal-generator.js';
import { sendOtpEmail } from './src/server/otp-mailer.js';

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  cors({
    origin: FRONTEND_ORIGIN === '*' ? '*' : FRONTEND_ORIGIN.split(',').map((x) => x.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
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
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to login.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
    const otp = typeof req.body?.otp === 'string' ? req.body.otp : '';
    const session = await verifyOtpChallenge(challengeId, otp);
    res.status(200).json(session);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to verify OTP.' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  const authorization = req.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const user = token ? await getUserFromSession(token) : null;

  if (!user) {
    res.status(401).json({ error: 'Session not found.' });
    return;
  }

  res.status(200).json({ user });
});

app.post('/api/generate', async (req, res) => {
  let prompt;
  try {
    prompt = validatePrompt(req.body?.prompt);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request.' });
    return;
  }

  try {
    const document = await generateLegalDocument(prompt);
    const suggestions = getFormSuggestions(prompt);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ document, suggestions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate document.' });
  }
});

app.use('/api', complaintRoutes);

async function start() {
  await initComplaintsTable();
  startFollowUpCron();
  app.listen(PORT, HOST, () => {
    console.log(`Backend running on http://${HOST}:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
