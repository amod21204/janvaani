import {Router} from 'express';

import {
  dashboardController,
  improveComplaintController,
  listComplaintsController,
  resolveComplaintController,
} from '../controllers/complaintController.ts';

const complaintRouter = Router();

complaintRouter.post('/improve', improveComplaintController);
complaintRouter.get('/', listComplaintsController);
complaintRouter.get('/dashboard', dashboardController);
complaintRouter.post('/:id/resolve', resolveComplaintController);

export {complaintRouter};
