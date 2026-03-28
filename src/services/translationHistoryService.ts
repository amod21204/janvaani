import {getMySqlPool} from '../db/mysql.ts';
import type {ComplaintLanguage, ComplaintTranslationResult} from './openaiTranslateService.ts';

export async function saveTranslationHistory(
  text: string,
  language: ComplaintLanguage,
  result: ComplaintTranslationResult,
) {
  const pool = getMySqlPool();
  if (!pool) {
    return;
  }

  await pool.execute(
    `
      INSERT INTO translation_history (original_text, source_language, translated_text, formatted_text)
      VALUES (?, ?, ?, ?)
    `,
    [text, language, result.translated, result.formatted],
  );
}
