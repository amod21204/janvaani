import {Router} from 'express';

import {
  createComplaintController,
  listComplaintsController,
} from '../controllers/complaintController.ts';
import {requireAuth} from '../middleware/requireAuth.ts';

const complaintRouter = Router();

complaintRouter.use(requireAuth);
complaintRouter.post('/', createComplaintController);
complaintRouter.get('/', listComplaintsController);

export {complaintRouter};
