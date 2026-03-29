import {
  FileCheck2,
  HelpCircle,
  Landmark,
  Mic,
  ReceiptText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const quickActions = [
  {
    title: 'Start a Complaint',
    description: 'Report local issues with auto-categorization and status updates.',
    icon: ShieldAlert,
    href: '/complaint',
    accent: 'from-rose-500 to-orange-400',
  },
  {
    title: 'Apply for a Service',
    description: 'Get guided steps for certificates, utilities, and public services.',
    icon: Landmark,
    href: '/services',
    accent: 'from-sky-500 to-violet-500',
  },
  {
    title: 'Use Voice Assistant',
    description: 'Speak naturally and let JAN-VAANI translate intent into action.',
    icon: Mic,
    href: '/assistant',
    accent: 'from-cyan-500 to-sky-500',
  },
  {
    title: 'Ask a Question',
    description: 'Get plain-language help for government processes and deadlines.',
    icon: HelpCircle,
    href: '/assistant',
    accent: 'from-violet-500 to-fuchsia-500',
  },
];

export const reminders = [
  {
    label: 'Pending electricity bill',
    detail: 'BESCOM bill due in 2 days',
    status: 'Action today',
    tone: 'text-danger-500 bg-danger-500/10',
    icon: ReceiptText,
  },
  {
    label: 'Driving licence renewal',
    detail: 'Expires on 18 April 2026',
    status: 'Prepare documents',
    tone: 'text-warn-500 bg-warn-500/10',
    icon: FileCheck2,
  },
  {
    label: 'District rainfall alert',
    detail: 'Heavy rain advisory for tomorrow',
    status: 'Govt alert',
    tone: 'text-sky-700 bg-sky-100',
    icon: Sparkles,
  },
];

export const suggestions = [
  {
    title: 'You may be eligible for the Gruha Jyothi subsidy',
    description: 'Based on your latest bill pattern and address zone.',
    badge: 'High match',
  },
  {
    title: 'You should renew your vehicle insurance copy in Document Hub',
    description: 'Make it reusable for any transport or police verification flow.',
    badge: 'Recommended',
  },
];

export const serviceQuestions = [
  {
    id: 'purpose',
    question: 'What is the income certificate needed for?',
    answer: 'Scholarship application for a student',
  },
  {
    id: 'state',
    question: 'Which state or UT are you applying from?',
    answer: 'Karnataka',
  },
  {
    id: 'delivery',
    question: 'How do you want to receive it?',
    answer: 'Digital certificate download',
  },
];

export const serviceDocuments = [
  'Aadhaar card or voter ID',
  'Ration card or family ID',
  'Salary slip or self-declaration of income',
  'Passport-size photo',
];

export const serviceSteps = [
  'Confirm applicant details and income band.',
  'Upload identity, address, and income proof.',
  'Complete the state e-district application form.',
  'Track verification by revenue officer or tahsildar office.',
  'Download the digitally signed certificate.',
];

export const complaintTimeline = [
  { title: 'Complaint drafted', time: 'Today, 10:20 AM', active: true },
  { title: 'Ward category auto-detected', time: 'Today, 10:21 AM', active: true },
  { title: 'Assigned to civic engineer', time: 'Expected within 2 hours', active: false },
  { title: 'Field resolution update', time: 'Target in 24-48 hours', active: false },
];

export const similarComplaints = [
  {
    title: 'Streetlight outage on 5th Main Road',
    location: '0.8 km away',
    status: 'In progress',
  },
  {
    title: 'Pothole near metro feeder lane',
    location: '1.3 km away',
    status: 'Resolved in 3 days',
  },
];

export const uploadedDocuments = [
  {
    name: 'Aadhaar Card',
    type: 'Identity',
    updated: 'Last used 5 days ago',
    fields: { Name: 'Aarav Sharma', DOB: '14 Aug 1998', ID: 'XXXX XXXX 1048' },
  },
  {
    name: 'Driving Licence',
    type: 'Transport',
    updated: 'Renewal due in 21 days',
    fields: { Name: 'Aarav Sharma', DOB: '14 Aug 1998', ID: 'KA03-2015-0098712' },
  },
  {
    name: 'Electricity Bill',
    type: 'Address Proof',
    updated: 'Updated this month',
    fields: { Name: 'Aarav Sharma', Address: 'Indiranagar, Bengaluru', Bill: 'Rs. 1,840' },
  },
];

export const assistantTranscript = [
  { role: 'user', text: 'I need to renew my driving licence next month.' },
  {
    role: 'assistant',
    text: 'I can prepare the renewal checklist, fetch the required documents, and remind you before the slot opens.',
  },
  {
    role: 'assistant',
    text: 'Your nearest RTO is Indiranagar RTO Office. Estimated completion is 1 to 3 working days after biometric verification.',
  },
];

export const heroStats = [
  { label: 'Tasks resolved this month', value: '12' },
  { label: 'Bills on track', value: '04' },
  { label: 'Documents ready to reuse', value: '09' },
];
