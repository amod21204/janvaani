export const FORM_CATEGORIES = ['RTI', 'Civic Services', 'Consumer Affairs', 'Police & Safety'] as const;

export type FormCategory = (typeof FORM_CATEGORIES)[number];

export interface GovernmentFormReference {
  category: FormCategory;
  subject: string;
  format: 'pdf' | 'docx';
  size: string;
  href?: string;
  note?: string;
  keywords?: string[];
}

export const GOVERNMENT_FORM_REFERENCES: GovernmentFormReference[] = [
  {
    category: 'RTI',
    subject: 'RTI Application (General Information Request)',
    format: 'pdf',
    size: '220 KB',
    note: 'Use for seeking information from government departments under the RTI Act.',
    keywords: ['information', 'records', 'department', 'officer', 'act'],
  },
  {
    category: 'Civic Services',
    subject: 'Municipal Complaint Form (Road, Drainage, Streetlight)',
    format: 'pdf',
    size: '180 KB',
    note: 'For unresolved civic issues such as potholes, drainage overflow, and streetlights.',
    keywords: ['municipal', 'road', 'drainage', 'pothole', 'streetlight'],
  },
  {
    category: 'Consumer Affairs',
    subject: 'Consumer Grievance Submission Form',
    format: 'docx',
    size: '96 KB',
    note: 'Use when filing complaints related to products, billing, or service defects.',
    keywords: ['consumer', 'billing', 'refund', 'service', 'defect'],
  },
  {
    category: 'Police & Safety',
    subject: 'Police Complaint / FIR Support Format',
    format: 'docx',
    size: '114 KB',
    note: 'Template for reporting threats, harassment, theft, and other safety concerns.',
    keywords: ['police', 'harassment', 'threat', 'theft', 'safety'],
  },
  {
    category: 'Civic Services',
    subject: 'Public Utility Complaint Form (Water / Electricity)',
    format: 'pdf',
    size: '205 KB',
    note: 'For disrupted water supply, voltage issues, meter faults, and utility outages.',
    keywords: ['water', 'electricity', 'power cut', 'utility', 'meter'],
  },
];
