import {Router} from 'express';

import {getGuidanceController} from '../controllers/guidanceController.ts';

const guidanceRouter = Router();

guidanceRouter.post('/', getGuidanceController);

export {guidanceRouter};
