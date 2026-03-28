import OpenAI from 'openai';

export type ComplaintLanguage = 'en' | 'hi' | 'pa';
export type OutputLanguage = 'en' | 'hi';

export interface ComplaintTranslationResult {
  original: string;
  translated: string;
  formatted: string;
}

const languageLabels: Record<ComplaintLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  pa: 'Punjabi',
};

const outputLanguageLabels: Record<OutputLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
};

let client: OpenAI | null = null;

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : raw;
}

function getOpenAIClient() {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  return client;
}

export async function translateComplaint(
  text: string,
  language: ComplaintLanguage,
  targetLanguage: OutputLanguage = 'en',
): Promise<ComplaintTranslationResult> {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

  const response = await openai.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              'You are a legal and civic drafting assistant for India. Return valid JSON only with the keys original, translated, and formatted.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text:
              targetLanguage === 'hi'
                ? `Input language hint: ${languageLabels[language]}\nTarget language: ${outputLanguageLabels[targetLanguage]}\n\nTranslate the following content into clear, simple, well-structured Hindi. Preserve the structure, headings, numbering, and official tone. Return valid JSON with the keys original, translated, and formatted. The translated and formatted values should both be in Hindi.\n\n${text}`
                : `Input language hint: ${languageLabels[language]}\nTarget language: ${outputLanguageLabels[targetLanguage]}\n\nConvert the following user complaint into a formal legal complaint in English. Maintain clarity, proper tone, and structure.\n\n${text}`,
          },
        ],
      },
    ],
  });

  const raw = response.output_text?.trim();
  if (!raw) {
    throw new Error('OpenAI returned an empty response.');
  }

  const parsed = JSON.parse(extractJson(raw)) as ComplaintTranslationResult;
  return {
    original: parsed.original,
    translated: parsed.translated,
    formatted: parsed.formatted,
  };
}
