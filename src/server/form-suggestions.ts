import {GOVERNMENT_FORM_REFERENCES} from '../data/forms.ts';
import type {FormSuggestion} from '../types/legal.ts';

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function getFormSuggestions(prompt: string): FormSuggestion[] {
  const normalizedPrompt = prompt.toLowerCase();
  const promptTokens = new Set(tokenize(prompt));

  const ranked = GOVERNMENT_FORM_REFERENCES.map((form) => {
    const sourceTerms = [form.subject, form.category, form.note ?? '', ...(form.keywords ?? [])];
    let score = 0;

    for (const term of sourceTerms) {
      const normalizedTerm = term.toLowerCase();
      if (normalizedTerm && normalizedPrompt.includes(normalizedTerm)) {
        score += normalizedTerm.includes(' ') ? 5 : 3;
      }

      for (const token of tokenize(term)) {
        if (promptTokens.has(token)) {
          score += 1;
        }
      }
    }

    if (form.href) {
      score += 1;
    }

    return {form, score};
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((entry) => ({
      category: entry.form.category,
      subject: entry.form.subject,
      format: entry.form.format,
      size: entry.form.size,
      href: entry.form.href,
      note: entry.form.note,
    }));

  return ranked;
}
