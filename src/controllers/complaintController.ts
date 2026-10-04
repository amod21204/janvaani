import type {Request, Response} from 'express';

import type {AuthenticatedLocals} from '../middleware/requireAuth.ts';
import {createComplaint, listComplaints} from '../services/complaintService.ts';

export async function createComplaintController(req: Request, res: Response<unknown, Partial<AuthenticatedLocals>>) {
  const textOriginal = typeof req.body?.textOriginal === 'string' ? req.body.textOriginal.trim() : '';
  const textImproved = typeof req.body?.textImproved === 'string' ? req.body.textImproved.trim() : '';
  const userId = res.locals.currentUser?.id;

  if (!userId) {
    res.status(401).json({error: 'Authentication required.'});
    return;
  }

  if (!textOriginal || !textImproved) {
    res.status(400).json({error: 'Complaint content is required.'});
    return;
  }

  try {
    const complaint = await createComplaint(userId, {
      text_original: textOriginal,
      text_improved: textImproved,
    });

    res.status(201).json({complaint});
  } catch (error) {
    console.error('Complaint creation failed', error);
    const message = error instanceof Error ? error.message : 'Unable to save complaint.';
    res.status(500).json({error: message});
  }
}

export async function listComplaintsController(_req: Request, res: Response<unknown, Partial<AuthenticatedLocals>>) {
  const userId = res.locals.currentUser?.id;
  if (!userId) {
    res.status(401).json({error: 'Authentication required.'});
    return;
  }

  try {
    const complaints = await listComplaints(userId);
    res.status(200).json({complaints});
  } catch (error) {
    console.error('Complaint listing failed', error);
    const message = error instanceof Error ? error.message : 'Unable to load complaints.';
    res.status(500).json({error: message});
  }
}
