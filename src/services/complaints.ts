import type {ComplaintDashboard, ComplaintRecord} from '../types/legal.ts';

interface EvidenceItem {
  label: string;
  detail: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error('Empty server response.');
  }

  return JSON.parse(text) as T;
}

export async function improveComplaintRequest(text: string, evidenceItems: EvidenceItem[]) {
  const response = await fetch('/api/complaints/improve', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, evidenceItems}),
  });

  const payload = await parseJson<{complaint?: ComplaintRecord; error?: string}>(response);
  if (!response.ok || !payload.complaint) {
    throw new Error(payload.error || 'Unable to improve complaint.');
  }

  return payload.complaint;
}

export async function fetchComplaintDashboard() {
  const response = await fetch('/api/complaints/dashboard');
  const payload = await parseJson<ComplaintDashboard & {error?: string}>(response);

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load complaint dashboard.');
  }

  return payload;
}

export async function fetchComplaints() {
  const response = await fetch('/api/complaints');
  const payload = await parseJson<{complaints?: ComplaintRecord[]; error?: string}>(response);

  if (!response.ok || !payload.complaints) {
    throw new Error(payload.error || 'Unable to load complaints.');
  }

  return payload.complaints;
}

export async function resolveComplaint(id: number) {
  const response = await fetch(`/api/complaints/${id}/resolve`, {
    method: 'POST',
  });

  const payload = await parseJson<{success?: boolean; error?: string}>(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Unable to resolve complaint.');
  }
}
