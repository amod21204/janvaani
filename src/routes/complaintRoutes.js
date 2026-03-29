import express from 'express';
import multer from 'multer';
import { getUserFromSession } from '../server/auth-store.js';

import {
  buildEvidence,
  classifyComplaint,
  createComplaintRecord,
  getComplaintStatusList,
  getDashboard,
  improveComplaint,
} from '../controllers/complaintController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const user = token ? await getUserFromSession(token) : null;

  if (!user) {
    res.status(401).json({ error: 'Login required.' });
    return;
  }

  req.user = user;
  next();
}

router.get('/complaints/status', requireAuth, getComplaintStatusList);
router.post('/improve', requireAuth, improveComplaint);
router.post('/classify', requireAuth, classifyComplaint);
router.post('/evidence', requireAuth, upload.single('image'), buildEvidence);
router.post('/complaints', requireAuth, createComplaintRecord);
router.get('/dashboard', requireAuth, getDashboard);

export default router;
