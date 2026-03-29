import { GoogleGenAI } from '@google/genai';

const client = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function generateAiText(prompt, fallbackText) {
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 300,
        },
      });

      const text = response?.text?.trim();
      if (text) {
        return text;
      }
    } catch {
      // Fall through to OpenAI or fallback text.
    }
  }

  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
          input: prompt,
          temperature: 0.2,
          max_output_tokens: 300,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const text = payload.output_text?.trim();
        if (text) {
          return text;
        }
      }
    } catch {
      // Fall back to deterministic text below.
    }
  }

  return fallbackText;
}
