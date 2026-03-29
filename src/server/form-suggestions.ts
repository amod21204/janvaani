const cannedSuggestions = [
  'Keep Aadhaar and address proof ready for faster application review.',
  'Use Document Hub to reuse identity files instead of uploading again.',
  'Check district office working hours before visiting in person.',
];

export function getFormSuggestions(prompt: string) {
  const query = prompt.trim().toLowerCase();

  if (!query) {
    return cannedSuggestions;
  }

  if (query.includes('income')) {
    return [
      'Carry income proof or salary slip for all earning family members.',
      'Choose digital delivery if you need the certificate for scholarship upload.',
      'Track your application through the state e-district portal after submission.',
    ];
  }

  if (query.includes('licence') || query.includes('license')) {
    return [
      'Book a slot early if biometric verification is required.',
      'Upload a recent passport-size photo and address proof together.',
      'Add a reminder 2 weeks before expiry to avoid late renewal.',
    ];
  }

  return cannedSuggestions;
}
