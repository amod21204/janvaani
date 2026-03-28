export type LegalDocumentType = 'RTI' | 'Complaint' | 'Legal Notice';

export interface FormSuggestion {
  category: string;
  subject: string;
  format: 'pdf' | 'docx';
  size: string;
  href?: string;
  note?: string;
}

export interface GeneratedDocument {
  title: string;
  content: string;
  type: LegalDocumentType;
  language: string;
  explanation: string;
}

export interface GenerateDocumentResult {
  document: GeneratedDocument;
  suggestions: FormSuggestion[];
}
