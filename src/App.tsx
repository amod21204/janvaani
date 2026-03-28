import {useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Info,
  Languages,
  Loader2,
  LogOut,
  Phone,
  Scale,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import {HELPLINE_ENTRIES} from './data/helplines.ts';
import {cn} from './lib/utils.ts';
import VoiceToText from './components/VoiceToText.tsx';
import HelpAndGuidance from './components/HelpAndGuidance.jsx';
import type {AuthUser, LoginResult, SignupPayload} from './services/auth.ts';
import {login, restoreSession, signup, verifyOtp} from './services/auth.ts';
import {generateLegalDocument} from './services/gemini.ts';
import {getCivicGuidance, translateGuidanceToHindi} from './services/guidance.ts';
import type {CivicGuidanceResult, FormSuggestion, GeneratedDocument} from './types/legal.ts';

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
  const [workspaceMode, setWorkspaceMode] = useState<'drafting' | 'guidance'>('drafting');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginForm, setLoginForm] = useState({...emptyProfile});
  const [signupForm, setSignupForm] = useState({...emptyProfile});
  const [otpState, setOtpState] = useState<LoginResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff0e3_0%,#f6efe6_42%,#ece3d5_100%)] px-4 py-8 text-[#2E2A26] sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-[32px] border border-[#decfbe] bg-[linear-gradient(135deg,#fff7ef_0%,#fffdf9_100%)] p-8 shadow-[0_28px_60px_rgba(71,49,27,0.08)]">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-[#a6481f] p-3 text-white">
                <Scale className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b765f]">Citizen Access Portal</p>
                <h1 className="text-3xl font-bold text-[#261b14]">JAN-VAANI</h1>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-[#eadfce] bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a64]">Drafting</p>
                <p className="mt-2 text-lg font-bold text-[#2b221b]">RTI + Complaints</p>
              </div>
              <div className="rounded-3xl border border-[#eadfce] bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a64]">Citizen Profile</p>
                <p className="mt-2 text-lg font-bold text-[#2b221b]">Name to address</p>
              </div>
              <div className="rounded-3xl border border-[#eadfce] bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a64]">Support</p>
                <p className="mt-2 text-lg font-bold text-[#2b221b]">Forms + Helplines</p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#eadfce] bg-white p-6">
              <h2 className="text-xl font-bold text-[#261d16]">What you can do here</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#faf5ef] p-4">
                  <p className="text-sm font-semibold text-[#3b2d23]">Profile-aware drafts</p>
                  <p className="mt-1 text-sm text-[#775f4d]">Use your saved name, address, age, occupation, and phone details in applications.</p>
                </div>
                <div className="rounded-2xl bg-[#faf5ef] p-4">
                  <p className="text-sm font-semibold text-[#3b2d23]">Complaint support</p>
                  <p className="mt-1 text-sm text-[#775f4d]">Browse official forms and immediate complaint helplines in one place.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#eadfce] bg-[#fffdfa] p-6">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#b14d21]" />
                <h2 className="text-lg font-bold text-[#261d16]">Quick Toll-Free Numbers</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {HELPLINE_ENTRIES.slice(0, 6).map((entry) => (
                  <div key={`${entry.category}-${entry.title}`} className="rounded-2xl border border-[#efe2d4] bg-[#faf6f1] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9f7a62]">{entry.category}</p>
                    <p className="mt-1 text-sm font-bold text-[#2d241d]">{entry.title}</p>
                    <p className="mt-2 text-base font-bold text-[#b14d21]">{entry.numbers.join(' / ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#decfbe] bg-white p-6 shadow-[0_28px_60px_rgba(71,49,27,0.08)] sm:p-8">
            <div className="flex rounded-2xl bg-[#f7efe6] p-1">
              <button onClick={() => { setAuthMode('login'); setAuthError(null); }} className={cn('flex-1 rounded-2xl px-4 py-3 text-sm font-semibold', authMode === 'login' ? 'bg-white text-[#281e17]' : 'text-[#7a6657]')} type="button">Login</button>
              <button onClick={() => { setAuthMode('signup'); setAuthError(null); }} className={cn('flex-1 rounded-2xl px-4 py-3 text-sm font-semibold', authMode === 'signup' ? 'bg-white text-[#281e17]' : 'text-[#7a6657]')} type="button">Sign Up</button>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b765f]">{authMode === 'login' ? 'Welcome back' : 'Create your profile'}</p>
              <h2 className="mt-2 text-2xl font-bold text-[#261d16]">{authMode === 'login' ? 'Access your citizen workspace' : 'Register for JAN-VAANI'}</h2>
            </div>
            {authError && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{authError}</div>}
            {authMode === 'login' ? (
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#46372c]">Email Address</span>
                  <input
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((prev) => ({...prev, email: event.target.value}))}
                    className="w-full rounded-2xl border border-[#d8cfc4] bg-[#fcfaf7] px-4 py-3 outline-none transition focus:border-[#c85e2f] focus:ring-4 focus:ring-[#c85e2f]/10"
                    placeholder="Enter email address"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#46372c]">Password</span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({...prev, password: event.target.value}))}
                    className="w-full rounded-2xl border border-[#d8cfc4] bg-[#fcfaf7] px-4 py-3 outline-none transition focus:border-[#c85e2f] focus:ring-4 focus:ring-[#c85e2f]/10"
                    placeholder="Enter password"
                  />
                </label>
                <button
                  onClick={handleLogin}
                  className="w-full rounded-2xl bg-[#b64d20] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#984119]"
                  type="button"
                >
                  Continue to OTP
                </button>
                {otpState && (
                  <div className="rounded-2xl border border-[#eadfce] bg-[#faf5ef] p-4">
                    <p className="text-sm font-semibold text-[#3b2d23]">OTP Verification</p>
                    <p className="mt-1 text-sm text-[#6f5a4a]">{otpState.message}</p>
                    {otpState.demoOtp && (
                      <p className="mt-2 text-sm font-bold text-[#b14d21]">Demo OTP: {otpState.demoOtp}</p>
                    )}
                    <label className="mt-3 block">
                      <span className="mb-2 block text-sm font-semibold text-[#46372c]">Enter OTP</span>
                      <input
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value)}
                        className="w-full rounded-2xl border border-[#d8cfc4] bg-white px-4 py-3 outline-none transition focus:border-[#c85e2f] focus:ring-4 focus:ring-[#c85e2f]/10"
                        placeholder="6-digit OTP"
                      />
                    </label>
                    <button
                      onClick={handleVerifyOtp}
                      className="mt-3 w-full rounded-2xl border border-[#b64d20] px-4 py-3 text-sm font-semibold text-[#b64d20] transition hover:bg-[#fff0e7]"
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
                    <span className="mb-2 block text-sm font-semibold text-[#46372c]">{label}</span>
                    <input
                      value={signupForm[field as keyof typeof signupForm]}
                      onChange={(event) => setSignupForm((prev) => ({...prev, [field]: event.target.value}))}
                      className="w-full rounded-2xl border border-[#d8cfc4] bg-[#fcfaf7] px-4 py-3 outline-none transition focus:border-[#c85e2f] focus:ring-4 focus:ring-[#c85e2f]/10"
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </label>
                ))}
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-[#46372c]">Address</span>
                  <textarea
                    value={signupForm.address}
                    onChange={(event) => setSignupForm((prev) => ({...prev, address: event.target.value}))}
                    className="min-h-[96px] w-full rounded-2xl border border-[#d8cfc4] bg-[#fcfaf7] px-4 py-3 outline-none transition focus:border-[#c85e2f] focus:ring-4 focus:ring-[#c85e2f]/10"
                    placeholder="Enter full address"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-[#46372c]">Password</span>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) => setSignupForm((prev) => ({...prev, password: event.target.value}))}
                    className="w-full rounded-2xl border border-[#d8cfc4] bg-[#fcfaf7] px-4 py-3 outline-none transition focus:border-[#c85e2f] focus:ring-4 focus:ring-[#c85e2f]/10"
                    placeholder="Create password"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    onClick={handleSignup}
                    className="w-full rounded-2xl bg-[#b64d20] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#984119]"
                    type="button"
                  >
                    Create account
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 rounded-2xl border border-[#eadfce] bg-[#faf5ef] px-4 py-3 text-sm text-[#725f50]">
              Sign in to access drafting, civic guidance, form references, helplines, and voice-assisted support.
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ef_0%,#f4f1ea_48%,#efe7da_100%)] text-[#2E2A26]">
      <header className="border-b border-[#d8cfc4] bg-[#fbf7f1]/90 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#a6481f] p-2.5 text-white">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#251d17]">JAN-VAANI</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6f5b]">Citizen Dashboard</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-[#dfd4c8] bg-white px-4 py-3">
              <div className="rounded-xl bg-[#f3e1d0] p-2 text-[#a6481f]">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-[#2b221b]">{currentUser.fullName}</p>
                <p className="text-[#7a6657]">{currentUser.occupation}</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#d8cfc4] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#6a584b] sm:flex">
              <Languages className="h-3.5 w-3.5" />
              <span>{workspaceMode === 'guidance' ? 'Guidance + Translation + PDF' : 'Profile + Forms + Helplines'}</span>
            </div>
            <button onClick={handleWorkspaceReset} className="rounded-xl border border-[#dfd4c8] bg-white px-3 py-2 text-sm font-semibold text-[#735c4d]" type="button">
              <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />{workspaceMode === 'guidance' ? 'Clear Guidance' : 'Reset'}</span>
            </button>
            <button onClick={handleLogout} className="rounded-xl border border-[#dfd4c8] bg-white px-3 py-2 text-sm font-semibold text-[#735c4d]" type="button">
              <span className="flex items-center gap-2"><LogOut className="h-4 w-4" />Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[390px,minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[#d8cfc4] bg-white shadow-[0_28px_60px_rgba(71,49,27,0.08)]">
            <div className="border-b border-[#ece2d6] bg-[linear-gradient(135deg,#fdf5eb_0%,#fffaf4_100%)] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#f3e1d0] p-2 text-[#a6481f]"><ShieldCheck className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold text-[#281e17]">Citizen Profile</h2>
                  <p className="text-sm text-[#7a6454]">Saved details used in drafting.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-5 text-sm">
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7d67]">Name</p><p className="mt-1 font-bold text-[#2d241d]">{currentUser.fullName}</p></div>
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7d67]">Occupation</p><p className="mt-1 font-bold text-[#2d241d]">{currentUser.occupation}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7d67]">Age</p><p className="mt-1 font-bold text-[#2d241d]">{currentUser.age}</p></div>
                <div className="rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7d67]">Phone</p><p className="mt-1 font-bold text-[#2d241d]">{currentUser.phoneNumber}</p></div>
              </div>
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7d67]">Address</p><p className="mt-1 font-bold text-[#2d241d]">{currentUser.address}</p></div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#d8cfc4] bg-white shadow-[0_28px_60px_rgba(71,49,27,0.08)]">
            <div className="border-b border-[#ece2d6] bg-[linear-gradient(135deg,#fdf5eb_0%,#fffaf4_100%)] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#f3e1d0] p-2 text-[#a6481f]"><FileText className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold text-[#281e17]">Complaint Support</h2>
                  <p className="text-sm text-[#7a6454]">Start a complaint or speak your issue directly.</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <button id="startComplaintBtn" onClick={handleStartComplaint} disabled={isLoading} className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60" type="button">
                Start Complaint
              </button>
              <div id="complaintSection" className="complaint-section">
                <h2 className="text-lg font-bold text-[#281e17]">Write Your Complaint</h2>
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
                    className="min-h-[120px] w-full rounded-[20px] border border-[#dacfc4] bg-[#fcfaf7] px-5 py-4 pr-16 text-sm shadow-sm outline-none"
                    rows={4}
                  />
                  <button onClick={() => void handleSend()} disabled={!input.trim() || isLoading} className="absolute bottom-3 right-3 rounded-2xl bg-[#b64d20] p-3 text-white disabled:opacity-50" type="button">
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                {isLoading && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#8a7465]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating complaint...
                  </div>
                )}
              </div>
              <div id="complaintOutput" className={cn('complaint-box', !complaintPreview && 'hidden')}>
                <h3 className="text-lg font-bold text-[#281e17]">Generated Complaint</h3>
                <p id="complaintText">{complaintPreview?.content ?? ''}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button id="editBtn" onClick={handleStartComplaint} className="rounded-lg border border-[#d8cfc4] bg-white px-4 py-2 text-sm font-semibold text-[#4b3b31]" type="button">
                    Edit
                  </button>
                  <button
                    id="downloadBtn"
                    onClick={() => void (complaintPreview ? downloadDocument(complaintPreview) : Promise.resolve())}
                    className="rounded-lg border border-[#d8cfc4] bg-white px-4 py-2 text-sm font-semibold text-[#4b3b31]"
                    type="button"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
              <div className="voice-card mt-5">
                <h2 className="mb-3 text-lg font-bold text-[#281e17]">Speak Your Complaint</h2>
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
          <div className="border-b border-[#ece2d6] bg-[radial-gradient(circle_at_top_left,#fff2e8_0%,#fffaf5_52%,#ffffff_100%)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#af5427]">{workspaceMode === 'guidance' ? 'Civic Guidance Assistant' : 'Drafting Studio'}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#221912]">
                  {workspaceMode === 'guidance' ? 'Get guidance for your issue' : 'Write with form-aware legal guidance'}
                </h2>
                <p className="mt-2 text-sm text-[#756251]">
                  {workspaceMode === 'guidance'
                    ? 'Ask how to get a certificate, complete a civic process, or approach the right office. JanVaani will organize the answer into documents, steps, office, and tips.'
                    : 'Use your saved details, forms, and helplines together while drafting.'}
                </p>
              </div>
              <div className="flex rounded-2xl border border-[#e6d9cc] bg-white/90 p-1">
                <button
                  onClick={() => setWorkspaceMode('drafting')}
                  className={cn('rounded-2xl px-4 py-2 text-sm font-semibold transition', workspaceMode === 'drafting' ? 'bg-[#b64d20] text-white' : 'text-[#785f4e]')}
                  type="button"
                >
                  Drafting
                </button>
                <button
                  onClick={() => setWorkspaceMode('guidance')}
                  className={cn('rounded-2xl px-4 py-2 text-sm font-semibold transition', workspaceMode === 'guidance' ? 'bg-[#b64d20] text-white' : 'text-[#785f4e]')}
                  type="button"
                >
                  Civic Guidance
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-13rem)] min-h-[720px] flex-col px-4 py-5 sm:px-6">
            {workspaceMode === 'drafting' ? (
              <>
                <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pr-1">
              <div className="rounded-3xl border border-[#efe4d9] bg-[#faf7f2] p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#f3e1d0] p-2 text-[#a6481f]"><Info className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-base font-bold text-[#2b211a]">Helplines</h3>
                    <p className="mt-1 text-sm text-[#796556]">Quick reference for electricity, roads, sanitation, utilities, and emergency numbers.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(helplineGroups).slice(0, 4).map(([category, entries]) => (
                    <div key={category} className="rounded-2xl border border-[#eadfce] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9d7d67]">{category}</p>
                      {entries.slice(0, 2).map((entry) => (
                        <div key={entry.title} className="mt-2">
                          <p className="text-sm font-bold text-[#2d241d]">{entry.title}</p>
                          <p className="text-sm font-semibold text-[#b14d21]">{entry.numbers.join(' / ')}</p>
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
                    <div className={cn('rounded-3xl px-5 py-4 shadow-sm', msg.role === 'user' ? 'rounded-tr-md bg-[#ff5a00] text-white' : 'rounded-tl-md border border-[#e6d9cc] bg-[#fffdfa] text-[#2d241d]')}>
                      <p className="text-sm leading-relaxed sm:text-base">{msg.text}</p>
                    </div>

                    {msg.document && (
                      <motion.div
                        initial={{opacity: 0, scale: 0.97}}
                        animate={{opacity: 1, scale: 1}}
                        className="mt-4 w-full overflow-hidden rounded-3xl border border-[#e8dccf] bg-white shadow-[0_18px_40px_rgba(75,53,33,0.08)]"
                      >
                        <div className="flex items-center justify-between border-b border-[#eee3d7] bg-[#fbf7f2] px-5 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#b34f21]" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c6952]">{msg.document.type}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <button onClick={() => copyToClipboard(msg.document?.content || '', msg.id)} className="flex items-center gap-1.5 text-xs font-bold text-[#6b5646]" type="button">
                              {copiedId === msg.id ? <><Check className="h-3.5 w-3.5 text-green-600" /> COPIED</> : <><Copy className="h-3.5 w-3.5" /> COPY TEXT</>}
                            </button>
                            <button onClick={() => void downloadDocument(msg.document)} className="flex items-center gap-1.5 text-xs font-bold text-[#b14d21]" type="button">
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
                      <div className="mt-4 w-full rounded-3xl border border-[#e7dccf] bg-[#faf6f1] p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#b14d21]" />
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c6952]">Suggested Reference Files</p>
                        </div>
                        <div className="mt-3 grid gap-3">
                          {msg.suggestions.map((suggestion) => (
                            <div key={`${msg.id}-${suggestion.category}-${suggestion.subject}`} className="flex flex-col gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7d67]">{suggestion.category}</p>
                                <p className="mt-1 text-sm font-bold text-[#2d241d]">{suggestion.subject}</p>
                                <p className="mt-1 text-xs text-[#7a6556]">
                                  {suggestion.size} • {suggestion.format.toUpperCase()}
                                  {suggestion.note ? ` • ${suggestion.note}` : ''}
                                </p>
                              </div>
                              {suggestion.href ? (
                                <a href={suggestion.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b14d21]">
                                  Open file
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : (
                                <span className="text-xs font-medium text-[#9a8778]">Catalogue reference only</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex items-center gap-2 text-sm italic text-[#8a7465]"><Loader2 className="h-4 w-4 animate-spin" />JAN-VAANI is drafting your document...</motion.div>}
              {error && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{error}</motion.div>}
            </div>

                <div className="mt-5 border-t border-[#ece2d6] pt-5">
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] font-medium uppercase tracking-[0.22em] text-[#94806f]">
                    <span className="flex items-center gap-1"><Info className="h-3 w-3" /> AI Generated Drafts</span>
                    <span className="flex items-center gap-1"><Scale className="h-3 w-3" /> Verify before official submission</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-[#efe4d9] bg-[#faf7f2] p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[#f3e1d0] p-2 text-[#a6481f]"><Info className="h-5 w-5" /></div>
                      <div>
                        <h3 className="text-base font-bold text-[#2b211a]">Guidance Request</h3>
                        <p className="mt-1 text-sm text-[#796556]">Describe the service, certificate, or civic problem you need help with. JAN-VAANI will organize the response for you.</p>
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
                        className="min-h-[124px] w-full rounded-[28px] border border-[#dacfc4] bg-white px-5 py-4 text-sm shadow-sm outline-none"
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button onClick={() => void handleGuidanceSubmit()} disabled={!guidanceQuery.trim() || guidanceLoading} className="rounded-2xl bg-[#b64d20] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#984119] disabled:opacity-50" type="button">
                        {guidanceLoading ? 'Getting Guidance...' : 'Get Guidance'}
                      </button>
                      <button onClick={() => void handleGuidanceTranslation()} disabled={!guidanceResult || guidanceTranslating} className="rounded-2xl border border-[#d8cfc4] bg-white px-5 py-3 text-sm font-semibold text-[#735c4d] disabled:opacity-50" type="button">
                        {guidanceTranslating ? 'Translating...' : 'Translate to Hindi'}
                      </button>
                      <button onClick={() => void downloadGuidance()} disabled={!guidanceResult} className="rounded-2xl border border-[#d8cfc4] bg-white px-5 py-3 text-sm font-semibold text-[#735c4d] disabled:opacity-50" type="button">
                        Download
                      </button>
                    </div>
                    <div className="mt-3">
                      <VoiceToText compact label="Voice Input" value={guidanceQuery} onTranscriptChange={setGuidanceQuery} placeholder="Speak your issue in English, Hindi, or Marathi..." />
                    </div>
                  </div>

                  {guidanceLoading && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#8a7465]"><Loader2 className="h-4 w-4 animate-spin" />JAN-VAANI is preparing your civic guidance...</motion.div>}
                  {guidanceError && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{guidanceError}</motion.div>}

                  {guidanceResult && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a0795f]">Original Query</p>
                        <p className="mt-3 text-sm leading-relaxed text-[#2d241d]">{guidanceResult.query}</p>
                      </div>
                      <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a0795f]">Documents Required</p>
                        <ul className="mt-4 space-y-3">
                          {guidanceResult.documents_required.map((item, index) => (
                            <li key={`document-${index}`} className="flex gap-3 text-sm leading-relaxed text-[#2d241d]">
                              <span className="mt-0.5 text-[#b14d21]">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a0795f]">Steps to Follow</p>
                        <ol className="mt-4 space-y-3">
                          {guidanceResult.steps.map((item, index) => (
                            <li key={`step-${index}`} className="flex gap-3 text-sm leading-relaxed text-[#2d241d]">
                              <span className="mt-0.5 font-semibold text-[#b14d21]">{index + 1}.</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="rounded-3xl border border-[#f0cdb6] bg-[#fff3ea] p-5 shadow-sm lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9c4f27]">Where to Go</p>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-[#2d241d]">{guidanceResult.where_to_go}</p>
                      </div>
                      <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a0795f]">Tips / Notes</p>
                        <ul className="mt-4 space-y-3">
                          {guidanceResult.tips.map((item, index) => (
                            <li key={`tip-${index}`} className="flex gap-3 text-sm leading-relaxed text-[#2d241d]">
                              <span className="mt-0.5 text-[#b14d21]">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {guidanceHindi && (
                        <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm lg:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a0795f]">Hindi Translation</p>
                          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#2d241d]">{guidanceHindi}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </HelpAndGuidance>
      </main>
    </div>
  );
}
