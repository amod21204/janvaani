import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface GeneratedDocument {
  title: string;
  content: string;
  type: 'RTI' | 'Complaint' | 'Legal Notice';
  language: string;
}

const SYSTEM_INSTRUCTION = `
You are JAN-VAANI, an expert AI Civic Legal Copilot for India. 
Your goal is to help citizens draft legal documents like RTI applications, complaint letters (to municipal bodies, police, etc.), and basic legal notices.

When a user describes a problem:
1. Detect the intent: Is it an RTI, a Complaint, or a Legal Notice?
2. Ask for missing details if necessary, but try to generate a draft with placeholders if most info is present.
3. Generate the document in a professional, legally-appropriate format.
4. Support multilingual input and output. If the user asks in Hindi, respond in Hindi.
5. Provide the output in a structured JSON format.

The JSON schema for your response should be:
{
  "type": "RTI" | "Complaint" | "Legal Notice",
  "title": "A descriptive title for the document",
  "content": "The full text of the document in Markdown format",
  "language": "The language of the document",
  "explanation": "A brief explanation of why this document was chosen and what the user should do next."
}

Always use professional language. For RTI, follow the standard format under the RTI Act, 2005. For complaints, address them to the relevant authority (e.g., Municipal Commissioner, SHO, etc.).
`;

export async function generateLegalDocument(userPrompt: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          language: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["type", "title", "content", "language", "explanation"],
      },
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    // Robust JSON extraction: find the first '{' and last '}'
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON found in response");
    }
    
    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    console.log("Raw response:", response.text);
    throw new Error("Failed to generate document. Please try again.");
  }
}
