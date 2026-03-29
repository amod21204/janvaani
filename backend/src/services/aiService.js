export async function generateAiText(prompt, fallbackText) {
  // Lightweight fallback to keep API responsive without forcing external AI setup.
  if (!prompt || !String(prompt).trim()) {
    return fallbackText;
  }

  return fallbackText;
}
