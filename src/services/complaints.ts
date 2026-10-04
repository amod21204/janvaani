import type {ComplaintRecord} from '../types/legal.ts';

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error('Empty server response.');
  }

  return JSON.parse(text) as T;
}

function buildAuthHeaders() {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('janvaani.sessionToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
  };
}

export async function fetchComplaints() {
  const response = await fetch('/api/complaints', {
    headers: buildAuthHeaders(),
  });
  const payload = await parseJson<{complaints?: ComplaintRecord[]; error?: string}>(response);

  if (!response.ok || !payload.complaints) {
    throw new Error(payload.error || 'Unable to load complaints.');
  }

  return payload.complaints;
}

export async function createComplaintRecord(textOriginal: string, textImproved: string) {
  const response = await fetch('/api/complaints', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({textOriginal, textImproved}),
  });

  const payload = await parseJson<{complaint?: ComplaintRecord; error?: string}>(response);
  if (!response.ok || !payload.complaint) {
    throw new Error(payload.error || 'Unable to save complaint.');
  }

  return payload.complaint;
}
