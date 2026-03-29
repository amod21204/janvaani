export interface HelplineEntry {
  category: string;
  title: string;
  numbers: string[];
  description: string;
  sourceHref?: string;
  sourceLabel?: string;
}

export const HELPLINE_ENTRIES: HelplineEntry[] = [
  {
    category: 'Emergency',
    title: 'Police Emergency',
    numbers: ['112', '100'],
    description: 'Immediate police assistance for emergency and public safety incidents.',
    sourceHref: 'https://112.gov.in/',
    sourceLabel: 'ERSS 112',
  },
  {
    category: 'Emergency',
    title: 'Women Helpline',
    numbers: ['1091', '181'],
    description: 'Support for women facing harassment, abuse, or urgent distress situations.',
  },
  {
    category: 'Utilities',
    title: 'Electricity Complaint',
    numbers: ['1912'],
    description: 'Power outage, meter issue, transformer faults, and related electricity complaints.',
  },
  {
    category: 'Utilities',
    title: 'Water / Sewer Complaint',
    numbers: ['1916'],
    description: 'Report low water pressure, leakage, contamination, or sewer overflow concerns.',
  },
  {
    category: 'Municipal Services',
    title: 'Swachhata / Sanitation',
    numbers: ['1969'],
    description: 'Escalate garbage collection delays and sanitation complaints in urban areas.',
  },
  {
    category: 'Roads & Transport',
    title: 'National Highway Helpline',
    numbers: ['1033'],
    description: 'Accidents, road hazards, breakdown support, and highway emergency help.',
    sourceHref: 'https://nhai.gov.in/',
    sourceLabel: 'NHAI',
  },
];
