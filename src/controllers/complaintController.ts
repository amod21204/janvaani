import type {Request, Response} from 'express';

import {createComplaint, getComplaintDashboard, listComplaints, markComplaintResolved} from '../services/complaintService.ts';
import {improveComplaint} from '../services/openaiComplaintImproverService.ts';

function buildEvidenceText(body: Request['body']) {
  const evidenceItems = Array.isArray(body?.evidenceItems) ? body.evidenceItems : [];
  return evidenceItems
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const label = typeof item.label === 'string' ? item.label.trim() : '';
      const detail = typeof item.detail === 'string' ? item.detail.trim() : '';
      if (!label && !detail) {
        return null;
      }

      return label ? `${label}: ${detail}` : detail;
    })
    .filter(Boolean)
    .join('\n');
}

export async function improveComplaintController(req: Request, res: Response) {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    res.status(400).json({error: 'Complaint text is required.'});
    return;
  }

  try {
    const evidenceText = buildEvidenceText(req.body);
    const improved = await improveComplaint(text, evidenceText);
    const complaint = await createComplaint({
      text_original: text,
      text_improved: improved.improvedText,
      category: improved.category,
      department: improved.department,
      evidence_text: evidenceText,
    });

    res.status(200).json({complaint});
  } catch (error) {
    console.error('Complaint improvement failed', error);
    const message = error instanceof Error ? error.message : 'Unable to improve complaint.';
    res.status(500).json({error: message});
  }
}

export async function dashboardController(_req: Request, res: Response) {
  try {
    const dashboard = await getComplaintDashboard();
    res.status(200).json(dashboard);
  } catch (error) {
    console.error('Dashboard fetch failed', error);
    const message = error instanceof Error ? error.message : 'Unable to load dashboard.';
    res.status(500).json({error: message});
  }
}

export async function listComplaintsController(_req: Request, res: Response) {
  try {
    const complaints = await listComplaints();
    res.status(200).json({complaints});
  } catch (error) {
    console.error('Complaint listing failed', error);
    const message = error instanceof Error ? error.message : 'Unable to load complaints.';
    res.status(500).json({error: message});
  }
}

export async function resolveComplaintController(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({error: 'Invalid complaint id.'});
    return;
  }

  try {
    await markComplaintResolved(id);
    res.status(200).json({success: true});
  } catch (error) {
    console.error('Complaint resolve failed', error);
    const message = error instanceof Error ? error.message : 'Unable to update complaint status.';
    res.status(500).json({error: message});
  }
}
