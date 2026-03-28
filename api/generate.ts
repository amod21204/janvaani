import {getFormSuggestions} from '../src/server/form-suggestions.ts';
import {generateLegalDocument, validatePrompt} from '../src/server/legal-generator.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({error: 'Method not allowed.'});
    return;
  }

  let prompt: string;
  try {
    prompt = validatePrompt(req.body?.prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request.';
    res.status(400).json({error: message});
    return;
  }

  try {
    const document = await generateLegalDocument(prompt);
    const suggestions = getFormSuggestions(prompt);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({document, suggestions});
  } catch (error) {
    console.error('Failed to generate legal document', error);
    const message = error instanceof Error ? error.message : 'Failed to generate document. Please try again.';
    res.status(500).json({error: message});
  }
}
