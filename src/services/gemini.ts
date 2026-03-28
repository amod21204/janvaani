import type {GenerateDocumentResult} from '../types/legal.ts';

export async function generateLegalDocument(userPrompt: string): Promise<GenerateDocumentResult> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({prompt: userPrompt}),
  });

  let payload: GenerateDocumentResult | {error?: string} | null = null;

  try {
    payload = (await response.json()) as GenerateDocumentResult | {error?: string};
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'Failed to generate document. Please try again.');
  }

  if (!payload || !('document' in payload)) {
    throw new Error('Received an invalid response from the server.');
  }

  return {
    document: payload.document,
    suggestions: 'suggestions' in payload && Array.isArray(payload.suggestions) ? payload.suggestions : [],
  };
}
