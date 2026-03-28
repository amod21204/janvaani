import {Router} from 'express';

import {translateComplaintController} from '../controllers/translateController.ts';

const router = Router();

router.post('/', translateComplaintController);

export default router;
