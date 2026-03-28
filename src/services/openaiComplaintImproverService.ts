import OpenAI from 'openai';

import {routeComplaint} from '../server/department-routing.ts';

export interface ComplaintImprovementResult {
  improvedText: string;
  evidenceText: string;
  category: string;
  department: string;
}

let client: OpenAI | null = null;

function getOpenAIClient() {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  return client;
}

function buildFallbackComplaint(text: string, evidenceText: string, category: string, department: string) {
  const lines = [
    'Subject: Complaint regarding civic issue',
    '',
    'Respected Sir/Madam,',
    '',
    `I would like to report the following issue: ${text.trim()}`,
    '',
    `Probable category: ${category}`,
    `Suggested department: ${department}`,
    '',
    'I request the concerned authority to inspect the matter and take necessary action at the earliest.',
  ];

  if (evidenceText.trim()) {
    lines.push('', 'Evidence Section:', evidenceText.trim());
  }

  lines.push('', 'Thank you.');
  return lines.join('\n');
}

export async function improveComplaint(text: string, evidenceText: string): Promise<ComplaintImprovementResult> {
  const routing = routeComplaint(`${text}\n${evidenceText}`);
  const openai = getOpenAIClient();

  if (!openai) {
    return {
      improvedText: buildFallbackComplaint(text, evidenceText, routing.category, routing.department),
      evidenceText,
      category: routing.category,
      department: routing.department,
    };
  }

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
              'You are JanVaani, an Indian civic complaint assistant. Rewrite the complaint in concise formal English with clear issue, location if present, respectful tone, and a direct request for action. Do not add fictional facts. If evidence exists, include an "Evidence Section". Return plain text only.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Original complaint:\n${text}\n\nEvidence details:\n${evidenceText || 'No additional evidence provided.'}\n\nSuggested category: ${routing.category}\nSuggested department: ${routing.department}`,
          },
        ],
      },
    ],
  });

  const improvedText = response.output_text?.trim();
  return {
    improvedText: improvedText || buildFallbackComplaint(text, evidenceText, routing.category, routing.department),
    evidenceText,
    category: routing.category,
    department: routing.department,
  };
}
