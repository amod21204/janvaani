import express from 'express';
import multer from 'multer';

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

router.post('/improve', improveComplaint);
router.post('/classify', classifyComplaint);
router.post('/evidence', upload.single('image'), buildEvidence);
router.post('/complaints', createComplaintRecord);
router.get('/complaints/status', getComplaintStatusList);
router.get('/dashboard', getDashboard);

export default router;
