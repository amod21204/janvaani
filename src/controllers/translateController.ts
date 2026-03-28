import type {Request, Response} from 'express';

import {saveTranslationHistory} from '../services/translationHistoryService.ts';
import {translateComplaint, type ComplaintLanguage, type OutputLanguage} from '../services/openaiTranslateService.ts';

const supportedLanguages = new Set<ComplaintLanguage>(['en', 'hi', 'pa']);
const supportedOutputLanguages = new Set<OutputLanguage>(['en', 'hi']);

export async function translateComplaintController(req: Request, res: Response) {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const language = typeof req.body?.language === 'string' ? req.body.language.trim() : '';
  const targetLanguage = typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage.trim() : 'en';

  if (!text) {
    res.status(400).json({error: 'Complaint text is required.'});
    return;
  }

  if (!supportedLanguages.has(language as ComplaintLanguage)) {
    res.status(400).json({error: 'Language must be one of: en, hi, pa.'});
    return;
  }

  if (!supportedOutputLanguages.has(targetLanguage as OutputLanguage)) {
    res.status(400).json({error: 'targetLanguage must be one of: en, hi.'});
    return;
  }

  try {
    const result = await translateComplaint(text, language as ComplaintLanguage, targetLanguage as OutputLanguage);
    await saveTranslationHistory(text, language as ComplaintLanguage, result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Translation failed', error);
    const message = error instanceof Error ? error.message : 'Unable to translate complaint.';
    res.status(500).json({error: message});
  }
}
