import 'dotenv/config';

import express from 'express';
import {existsSync} from 'fs';
import type {AddressInfo} from 'net';
import path from 'path';
import {fileURLToPath} from 'url';
import {createServer as createViteServer} from 'vite';

import { startFollowUpCron } from './src/cron/followUpCron.js';
import { initComplaintsTable } from './src/db/mysql.js';
import complaintRoutes from './src/routes/complaintRoutes.js';
import {createOtpChallenge, getUserFromSession, registerUser, validateLogin, verifyOtpChallenge} from './src/server/auth-store.ts';
import {getFormSuggestions} from './src/server/form-suggestions.ts';
import {generateLegalDocument, validatePrompt} from './src/server/legal-generator.ts';
import {sendOtpEmail} from './src/server/otp-mailer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const hasBuiltClient = isProduction && existsSync(path.join(distPath, 'index.html'));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_PORT_RETRIES = 10;

function listenWithFallback(app: express.Express, host: string, startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    let currentPort = startPort;

    const tryListen = () => {
      const server = app.listen(currentPort, host, () => {
        const address = server.address() as AddressInfo | null;
        resolve(address?.port ?? currentPort);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && attempts < MAX_PORT_RETRIES) {
          attempts += 1;
          currentPort += 1;
          console.warn(`Port ${currentPort - 1} is busy, retrying on ${currentPort}...`);
          tryListen();
          return;
        }

        reject(error);
      });
    };

    tryListen();
  });
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({limit: '32kb'}));
  await initComplaintsTable();
  startFollowUpCron();

  app.get('/api/health', (_req, res) => {
    res.json({status: 'ok'});
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const user = await registerUser(req.body);
      res.status(201).json({user});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account.';
      res.status(400).json({error: message});
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
      const message = error instanceof Error ? error.message : 'Unable to login.';
      res.status(400).json({error: message});
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
      const otp = typeof req.body?.otp === 'string' ? req.body.otp : '';
      const session = await verifyOtpChallenge(challengeId, otp);
      res.status(200).json(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify OTP.';
      res.status(400).json({error: message});
    }
  });

  app.get('/api/auth/session', async (req, res) => {
    const authorization = req.headers.authorization ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const user = token ? await getUserFromSession(token) : null;

    if (!user) {
      res.status(401).json({error: 'Session not found.'});
      return;
    }

    res.status(200).json({user});
  });

  app.post('/api/generate', async (req, res) => {
    let prompt: string;
    try {
      prompt = validatePrompt(req.body?.prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      res.status(400).json({error: message});
      return;
    }

    try {
      const document = await generateLegalDocument(prompt);
      const suggestions = getFormSuggestions(prompt);
      res.setHeader('Cache-Control', 'no-store');
      res.json({document, suggestions});
    } catch (error) {
      console.error('Failed to generate legal document', error);
      const message = error instanceof Error ? error.message : 'Failed to generate document. Please try again.';
      res.status(500).json({error: message});
    }
  });

  app.use('/api', complaintRoutes);

  if (!hasBuiltClient) {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const activePort = await listenWithFallback(app, HOST, PORT);
  console.log(`Server running on http://localhost:${activePort}`);
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
