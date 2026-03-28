import 'dotenv/config';

import express from 'express';
import {existsSync} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createServer as createViteServer} from 'vite';

import {guidanceRouter} from './src/routes/guidanceRoutes.ts';
import {translateComplaintController} from './src/controllers/translateController.ts';
import {createOtpChallenge, getUserFromSession, registerUser, validateLogin, verifyOtpChallenge} from './src/server/auth-store.ts';
import {getFormSuggestions} from './src/server/form-suggestions.ts';
import {generateLegalDocument, validatePrompt} from './src/server/legal-generator.ts';
import {sendOtpEmail} from './src/server/otp-mailer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
const hasBuiltClient = existsSync(path.join(distPath, 'index.html'));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_PORT_ATTEMPTS = 10;

function listenOnAvailablePort(app: express.Express, preferredPort: number, host: string, attemptsLeft = MAX_PORT_ATTEMPTS): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = app.listen(preferredPort, host);

    server.once('listening', () => {
      resolve(preferredPort);
    });

    server.once('error', (error: NodeJS.ErrnoException) => {
      server.close();

      if (error.code === 'EADDRINUSE' && attemptsLeft > 1) {
        listenOnAvailablePort(app, preferredPort + 1, host, attemptsLeft - 1).then(resolve).catch(reject);
        return;
      }

      reject(error);
    });
  });
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({limit: '32kb'}));

  app.get('/api/health', (_req, res) => {
    res.json({status: 'ok'});
  });

  app.post('/translate', translateComplaintController);
  app.use('/get-guidance', guidanceRouter);

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

  const runningPort = await listenOnAvailablePort(app, PORT, HOST);
  console.log(`Server running on http://localhost:${runningPort}`);
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
