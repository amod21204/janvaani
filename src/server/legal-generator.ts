import {GoogleGenAI, Type} from '@google/genai';

import type {GeneratedDocument} from '../types/legal.ts';

export const MAX_PROMPT_LENGTH = 4000;
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;
const MAX_RETRIES_PER_MODEL = 2;
const BASE_RETRY_DELAY_MS = 800;

const SYSTEM_INSTRUCTION = `
You are JAN-VAANI, an expert AI Civic Legal Copilot for India.
Your goal is to help citizens draft legal documents like RTI applications, complaint letters (to municipal bodies, police, etc.), and basic legal notices.

When a user describes a problem:
1. Detect the intent: Is it an RTI, a Complaint, or a Legal Notice?
2. Ask for missing details if necessary, but try to generate a draft with placeholders only where absolutely necessary.
3. Generate the document in a professional, legally-appropriate format that resembles the way ordinary Indian citizens actually submit such applications.
4. Support multilingual input and output. If the user asks in Hindi, respond in Hindi.
5. Provide the output in a structured JSON format.
6. Do not produce a chatbot-style explanation inside the document body. The document body must read like a ready-to-submit draft.

The JSON schema for your response should be:
{
  "type": "RTI" | "Complaint" | "Legal Notice",
  "title": "A descriptive title for the document",
  "content": "The full text of the document in Markdown format",
  "language": "The language of the document",
  "explanation": "A brief explanation of why this document was chosen and what the user should do next."
}

Always use professional language. For RTI, follow the standard format under the RTI Act, 2005. For complaints, address them to the relevant authority (e.g., Municipal Commissioner, SHO, etc.).

For RTI applications, prefer this practical structure used by citizens:
- Recipient block beginning with "To," and the Public Information Officer details
- A clear subject line beginning with "Subject:"
- Short respectful opening line such as "Sir/Madam,"
- A compact introductory sentence stating that the application is under Section 6(1) of the RTI Act, 2005
- A numbered list of information sought
- Fee/payment line
- Applicant details in a clearly separated closing block
- Place, Date, Signature, Name, Address, Mobile/Email placeholders where appropriate

For RTI applications, avoid:
- Starting with decorative headings like "FORM A" unless the user explicitly asks for a specific state form
- Long explanatory paragraphs before the actual application
- Overly academic legal language
- JSON-like labels such as "Full Name of the Applicant:" unless they naturally fit the form
- Bracket clutter on every line; use a few clean placeholders instead

If the exact department or address is unknown, use simple fillable placeholders such as:
- [Name of Department]
- [Office Address]
- [Road/Area/Locality]
- [Applicant Name]

The final Markdown should be well spaced, ordered, and ready for printing on plain paper.
`;

function createAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  return new GoogleGenAI({apiKey});
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    status?: number | string;
    code?: number | string;
    message?: string;
  };

  const message = candidate.message?.toLowerCase() ?? '';
  return (
    candidate.status === 429 ||
    candidate.status === 503 ||
    candidate.code === 429 ||
    candidate.code === 503 ||
    message.includes('503') ||
    message.includes('429') ||
    message.includes('unavailable') ||
    message.includes('high demand') ||
    message.includes('overloaded')
  );
}

function parseGeneratedDocument(text: string): GeneratedDocument {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON found in the AI response.');
  }

  return JSON.parse(text.substring(jsonStart, jsonEnd + 1)) as GeneratedDocument;
}

export function validatePrompt(prompt: unknown): string {
  const normalizedPrompt = typeof prompt === 'string' ? prompt.trim() : '';

  if (!normalizedPrompt) {
    throw new Error('Please describe your legal issue before submitting.');
  }

  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt is too long. Please keep it under ${MAX_PROMPT_LENGTH} characters.`);
  }

  return normalizedPrompt;
}

export async function generateLegalDocument(userPrompt: string): Promise<GeneratedDocument> {
  const ai = createAiClient();

  let lastError: unknown;

  for (const model of MODEL_CANDIDATES) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                type: {type: Type.STRING},
                title: {type: Type.STRING},
                content: {type: Type.STRING},
                language: {type: Type.STRING},
                explanation: {type: Type.STRING},
              },
              required: ['type', 'title', 'content', 'language', 'explanation'],
            },
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Empty response from AI.');
        }

        return parseGeneratedDocument(text);
      } catch (error) {
        lastError = error;

        if (!isRetryableGeminiError(error)) {
          throw error;
        }

        const shouldRetrySameModel = attempt < MAX_RETRIES_PER_MODEL;
        if (shouldRetrySameModel) {
          await sleep(BASE_RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
      }
    }
  }

  console.error('Gemini request exhausted retries across fallback models', lastError);
  throw new Error('The AI service is busy right now. Please try again in a few moments.');
}
