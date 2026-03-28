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

export interface CivicGuidanceResult {
  query: string;
  documents_required: string[];
  steps: string[];
  where_to_go: string;
  tips: string[];
}

export type ComplaintStatus = 'pending' | 'follow-up required' | 'resolved';

export interface ComplaintRecord {
  id: number;
  text_original: string;
  text_improved: string;
  category: string;
  department: string;
  status: ComplaintStatus;
  evidence_text: string;
  created_at: string;
}

export interface ComplaintDashboard {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  followUpRequiredComplaints: number;
  categoryBreakdown: Array<{
    category: string;
    total: number;
  }>;
  recentComplaints: ComplaintRecord[];
}
