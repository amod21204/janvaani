import { CheckCircle2, LogIn, MessageSquareWarning, Mic, ShieldAlert, Sparkles, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import Section from '../components/shared/Section';
import Input from '../components/shared/Input';
import { apiUrl, getAuthHeaders, getStoredToken } from '../utils/api';

function getStatusStyles(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('resolved')) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (normalized.includes('follow-up')) {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-sky-100 text-sky-700';
}

function startSpeechCapture(onText, onError) {
  if (typeof window === 'undefined') {
    onError('Voice input not supported in this environment.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('Voice input is not supported in this browser.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript?.trim();
    if (text) {
      onText(text);
    }
  };

  recognition.onerror = () => {
    onError('Voice capture failed. Please allow microphone access and retry.');
  };

  recognition.start();
}

function formatDate(value) {
  if (!value) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ComplaintPage() {
  const [user, setUser] = useState(null);
  const [complaintText, setComplaintText] = useState('');
  const [improvedText, setImprovedText] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [voiceEvidence, setVoiceEvidence] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState({ session: true, submit: false, list: true, improve: false, route: false, evidence: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadSessionAndComplaints() {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setStatuses([]);
      setLoading({ session: false, submit: false, list: false });
      return;
    }

    try {
      const sessionResponse = await fetch(apiUrl('/api/auth/session'), {
        headers: getAuthHeaders(),
      });
      const sessionPayload = await sessionResponse.json();
      if (!sessionResponse.ok) {
        throw new Error(sessionPayload.error || 'Session not found.');
      }

      setUser(sessionPayload.user || null);

      const statusResponse = await fetch(apiUrl('/api/complaints/status'), {
        headers: getAuthHeaders(),
      });
      const statusPayload = await statusResponse.json();
      if (!statusResponse.ok) {
        throw new Error(statusPayload.error || 'Unable to fetch complaints.');
      }

      setStatuses(statusPayload.complaints || []);
      setError('');
    } catch (requestError) {
      window.localStorage.removeItem('janvaani_token');
      setUser(null);
      setStatuses([]);
      setError(requestError instanceof Error ? requestError.message : 'Please login again.');
    } finally {
      setLoading((prev) => ({ ...prev, session: false, list: false }));
    }
  }

  useEffect(() => {
    loadSessionAndComplaints();
  }, []);

  async function improveComplaint() {
    setError('');
    setLoading((prev) => ({ ...prev, improve: true }));

    try {
      const response = await fetch(apiUrl('/api/improve'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ text: complaintText.trim() }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to improve complaint.');
      }

      setImprovedText(payload.improved_text || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to improve complaint.');
    } finally {
      setLoading((prev) => ({ ...prev, improve: false }));
    }
  }

  async function routeComplaint() {
    setError('');
    setLoading((prev) => ({ ...prev, route: true }));

    try {
      const response = await fetch(apiUrl('/api/classify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ text: improvedText.trim() || complaintText.trim() }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to route complaint.');
      }

      setCategory(payload.category || 'general');
      setDepartment(payload.department || 'Civic Support Desk');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to route complaint.');
    } finally {
      setLoading((prev) => ({ ...prev, route: false }));
    }
  }

  async function buildEvidence() {
    setError('');
    setLoading((prev) => ({ ...prev, evidence: true }));

    try {
      const formData = new FormData();
      if (voiceEvidence.trim()) {
        formData.append('voiceText', voiceEvidence.trim());
      }
      if (improvedText.trim() || complaintText.trim()) {
        formData.append('complaintText', improvedText.trim() || complaintText.trim());
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch(apiUrl('/api/evidence'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to build evidence.');
      }

      setEvidenceText(payload.evidence_text || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to build evidence.');
    } finally {
      setLoading((prev) => ({ ...prev, evidence: false }));
    }
  }

  async function submitComplaint() {
    setError('');
    setSuccess('');
    setLoading((prev) => ({ ...prev, submit: true }));

    try {
      const response = await fetch(apiUrl('/api/complaints'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          text_original: complaintText.trim(),
          text_improved: improvedText.trim(),
          category,
          department,
          evidence_text: evidenceText,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to submit complaint.');
      }

      setComplaintText('');
      setImprovedText('');
      setCategory('');
      setDepartment('');
      setVoiceEvidence('');
      setEvidenceText('');
      setImageFile(null);
      setSuccess(`Complaint submitted successfully. ID: ${payload.id}`);
      await loadSessionAndComplaints();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit complaint.');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  }

  if (loading.session) {
    return <div className="pb-4 text-sm text-ink-700">Loading your complaint workspace...</div>;
  }

  if (!user) {
    return (
      <div className="space-y-6 pb-4">
        <Section
          eyebrow="Complaints"
          title="Personal complaint workspace"
          subtitle="Login is required so your complaints stay private to your own account."
        >
          <Card className="max-w-2xl bg-white">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-ink-950">Secure complaint access</p>
                  <p className="text-sm text-ink-700">Each complaint is now tied to the logged-in citizen account.</p>
                </div>
              </div>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

              <Link to="/login" className="inline-flex">
                <Button className="bg-sky-600 hover:bg-sky-700">
                  <LogIn size={16} />
                  Login to continue
                </Button>
              </Link>
            </div>
          </Card>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <Section
        eyebrow="Complaints"
        title="File and track your complaints"
        subtitle="A clean complaint desk with private complaint history, AI optimizer, department routing, and compact evidence support."
      >
        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <Card className="bg-white">
            <div className="space-y-4">
              <div>
                <p className="font-display text-xl font-bold text-ink-950">Write your complaint</p>
                <p className="mt-1 text-sm text-ink-700">
                  Logged in as <span className="font-semibold">{user.name || user.email}</span>
                </p>
              </div>

              <textarea
                className="min-h-40 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                value={complaintText}
                onChange={(event) => setComplaintText(event.target.value)}
                placeholder="Describe your issue clearly. Mention the location and the action you expect."
              />

              <button
                type="button"
                onClick={() => startSpeechCapture((text) => setComplaintText(text), (message) => setError(message))}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-sky-50"
              >
                <Mic size={16} />
                Voice Input
              </button>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Sparkles size={16} />
                  Smart complaint assist
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={improveComplaint} loading={loading.improve} disabled={!complaintText.trim()}>
                    Optimize Text
                  </Button>
                  <Button variant="secondary" onClick={routeComplaint} loading={loading.route} disabled={!(improvedText.trim() || complaintText.trim())}>
                    Suggest Department
                  </Button>
                </div>

                {improvedText ? (
                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-semibold text-ink-800">Optimized complaint</span>
                    <textarea
                      className="min-h-28 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      value={improvedText}
                      onChange={(event) => setImprovedText(event.target.value)}
                    />
                  </label>
                ) : null}

                {department ? (
                  <div className="mt-4 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <p>
                      Suggested department: <span className="font-bold">{department}</span>
                      {category ? <span className="ml-2 text-emerald-700/80">({category})</span> : null}
                    </p>
                    <Input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="Adjust department if needed"
                      className="bg-white"
                    />
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={voiceEvidence}
                    onChange={(event) => setVoiceEvidence(event.target.value)}
                    placeholder="Optional voice evidence transcript"
                  />
                  <button
                    type="button"
                    onClick={() => startSpeechCapture((text) => setVoiceEvidence(text), (message) => setError(message))}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-sky-50"
                  >
                    <Mic size={16} />
                    Capture
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-sky-50">
                    <Upload size={16} />
                    <span>Attach image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
                  </label>
                  {imageFile ? <span className="text-xs text-ink-600">{imageFile.name}</span> : null}
                  <Button variant="secondary" onClick={buildEvidence} loading={loading.evidence}>
                    Build Evidence
                  </Button>
                </div>

                {evidenceText ? (
                  <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-sky-100 bg-white px-4 py-3 text-sm text-ink-800">{evidenceText}</pre>
                ) : null}
              </div>

              <Button className="w-full sm:w-auto" onClick={submitComplaint} loading={loading.submit} disabled={!complaintText.trim()}>
                <MessageSquareWarning size={16} />
                Submit Complaint
              </Button>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-ink-950">My complaint status</p>
                  <p className="text-sm text-ink-700">Only complaints from your own account are shown here.</p>
                </div>
              </div>

              <div className="space-y-4">
                {loading.list ? (
                  <p className="text-sm text-ink-600">Loading complaints...</p>
                ) : statuses.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-ink-700">
                    No complaints yet. Your submitted complaints will appear here with status updates.
                  </div>
                ) : (
                  statuses.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink-900">Complaint #{item.id}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-800">{item.text_original}</p>
                      <p className="mt-2 text-xs font-medium text-sky-700">
                        {item.department || 'Civic Support Desk'}
                      </p>
                      <p className="mt-2 text-xs text-ink-600">{formatDate(item.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="bg-sky-50">
              <p className="font-display text-lg font-bold text-ink-950">Professional and private by default</p>
              <p className="mt-2 text-sm text-ink-700">
                Complaint records are now isolated account-by-account, while optimization, routing, and evidence remain available in one compact flow.
              </p>
            </Card>
          </div>
        </div>
      </Section>
    </div>
  );
}
