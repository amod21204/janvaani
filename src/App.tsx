import {useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  AlertCircle,
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Info,
  Languages,
  LogOut,
  Phone,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import {HELPLINE_ENTRIES} from './data/helplines.ts';
import ComplaintDashboard from './components/ComplaintDashboard.tsx';
import {cn} from './lib/utils.ts';
import VoiceToText from './components/VoiceToText.tsx';
import HelpAndGuidance from './components/HelpAndGuidance.jsx';
import Chatbot from './components/Chatbot.jsx';
import type {AuthUser, LoginResult, SignupPayload} from './services/auth.ts';
import {login, requestPasswordReset, resetPassword, restoreSession, signup, verifyOtp} from './services/auth.ts';
import {fetchComplaintDashboard, fetchComplaints, improveComplaintRequest, resolveComplaint} from './services/complaints.ts';
import {generateLegalDocument} from './services/gemini.ts';
import {getCivicGuidance, translateGuidanceToHindi} from './services/guidance.ts';
import {getPublicConfig} from './services/public-config.ts';
import type {CivicGuidanceResult, ComplaintDashboard as ComplaintDashboardData, ComplaintRecord, FormSuggestion, GeneratedDocument} from './types/legal.ts';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  document?: GeneratedDocument;
  suggestions?: FormSuggestion[];
}

const STORAGE_KEYS = {
  sessionToken: 'janvaani.sessionToken',
} as const;

const WELCOME = 'Namaste! I am JAN-VAANI, your AI Civic Legal Copilot.';
const emptyProfile = {
  fullName: '',
  email: '',
  occupation: '',
  age: '',
  address: '',
  phoneNumber: '',
  password: '',
};
const emptyResetForm = {
  phoneNumber: '',
  otp: '',
  newPassword: '',
};

function welcomeMessages(user: AuthUser | null): Message[] {
  return [
    {
      id: '1',
      role: 'ai',
      text: user ? `Namaste, ${user.fullName}. ${WELCOME}` : WELCOME,
    },
  ];
}

function enrichPrompt(prompt: string, user: AuthUser) {
  return `${prompt}

Citizen details:
Name: ${user.fullName}
Occupation: ${user.occupation}
Age: ${user.age}
Address: ${user.address}
Phone number: ${user.phoneNumber}`;
}

