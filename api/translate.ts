import type {Request, Response} from 'express';

import {translateComplaintController} from '../src/controllers/translateController.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({error: 'Method not allowed.'});
    return;
  }

  await translateComplaintController(req, res);
}
