export function validatePrompt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Prompt is required.');
  }

  return value.trim();
}

export async function generateLegalDocument(prompt: string) {
  return [
    'JAN-VAANI Draft Assistant',
    '',
    `Requested topic: ${prompt}`,
    '',
    'Summary:',
    'This is a demo-generated response intended to keep the local app functional.',
    '',
    'Suggested next steps:',
    '1. Confirm applicant details.',
    '2. Review supporting documents.',
    '3. Submit the request to the relevant office or portal.',
  ].join('\n');
}
