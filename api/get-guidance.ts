import type {Request, Response} from 'express';

import {getGuidanceController} from '../src/controllers/guidanceController.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({error: 'Method not allowed.'});
    return;
  }

  await getGuidanceController(req, res);
}
