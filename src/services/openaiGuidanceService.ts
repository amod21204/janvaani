import OpenAI from 'openai';

export interface CivicGuidanceResult {
  documents_required: string[];
  steps: string[];
  where_to_go: string;
  tips: string[];
}

let client: OpenAI | null = null;

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

function normalizeStringArray(value: unknown, fallback: string) {
  if (!Array.isArray(value)) {
    return [fallback];
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  return items.length ? items : [fallback];
}

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : raw;
}

function parseGuidanceResponse(raw: string): CivicGuidanceResult {
  const parsed = JSON.parse(extractJson(raw)) as Partial<CivicGuidanceResult>;

  return {
    documents_required: normalizeStringArray(parsed.documents_required, 'Please confirm the exact document list with the local office.'),
    steps: normalizeStringArray(parsed.steps, 'Please contact the concerned office for the exact process.'),
    where_to_go:
      typeof parsed.where_to_go === 'string' && parsed.where_to_go.trim()
        ? parsed.where_to_go.trim()
        : 'Please visit the concerned local government office or citizen service centre for guidance.',
    tips: normalizeStringArray(parsed.tips, 'Carry original documents along with self-attested copies when visiting the office.'),
  };
}

export async function getCivicGuidance(query: string): Promise<CivicGuidanceResult> {
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
              'You are an expert Indian civic and legal assistant. Return valid JSON only. Do not include markdown fences, commentary, or extra text.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `You are an expert Indian civic and legal assistant.

Given the user's query, provide structured guidance.

User Query:
${query}

Return response ONLY in JSON format like this:

{
  "documents_required": ["doc1", "doc2"],
  "steps": ["step1", "step2", "step3"],
  "where_to_go": "Name of office/department and brief explanation",
  "tips": ["tip1", "tip2"]
}

Rules:
- Keep answers simple and clear
- Focus on Indian government processes
- Be accurate and practical
- Do not include extra text outside JSON`,
          },
        ],
      },
    ],
  });

  const raw = response.output_text?.trim();
  if (!raw) {
    throw new Error('OpenAI returned an empty response.');
  }

  try {
    return parseGuidanceResponse(raw);
  } catch (error) {
    console.error('Invalid guidance JSON from OpenAI', error, raw);
    throw new Error('The guidance service returned an invalid response.');
  }
}
