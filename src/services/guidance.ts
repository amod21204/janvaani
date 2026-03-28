import type {CivicGuidanceResult} from '../types/legal.ts';

async function parseJson<T>(response: Response): Promise<T | {error?: string} | null> {
  try {
    return (await response.json()) as T | {error?: string};
  } catch {
    return null;
  }
}

export async function getCivicGuidance(query: string): Promise<CivicGuidanceResult> {
  const response = await fetch('/get-guidance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({query}),
  });

  const payload = await parseJson<CivicGuidanceResult>(response);

  if (!response.ok) {
    throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'Failed to get guidance.');
  }

  if (!payload || !('documents_required' in payload) || !Array.isArray(payload.documents_required)) {
    throw new Error('Received an invalid guidance response from the server.');
  }

  return payload;
}

export async function translateGuidanceToHindi(text: string) {
  const response = await fetch('/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language: 'en',
      targetLanguage: 'hi',
    }),
  });

  const payload = await parseJson<{translated?: string; formatted?: string}>(response);

  if (!response.ok) {
    throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'Failed to translate guidance.');
  }

  return {
    translated: payload && 'translated' in payload && typeof payload.translated === 'string' ? payload.translated : '',
    formatted: payload && 'formatted' in payload && typeof payload.formatted === 'string' ? payload.formatted : '',
  };
}