function buildGuidanceText(result: CivicGuidanceResult) {
  return [
    `Original Query:\n${result.query}`,
    `Documents Required:\n${result.documents_required.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    `Steps to Follow:\n${result.steps.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    `Where to Go:\n${result.where_to_go}`,
    `Tips / Notes:\n${result.tips.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
  ].join('\n\n');
}

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<'drafting' | 'guidance' | 'dashboard'>('drafting');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginForm, setLoginForm] = useState({...emptyProfile});
  const [signupForm, setSignupForm] = useState({...emptyProfile});
  const [otpState, setOtpState] = useState<LoginResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetForm, setResetForm] = useState({...emptyResetForm});
  const [resetChallenge, setResetChallenge] = useState<LoginResult | null>(null);
  const [messages, setMessages] = useState<Message[]>(welcomeMessages(null));
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [complaintPreview, setComplaintPreview] = useState<GeneratedDocument | null>(null);
  const [guidanceQuery, setGuidanceQuery] = useState('');
  const [guidanceResult, setGuidanceResult] = useState<CivicGuidanceResult | null>(null);
  const [guidanceHindi, setGuidanceHindi] = useState('');
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [guidanceTranslating, setGuidanceTranslating] = useState(false);
  const [improvingComplaint, setImprovingComplaint] = useState(false);
  const [complaintRecord, setComplaintRecord] = useState<ComplaintRecord | null>(null);
  const [complaintDashboard, setComplaintDashboard] = useState<ComplaintDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<Array<{label: string; detail: string}>>([]);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEYS.sessionToken);
    if (!token) {
      return;
    }

    void restoreSession(token).then((user) => {
      if (!user) {
        window.localStorage.removeItem(STORAGE_KEYS.sessionToken);
        return;
      }
      setCurrentUser(user);
      setMessages(welcomeMessages(user));
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!complaintPreview) {
      return;
    }

    document.getElementById('complaintOutput')?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [complaintPreview]);

  useEffect(() => {
    void getPublicConfig()
      .then((config) => {
        setWhatsappLink(config.whatsappLink);
      })
      .catch(() => {
        setWhatsappLink(null);
      });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    void fetchComplaintDashboard()
      .then((dashboard) => {
        setComplaintDashboard(dashboard);
        setDashboardError(null);
      })
      .catch((caughtError) => {
        setDashboardError(caughtError instanceof Error ? caughtError.message : 'Unable to load dashboard.');
      });

    void fetchComplaints()
      .then((complaints) => {
        setComplaintRecord(complaints[0] ?? null);
      })
      .catch(() => undefined);
  }, [currentUser]);

  const helplineGroups = useMemo(() => {
    return HELPLINE_ENTRIES.reduce<Record<string, typeof HELPLINE_ENTRIES>>((acc, entry) => {
      acc[entry.category] = [...(acc[entry.category] ?? []), entry];
      return acc;
    }, {});
  }, []);

  const handleLogin = async () => {
    try {
      const result = await login(loginForm.email.trim(), loginForm.password);
      setOtpState(result);
      setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to login.');
    }
  };

  const handleForgotPasswordRequest = async () => {
    try {
      const result = await requestPasswordReset(resetForm.phoneNumber.trim());
      setResetChallenge(result);
      setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to start password reset.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpState) {
      return;
    }

    try {
      const result = await verifyOtp(otpState.challengeId, otpCode);
      setCurrentUser(result.user);
      setMessages(welcomeMessages(result.user));
      window.localStorage.setItem(STORAGE_KEYS.sessionToken, result.token);
      setAuthError(null);
      setOtpState(null);
      setOtpCode('');
      setLoginForm({...emptyProfile});
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to verify OTP.');
    }
  };

  const handleResetPassword = async () => {
    if (!resetChallenge) {
      return;
    }

    try {
      await resetPassword(resetForm.phoneNumber.trim(), resetChallenge.challengeId, resetForm.otp.trim(), resetForm.newPassword.trim());
      setForgotPasswordMode(false);
      setResetChallenge(null);
      setResetForm({...emptyResetForm});
      setAuthError('Password reset successfully. Please login with your new password.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to reset password.');
    }
  };

  const handleSignup = async () => {
    const payload: SignupPayload = {
      fullName: signupForm.fullName.trim(),
      email: signupForm.email.trim(),
      occupation: signupForm.occupation.trim(),
      age: signupForm.age.trim(),
      address: signupForm.address.trim(),
      phoneNumber: signupForm.phoneNumber.trim(),
      password: signupForm.password.trim(),
    };

    if (Object.values(payload).some((value) => !value)) {
      setAuthError('Please complete all sign up fields.');
      return;
    }

    try {
      await signup(payload);
      setAuthMode('login');
      setSignupForm({...emptyProfile});
      setLoginForm((prev) => ({...prev, email: payload.email}));
      setAuthError('Account created. Login with your email and password to receive an OTP.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to create account.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setMessages(welcomeMessages(null));
    window.localStorage.removeItem(STORAGE_KEYS.sessionToken);
    setError(null);
    setGuidanceError(null);
  };

  const handleStartComplaint = () => {
    setWorkspaceMode('drafting');
    window.setTimeout(() => {
      document.getElementById('complaintSection')?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 50);
  };

  const handleHelplinePrefill = (helplineTitle: string) => {
    setWorkspaceMode('drafting');
    setInput((prev) => (prev.trim() ? prev : `Complaint regarding ${helplineTitle}: `));
    window.setTimeout(() => {
      document.getElementById('complaintSection')?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 50);
  };

  const handleGuidedStart = (query: string, docType: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return;
    }

    if (docType === 'Complaint' || docType === 'FIR') {
      setWorkspaceMode('drafting');
      setInput(normalizedQuery);
      window.setTimeout(() => {
        document.getElementById('complaintSection')?.scrollIntoView({behavior: 'smooth', block: 'start'});
      }, 50);
      return;
    }

    setWorkspaceMode('guidance');
    setGuidanceQuery(normalizedQuery);
  };

  const refreshComplaintDashboard = async () => {
    setDashboardLoading(true);
    try {
      const dashboard = await fetchComplaintDashboard();
      setComplaintDashboard(dashboard);
      setDashboardError(null);
    } catch (caughtError) {
      setDashboardError(caughtError instanceof Error ? caughtError.message : 'Unable to load dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleEvidenceFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const nextItems = Array.from(files).map((file) => {
      if (file.type.startsWith('image/')) {
        return {
          label: 'Image Evidence',
          detail: `${file.name} uploaded as visual proof of the issue.`,
        };
      }

      if (file.type.startsWith('audio/')) {
        return {
          label: 'Voice Evidence',
          detail: `${file.name} uploaded as an audio note by the citizen.`,
        };
      }

      return {
        label: 'File Evidence',
        detail: `${file.name} attached by the citizen.`,
      };
    });

    setEvidenceItems((prev) => [...prev, ...nextItems]);
  };

  const handleImproveComplaint = async () => {
    const complaintText = input.trim();
    if (!complaintText || improvingComplaint) {
      return;
    }

    setImprovingComplaint(true);
    setError(null);

    try {
      const complaint = await improveComplaintRequest(complaintText, evidenceItems);
      setComplaintRecord(complaint);
      setComplaintPreview({
        title: `Improved Complaint #${complaint.id}`,
        content: complaint.text_improved,
        type: 'Complaint',
        language: 'English',
        explanation: `Routed to ${complaint.department}`,
      });
      await refreshComplaintDashboard();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to improve complaint.');
    } finally {
      setImprovingComplaint(false);
    }
  };

  const handleResolveComplaint = async (id: number) => {
    try {
      await resolveComplaint(id);
      if (complaintRecord?.id === id) {
        setComplaintRecord({...complaintRecord, status: 'resolved'});
      }
      await refreshComplaintDashboard();
    } catch (caughtError) {
      setDashboardError(caughtError instanceof Error ? caughtError.message : 'Unable to resolve complaint.');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentUser) {
      return;
    }

    const prompt = input.trim();
    setMessages((prev) => [...prev, {id: Date.now().toString(), role: 'user', text: prompt}]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateLegalDocument(enrichPrompt(prompt, currentUser));
      setComplaintPreview(result.document);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-reply`,
          role: 'ai',
          text: result.document.explanation,
          document: result.document,
          suggestions: result.suggestions,
        },
      ]);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages(welcomeMessages(currentUser));
    setError(null);
    setComplaintPreview(null);
    setComplaintRecord(null);
    setEvidenceItems([]);
  };

  const clearGuidance = () => {
    setGuidanceQuery('');
    setGuidanceResult(null);
    setGuidanceHindi('');
    setGuidanceError(null);
  };

  const handleWorkspaceReset = () => {
    if (workspaceMode === 'guidance') {
      clearGuidance();
      return;
    }

    if (workspaceMode === 'dashboard') {
      setDashboardError(null);
      return;
    }

    clearChat();
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Unable to copy text right now. Please try again.');
    }
  };

  const downloadDocument = async (doc: GeneratedDocument) => {
    const safeTitle = doc.title.replace(/\s+/g, '_');
    const isNonEnglish = /[^\x00-\x7F]/.test(doc.content);
    if (isNonEnglish) {
      const file = new Blob([doc.content], {type: 'text/plain;charset=utf-8'});
      const href = URL.createObjectURL(file);
      const element = document.createElement('a');
      element.href = href;
      element.download = `${doc.type}_${safeTitle}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(href);
      return;
    }

    const {jsPDF} = await import('jspdf');
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text(doc.title, 20, 20);
    pdf.setFontSize(12);
    pdf.text(pdf.splitTextToSize(doc.content.replace(/#/g, ''), 170), 20, 40);
    pdf.save(`${doc.type}_${safeTitle}.pdf`);
  };

  const downloadGuidance = async () => {
    if (!guidanceResult) {
      return;
    }

    const content = buildGuidanceText(guidanceResult) + (guidanceHindi ? `\n\nHindi Translation:\n${guidanceHindi}` : '');
    const isNonEnglish = /[^\x00-\x7F]/.test(content);

    if (isNonEnglish) {
      const file = new Blob([content], {type: 'text/plain;charset=utf-8'});
      const href = URL.createObjectURL(file);
      const element = document.createElement('a');
      element.href = href;
      element.download = 'janvaani_civic_guidance.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(href);
      return;
    }

    const {jsPDF} = await import('jspdf');
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('JAN-VAANI Civic Guidance', 20, 20);
    pdf.setFontSize(12);
    pdf.text(pdf.splitTextToSize(content, 170), 20, 35);
    pdf.save('janvaani_civic_guidance.pdf');
  };

  const handleGuidanceSubmit = async () => {
    const query = guidanceQuery.trim();
    if (!query || guidanceLoading) {
      return;
    }

    setGuidanceLoading(true);
    setGuidanceError(null);
    setGuidanceHindi('');

    try {
      const enrichedQuery = currentUser
        ? `${query}\n\nCitizen details:\nName: ${currentUser.fullName}\nAddress: ${currentUser.address}\nOccupation: ${currentUser.occupation}`
        : query;
      const result = await getCivicGuidance(enrichedQuery);
      setGuidanceResult({...result, query});
    } catch (caughtError: unknown) {
      setGuidanceError(caughtError instanceof Error ? caughtError.message : 'Unable to fetch guidance right now.');
    } finally {
      setGuidanceLoading(false);
    }
  };

  const handleGuidanceTranslation = async () => {
    if (!guidanceResult || guidanceTranslating) {
      return;
    }

    setGuidanceTranslating(true);
    setGuidanceError(null);

    try {
      const translation = await translateGuidanceToHindi(
        `Translate the following civic guidance into simple Hindi while preserving the headings, numbering, and official tone.\n\n${buildGuidanceText(guidanceResult)}`,
      );
      setGuidanceHindi(translation.formatted || translation.translated);
    } catch (caughtError: unknown) {
      setGuidanceError(caughtError instanceof Error ? caughtError.message : 'Unable to translate guidance right now.');
    } finally {
      setGuidanceTranslating(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="app-shell app-fade-in min-h-screen bg-[radial-gradient(circle_at_top_left,#eaf2ff_0%,#f3f4f6_42%,#e5edff_100%)] px-4 py-8 text-[#111827] sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="glass-panel app-slide-up rounded-[32px] border border-[#dbe4f0] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-8 shadow-[0_28px_60px_rgba(71,49,27,0.08)]">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-[#1E40AF] p-3 text-white">
                <Scale className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#64748b]">Citizen Access Portal</p>
                <h1 className="text-3xl font-bold text-[#111827]">JAN-VAANI</h1>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-[#dbe4f0] bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Drafting</p>
                <p className="mt-2 text-lg font-bold text-[#111827]">RTI + Complaints</p>
              </div>
              <div className="rounded-3xl border border-[#dbe4f0] bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Citizen Profile</p>
                <p className="mt-2 text-lg font-bold text-[#111827]">Name to address</p>
              </div>
              <div className="rounded-3xl border border-[#dbe4f0] bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Support</p>
                <p className="mt-2 text-lg font-bold text-[#111827]">Forms + Helplines</p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#dbe4f0] bg-white p-6">
              <h2 className="text-xl font-bold text-[#111827]">What you can do here</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f8fbff] p-4">
                  <p className="text-sm font-semibold text-[#1f2937]">Profile-aware drafts</p>
                  <p className="mt-1 text-sm text-[#475569]">Use your saved name, address, age, occupation, and phone details in applications.</p>
                </div>
                <div className="rounded-2xl bg-[#f8fbff] p-4">
                  <p className="text-sm font-semibold text-[#1f2937]">Complaint support</p>
                  <p className="mt-1 text-sm text-[#475569]">Browse official forms and immediate complaint helplines in one place.</p>
                </div>
              </div>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-[#ffffff] transition hover:brightness-95"
                >
                  <Phone className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              )}
            </div>

            <div className="mt-8 rounded-[28px] border border-[#dbe4f0] bg-[#ffffff] p-6">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#2563EB]" />
                <h2 className="text-lg font-bold text-[#111827]">Quick Toll-Free Numbers</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {HELPLINE_ENTRIES.slice(0, 6).map((entry) => (
                  <div key={`${entry.category}-${entry.title}`} className="rounded-2xl border border-[#e5edff] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{entry.category}</p>
                    <p className="mt-1 text-sm font-bold text-[#111827]">{entry.title}</p>
                    <p className="mt-2 text-base font-bold text-[#2563EB]">{entry.numbers.join(' / ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-panel app-slide-up rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_28px_60px_rgba(71,49,27,0.08)] sm:p-8">
            <div className="flex rounded-2xl bg-[#eaf2ff] p-1">
              <button onClick={() => { setAuthMode('login'); setForgotPasswordMode(false); setAuthError(null); }} className={cn('flex-1 rounded-2xl px-4 py-3 text-sm font-semibold', authMode === 'login' ? 'bg-white text-[#111827]' : 'text-[#64748b]')} type="button">Login</button>
              <button onClick={() => { setAuthMode('signup'); setForgotPasswordMode(false); setAuthError(null); }} className={cn('flex-1 rounded-2xl px-4 py-3 text-sm font-semibold', authMode === 'signup' ? 'bg-white text-[#111827]' : 'text-[#64748b]')} type="button">Sign Up</button>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#64748b]">{forgotPasswordMode ? 'Password recovery' : authMode === 'login' ? 'Welcome back' : 'Create your profile'}</p>
              <h2 className="mt-2 text-2xl font-bold text-[#111827]">{forgotPasswordMode ? 'Reset your password with SMS OTP' : authMode === 'login' ? 'Access your citizen workspace' : 'Register for JAN-VAANI'}</h2>
            </div>
            {authError && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{authError}</div>}
            {forgotPasswordMode ? (
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#334155]">Phone Number</span>
                  <input
                    value={resetForm.phoneNumber}
                    onChange={(event) => setResetForm((prev) => ({...prev, phoneNumber: event.target.value}))}
                    className="w-full rounded-2xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="Enter your registered phone number"
                  />
                </label>
                <button
                  onClick={handleForgotPasswordRequest}
                  className="w-full rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF]"
                  type="button"
                >
                  Send Reset OTP
                </button>
                {resetChallenge && (
                  <div className="rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
                    <p className="text-sm font-semibold text-[#1f2937]">Password Reset Verification</p>
                    <p className="mt-1 text-sm text-[#475569]">{resetChallenge.message}</p>
                    {resetChallenge.demoOtp && (
                      <p className="mt-2 text-sm font-bold text-[#2563EB]">Demo OTP: {resetChallenge.demoOtp}</p>
                    )}
                    <label className="mt-3 block">
                      <span className="mb-2 block text-sm font-semibold text-[#334155]">Enter OTP</span>
                      <input
                        value={resetForm.otp}
                        onChange={(event) => setResetForm((prev) => ({...prev, otp: event.target.value}))}
                        className="w-full rounded-2xl border border-[#cbd5e1] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                        placeholder="6-digit OTP"
                      />
                    </label>
                    <label className="mt-3 block">
                      <span className="mb-2 block text-sm font-semibold text-[#334155]">New Password</span>
                      <input
                        type="password"
                        value={resetForm.newPassword}
                        onChange={(event) => setResetForm((prev) => ({...prev, newPassword: event.target.value}))}
                        className="w-full rounded-2xl border border-[#cbd5e1] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                        placeholder="Enter new password"
                      />
                    </label>
                    <button
                      onClick={handleResetPassword}
                      className="mt-3 w-full rounded-2xl border border-[#2563EB] px-4 py-3 text-sm font-semibold text-[#2563EB] transition hover:bg-[#eff6ff]"
                      type="button"
                    >
                      Reset Password
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setForgotPasswordMode(false); setResetChallenge(null); setResetForm({...emptyResetForm}); setAuthError(null); }}
                  className="w-full rounded-2xl border border-[#cbd5e1] px-4 py-3 text-sm font-semibold text-[#334155]"
                  type="button"
                >
                  Back to Login
                </button>
              </div>
            ) : authMode === 'login' ? (
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#334155]">Email or Phone Number</span>
                  <input
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((prev) => ({...prev, email: event.target.value}))}
                    className="w-full rounded-2xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="Enter email address or phone number"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#334155]">Password</span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({...prev, password: event.target.value}))}
                    className="w-full rounded-2xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="Enter password"
                  />
                </label>
                <button
                  onClick={handleLogin}
                  className="w-full rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF]"
                  type="button"
                >
                  Continue to OTP
                </button>
                <button
                  onClick={() => { setForgotPasswordMode(true); setResetChallenge(null); setResetForm({...emptyResetForm}); setAuthError(null); }}
                  className="w-full rounded-2xl border border-[#cbd5e1] px-4 py-3 text-sm font-semibold text-[#334155]"
                  type="button"
                >
                  Forgot Password?
                </button>
                {otpState && (
                  <div className="rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
                    <p className="text-sm font-semibold text-[#1f2937]">OTP Verification</p>
                    <p className="mt-1 text-sm text-[#475569]">{otpState.message}</p>
                    {otpState.demoOtp && (
                      <p className="mt-2 text-sm font-bold text-[#2563EB]">Demo OTP: {otpState.demoOtp}</p>
                    )}
                    <label className="mt-3 block">
                      <span className="mb-2 block text-sm font-semibold text-[#334155]">Enter OTP</span>
                      <input
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value)}
                        className="w-full rounded-2xl border border-[#cbd5e1] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                        placeholder="6-digit OTP"
                      />
                    </label>
                    <button
                      onClick={handleVerifyOtp}
                      className="mt-3 w-full rounded-2xl border border-[#2563EB] px-4 py-3 text-sm font-semibold text-[#2563EB] transition hover:bg-[#eff6ff]"
                      type="button"
                    >
                      Verify OTP and Login
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  ['Full Name', 'fullName'],
                  ['Email Address', 'email'],
                  ['Occupation', 'occupation'],
                  ['Age', 'age'],
                  ['Phone Number', 'phoneNumber'],
                ].map(([label, field]) => (
                  <label key={field} className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#334155]">{label}</span>
                    <input
                      value={signupForm[field as keyof typeof signupForm]}
                      onChange={(event) => setSignupForm((prev) => ({...prev, [field]: event.target.value}))}
                      className="w-full rounded-2xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </label>
                ))}
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-[#334155]">Address</span>
                  <textarea
                    value={signupForm.address}
                    onChange={(event) => setSignupForm((prev) => ({...prev, address: event.target.value}))}
                    className="min-h-[96px] w-full rounded-2xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="Enter full address"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-[#334155]">Password</span>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) => setSignupForm((prev) => ({...prev, password: event.target.value}))}
                    className="w-full rounded-2xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="Create password"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    onClick={handleSignup}
                    className="w-full rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF]"
                    type="button"
                  >
                    Create account
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] px-4 py-3 text-sm text-[#725f50]">
              Sign in to access drafting, civic guidance, form references, helplines, and voice-assisted support.
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell app-fade-in min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f4f6_48%,#e5edff_100%)] text-[#111827]">
      <header className="glass-nav border-b border-[#cbd5e1] bg-[#f8fbff]/90 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#1E40AF] p-2.5 text-white">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#251d17]">JAN-VAANI</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6f5b]">Citizen Dashboard</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3">
              <div className="rounded-xl bg-[#dbeafe] p-2 text-[#1E40AF]">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-[#111827]">{currentUser.fullName}</p>
                <p className="text-[#64748b]">{currentUser.occupation}</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#cbd5e1] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#6a584b] sm:flex">
              <Languages className="h-3.5 w-3.5" />
              <span>{workspaceMode === 'guidance' ? 'Guidance + Translation + PDF' : 'Profile + Forms + Helplines'}</span>
            </div>
            <button onClick={handleWorkspaceReset} className="glass-card rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-semibold text-[#334155] transition hover:scale-[1.02]" type="button">
              <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />{workspaceMode === 'guidance' ? 'Clear Guidance' : 'Reset'}</span>
            </button>
            <button onClick={handleLogout} className="glass-card rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-semibold text-[#334155] transition hover:scale-[1.02]" type="button">
              <span className="flex items-center gap-2"><LogOut className="h-4 w-4" />Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-fade-in mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[390px,minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="glass-panel card-hover overflow-hidden rounded-[28px] border border-[#cbd5e1] bg-white shadow-[0_28px_60px_rgba(71,49,27,0.08)]">
            <div className="border-b border-[#dbe4f0] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_100%)] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#dbeafe] p-2 text-[#1E40AF]"><ShieldCheck className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Citizen Profile</h2>
                  <p className="text-sm text-[#7a6454]">Saved details used in drafting.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-5 text-sm">
              <div className="rounded-2xl border border-[#dbe4f0] bg-[#ffffff] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Name</p><p className="mt-1 font-bold text-[#111827]">{currentUser.fullName}</p></div>
              <div className="rounded-2xl border border-[#dbe4f0] bg-[#ffffff] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Occupation</p><p className="mt-1 font-bold text-[#111827]">{currentUser.occupation}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#dbe4f0] bg-[#ffffff] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Age</p><p className="mt-1 font-bold text-[#111827]">{currentUser.age}</p></div>
                <div className="rounded-2xl border border-[#dbe4f0] bg-[#ffffff] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Phone</p><p className="mt-1 font-bold text-[#111827]">{currentUser.phoneNumber}</p></div>
              </div>
              <div className="rounded-2xl border border-[#dbe4f0] bg-[#ffffff] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Address</p><p className="mt-1 font-bold text-[#111827]">{currentUser.address}</p></div>
            </div>
          </section>

          <section className="glass-panel card-hover overflow-hidden rounded-[28px] border border-[#cbd5e1] bg-white shadow-[0_28px_60px_rgba(71,49,27,0.08)]">
            <div className="border-b border-[#dbe4f0] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_100%)] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#dbeafe] p-2 text-[#1E40AF]"><FileText className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Complaint Support</h2>
                  <p className="text-sm text-[#7a6454]">Start a complaint or speak your issue directly.</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <button id="startComplaintBtn" onClick={handleStartComplaint} disabled={isLoading} className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60" type="button">
                Start Complaint
              </button>
              <div id="complaintSection" className="complaint-section">
                <h2 className="text-lg font-bold text-[#111827]">Write Your Complaint</h2>
                <div className="relative mt-4">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Type your complaint..."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#cbd5e1] bg-[#ffffff] px-5 py-4 pr-16 text-sm shadow-sm outline-none"
                    rows={4}
                  />
                  <button onClick={() => void handleSend()} disabled={!input.trim() || isLoading} className="absolute bottom-3 right-3 rounded-2xl bg-[#2563EB] p-3 text-white disabled:opacity-50" type="button">
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => void handleImproveComplaint()}
                    disabled={!input.trim() || improvingComplaint}
                    className="rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF] disabled:opacity-50"
                    type="button"
                  >
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />{improvingComplaint ? 'Improving...' : 'Improve Complaint'}</span>
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm font-semibold text-[#334155]">
                    <FileText className="h-4 w-4" />
                    Upload Evidence
                    <input type="file" accept="image/*,audio/*" className="hidden" multiple onChange={(event) => void handleEvidenceFiles(event.target.files)} />
                  </label>
                </div>
                {!!evidenceItems.length && (
                  <div className="mt-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1E40AF]">Evidence Builder</p>
                    <div className="mt-3 space-y-2 text-sm text-[#1f2937]">
                      {evidenceItems.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="rounded-xl bg-white px-3 py-2">
                          <span className="font-semibold">{item.label}:</span> {item.detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isLoading && (
                  <div className="glass-card mt-3 flex items-center gap-3 rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3 text-sm text-[#64748b]">
                    <span className="loader" aria-hidden="true" />
                    Generating complaint...
                  </div>
                )}
              </div>
              <div id="complaintOutput" className={cn('complaint-box', !complaintRecord && !complaintPreview && 'hidden')}>
                <h3 className="text-lg font-bold text-[#111827]">Generated Complaint</h3>
                {complaintRecord && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2563EB]">{complaintRecord.category}</span>
                    <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1E40AF]">{complaintRecord.department}</span>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]', complaintRecord.status === 'resolved' ? 'bg-[#eff6ff] text-[#2563EB]' : complaintRecord.status === 'follow-up required' ? 'bg-[#e5edff] text-[#1E40AF]' : 'bg-[#eff6ff] text-[#475569]')}>
                      {complaintRecord.status}
                    </span>
                  </div>
                )}
                <p className="mt-3 text-sm font-semibold text-[#334155]">{complaintRecord ? `This will be sent to: ${complaintRecord.department}` : complaintPreview?.explanation ?? ''}</p>
                <p id="complaintText">{complaintRecord?.text_improved ?? complaintPreview?.content ?? ''}</p>
                {complaintRecord?.evidence_text && (
                  <div className="mt-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1E40AF]">Evidence Section</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#1f2937]">{complaintRecord.evidence_text}</p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button id="editBtn" onClick={handleStartComplaint} className="glass-card rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#334155]" type="button">
                    Edit
                  </button>
                  <button
                    id="downloadBtn"
                    onClick={() => void (complaintPreview ? downloadDocument(complaintPreview) : Promise.resolve())}
                    className="glass-card rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#334155]"
                    type="button"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
              <div className="voice-card mt-5">
                <h2 className="mb-3 text-lg font-bold text-[#111827]">Speak Your Complaint</h2>
                <VoiceToText
                  compact
                  label="Voice Input Complaint"
                  value={input}
                  onTranscriptChange={setInput}
                  placeholder="Speak your complaint in English, Hindi, or Marathi..."
                />
              </div>
            </div>
          </section>

        </aside>

        <HelpAndGuidance helplineGroups={helplineGroups} onHelplinePrefill={handleHelplinePrefill} onGuidedStart={handleGuidedStart}>
          <div className="border-b border-[#dbe4f0] bg-[radial-gradient(circle_at_top_left,#eaf2ff_0%,#f8fbff_52%,#ffffff_100%)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E40AF]">{workspaceMode === 'guidance' ? 'Civic Guidance Assistant' : 'Drafting Studio'}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">
                  {workspaceMode === 'guidance' ? 'Get guidance for your issue' : 'Write with form-aware legal guidance'}
                </h2>
                <p className="mt-2 text-sm text-[#475569]">
                  {workspaceMode === 'guidance'
                    ? 'Ask how to get a certificate, complete a civic process, or approach the right office. JanVaani will organize the answer into documents, steps, office, and tips.'
                    : 'Use your saved details, forms, and helplines together while drafting.'}
                </p>
              </div>
              <div className="flex rounded-2xl border border-[#dbe4f0] bg-white/90 p-1">
                <button
                  onClick={() => setWorkspaceMode('drafting')}
                  className={cn('rounded-2xl px-4 py-2 text-sm font-semibold transition', workspaceMode === 'drafting' ? 'bg-[#2563EB] text-white' : 'text-[#475569]')}
                  type="button"
                >
                  Drafting
                </button>
                <button
                  onClick={() => setWorkspaceMode('guidance')}
                  className={cn('rounded-2xl px-4 py-2 text-sm font-semibold transition', workspaceMode === 'guidance' ? 'bg-[#2563EB] text-white' : 'text-[#475569]')}
                  type="button"
                >
                  Civic Guidance
                </button>
                <button
                  onClick={() => setWorkspaceMode('dashboard')}
                  className={cn('rounded-2xl px-4 py-2 text-sm font-semibold transition', workspaceMode === 'dashboard' ? 'bg-[#2563EB] text-white' : 'text-[#475569]')}
                  type="button"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-13rem)] min-h-[720px] flex-col px-4 py-5 sm:px-6">
            {workspaceMode === 'drafting' ? (
              <>
                <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pr-1">
              <div className="rounded-3xl border border-[#dbe4f0] bg-[#f8fbff] p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#dbeafe] p-2 text-[#1E40AF]"><Info className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">Helplines</h3>
                    <p className="mt-1 text-sm text-[#475569]">Quick reference for electricity, roads, sanitation, utilities, and emergency numbers.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(helplineGroups).slice(0, 4).map(([category, entries]) => (
                    <div key={category} className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{category}</p>
                      {entries.slice(0, 2).map((entry) => (
                        <div key={entry.title} className="mt-2">
                          <p className="text-sm font-bold text-[#111827]">{entry.title}</p>
                          <p className="text-sm font-semibold text-[#2563EB]">{entry.numbers.join(' / ')}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    className={cn('flex flex-col max-w-[92%] sm:max-w-[78%]', msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start')}
                  >
                    <div className={cn('rounded-3xl px-5 py-4 shadow-sm', msg.role === 'user' ? 'rounded-tr-md bg-[#2563EB] text-white' : 'rounded-tl-md border border-[#dbe4f0] bg-[#ffffff] text-[#111827]')}>
                      <p className="text-sm leading-relaxed sm:text-base">{msg.text}</p>
                    </div>

                    {msg.document && (
                      <motion.div
                        initial={{opacity: 0, scale: 0.97}}
                        animate={{opacity: 1, scale: 1}}
                        className="mt-4 w-full overflow-hidden rounded-3xl border border-[#dbe4f0] bg-white shadow-[0_18px_40px_rgba(75,53,33,0.08)]"
                      >
                        <div className="flex items-center justify-between border-b border-[#eee3d7] bg-[#eff6ff] px-5 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#1E40AF]" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#475569]">{msg.document.type}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <button onClick={() => copyToClipboard(msg.document?.content || '', msg.id)} className="flex items-center gap-1.5 text-xs font-bold text-[#334155]" type="button">
                              {copiedId === msg.id ? <><Check className="h-3.5 w-3.5 text-green-600" /> COPIED</> : <><Copy className="h-3.5 w-3.5" /> COPY TEXT</>}
                            </button>
                            <button onClick={() => void downloadDocument(msg.document)} className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB]" type="button">
                              <Download className="h-3.5 w-3.5" />
                              {/[^\x00-\x7F]/.test(msg.document.content) ? 'DOWNLOAD TXT' : 'DOWNLOAD PDF'}
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[440px] overflow-auto p-6">
                          <div className="markdown-body prose prose-sm max-w-none">
                            <ReactMarkdown>{msg.document.content}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {!!msg.suggestions?.length && (
                      <div className="mt-4 w-full rounded-3xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#2563EB]" />
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#475569]">Suggested Reference Files</p>
                        </div>
                        <div className="mt-3 grid gap-3">
                          {msg.suggestions.map((suggestion) => (
                            <div key={`${msg.id}-${suggestion.category}-${suggestion.subject}`} className="flex flex-col gap-2 rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">{suggestion.category}</p>
                                <p className="mt-1 text-sm font-bold text-[#111827]">{suggestion.subject}</p>
                                <p className="mt-1 text-xs text-[#64748b]">
                                  {suggestion.size} • {suggestion.format.toUpperCase()}
                                  {suggestion.note ? ` • ${suggestion.note}` : ''}
                                </p>
                              </div>
                              {suggestion.href ? (
                                <a href={suggestion.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB]">
                                  Open file
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : (
                                <span className="text-xs font-medium text-[#64748b]">Catalogue reference only</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="glass-card flex items-center gap-3 rounded-2xl border border-[#dbe4f0] px-4 py-3 text-sm italic text-[#64748b]"><span className="loader" aria-hidden="true" />JAN-VAANI is drafting your document...</motion.div>}
              {error && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{error}</motion.div>}
            </div>

                <div className="mt-5 border-t border-[#dbe4f0] pt-5">
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] font-medium uppercase tracking-[0.22em] text-[#64748b]">
                    <span className="flex items-center gap-1"><Info className="h-3 w-3" /> AI Generated Drafts</span>
                    <span className="flex items-center gap-1"><Scale className="h-3 w-3" /> Verify before official submission</span>
                  </div>
                </div>
              </>
            ) : workspaceMode === 'guidance' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-[#dbe4f0] bg-[#f8fbff] p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[#dbeafe] p-2 text-[#1E40AF]"><Info className="h-5 w-5" /></div>
                      <div>
                        <h3 className="text-base font-bold text-[#111827]">Guidance Request</h3>
                        <p className="mt-1 text-sm text-[#475569]">Describe the service, certificate, or civic problem you need help with. JAN-VAANI will organize the response for you.</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <textarea
                        value={guidanceQuery}
                        onChange={(event) => setGuidanceQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            void handleGuidanceSubmit();
                          }
                        }}
                        placeholder="Example: How do I get a bonafide certificate?"
                        className="min-h-[124px] w-full rounded-[28px] border border-[#cbd5e1] bg-white px-5 py-4 text-sm shadow-sm outline-none"
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button onClick={() => void handleGuidanceSubmit()} disabled={!guidanceQuery.trim() || guidanceLoading} className="rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF] disabled:opacity-50" type="button">
                        {guidanceLoading ? 'Getting Guidance...' : 'Get Guidance'}
                      </button>
                      <button onClick={() => void handleGuidanceTranslation()} disabled={!guidanceResult || guidanceTranslating} className="rounded-2xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#334155] disabled:opacity-50" type="button">
                        {guidanceTranslating ? 'Translating...' : 'Translate to Hindi'}
                      </button>
                      <button onClick={() => void downloadGuidance()} disabled={!guidanceResult} className="rounded-2xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#334155] disabled:opacity-50" type="button">
                        Download
                      </button>
                    </div>
                    <div className="mt-3">
                      <VoiceToText compact label="Voice Input" value={guidanceQuery} onTranscriptChange={setGuidanceQuery} placeholder="Speak your issue in English, Hindi, or Marathi..." />
                    </div>
                  </div>

                  {guidanceLoading && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="glass-card flex items-center gap-3 rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3 text-sm text-[#64748b]"><span className="loader" aria-hidden="true" />JAN-VAANI is preparing your civic guidance...</motion.div>}
                  {guidanceError && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{guidanceError}</motion.div>}

                  {guidanceResult && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Original Query</p>
                        <p className="mt-3 text-sm leading-relaxed text-[#111827]">{guidanceResult.query}</p>
                      </div>
                      <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Documents Required</p>
                        <ul className="mt-4 space-y-3">
                          {guidanceResult.documents_required.map((item, index) => (
                            <li key={`document-${index}`} className="flex gap-3 text-sm leading-relaxed text-[#111827]">
                              <span className="mt-0.5 text-[#2563EB]">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Steps to Follow</p>
                        <ol className="mt-4 space-y-3">
                          {guidanceResult.steps.map((item, index) => (
                            <li key={`step-${index}`} className="flex gap-3 text-sm leading-relaxed text-[#111827]">
                              <span className="mt-0.5 font-semibold text-[#2563EB]">{index + 1}.</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="rounded-3xl border border-[#dbeafe] bg-[#eff6ff] p-5 shadow-sm lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E40AF]">Where to Go</p>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-[#111827]">{guidanceResult.where_to_go}</p>
                      </div>
                      <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Tips / Notes</p>
                        <ul className="mt-4 space-y-3">
                          {guidanceResult.tips.map((item, index) => (
                            <li key={`tip-${index}`} className="flex gap-3 text-sm leading-relaxed text-[#111827]">
                              <span className="mt-0.5 text-[#2563EB]">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {guidanceHindi && (
                        <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm lg:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Hindi Translation</p>
                          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#111827]">{guidanceHindi}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1">
                <ComplaintDashboard
                  dashboard={complaintDashboard}
                  loading={dashboardLoading}
                  error={dashboardError}
                  onRefresh={() => void refreshComplaintDashboard()}
                  onResolve={(id) => void handleResolveComplaint(id)}
                />
              </div>
            )}
          </div>
        </HelpAndGuidance>
      </main>
      <Chatbot onStartComplaint={handleStartComplaint} />
    </div>
  );
}




