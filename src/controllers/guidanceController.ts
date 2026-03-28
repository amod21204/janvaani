import type {Request, Response} from 'express';

import {getCivicGuidance} from '../services/openaiGuidanceService.ts';
import {saveGuidanceQuery} from '../services/guidanceQueryService.ts';

export async function getGuidanceController(req: Request, res: Response) {
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';

  if (!query) {
    res.status(400).json({error: 'Query is required.'});
    return;
  }

  try {
    const result = await getCivicGuidance(query);
    await saveGuidanceQuery(query, result);

    res.status(200).json({
      query,
      ...result,
    });
  } catch (error) {
    console.error('Guidance generation failed', error);
    const message = error instanceof Error ? error.message : 'Unable to get civic guidance.';
    res.status(500).json({error: message});
  }
}
