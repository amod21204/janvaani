import {
  CheckCircle2,
  MapPin,
  Mic,
  ShieldAlert,
  Sparkles,
  Upload,
  WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import Input from '../components/shared/Input';
import Section from '../components/shared/Section';
import { complaintTimeline, similarComplaints } from '../data/mockData';
import { apiUrl } from '../utils/api';

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
  const [originalText, setOriginalText] = useState('There is a large pothole near the metro feeder lane causing traffic and waterlogging.');
  const [improvedText, setImprovedText] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [voiceEvidence, setVoiceEvidence] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [latitude, setLatitude] = useState('12.9716');
  const [longitude, setLongitude] = useState('77.5946');
  const [imageFile, setImageFile] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState({ improve: false, classify: false, evidence: false, submit: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const complaintToUse = useMemo(() => improvedText || originalText, [improvedText, originalText]);

  const fetchStatuses = async () => {
    try {
      const response = await fetch(apiUrl('/api/complaints/status'));
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to fetch complaint statuses.');
      }
      setStatuses(payload.complaints || []);
    } catch {
      setStatuses([]);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const improveComplaint = async () => {
    setError('');
    setSuccess('');
    setLoading((prev) => ({ ...prev, improve: true }));

    try {
      const response = await fetch(apiUrl('/api/improve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to improve complaint.');
      }
      const nextImprovedText = payload.improved_text || '';
      setImprovedText(nextImprovedText);
      if (evidenceText && nextImprovedText && !nextImprovedText.includes('Evidence Section:')) {
        setImprovedText(`${nextImprovedText}\n\n${evidenceText}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to improve complaint.');
    } finally {
      setLoading((prev) => ({ ...prev, improve: false }));
    }
  };

  const classifyComplaint = async (textOverride) => {
    setError('');
    setSuccess('');
    setLoading((prev) => ({ ...prev, classify: true }));

    try {
      const response = await fetch(apiUrl('/api/classify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textOverride || complaintToUse }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to classify complaint.');
      }
      const nextCategory = payload.category || 'civic';
      const nextDepartment = payload.department || 'Municipal Corporation';
      setCategory(nextCategory);
      setDepartment(nextDepartment);
      return { category: nextCategory, department: nextDepartment };
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to classify complaint.');
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, classify: false }));
    }
  };

  const buildEvidence = async () => {
    setError('');
    setSuccess('');
    setLoading((prev) => ({ ...prev, evidence: true }));

    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (voiceEvidence) {
        formData.append('voiceText', voiceEvidence);
      }
      if (complaintToUse) {
        formData.append('complaintText', complaintToUse);
      }

      const response = await fetch(apiUrl('/api/evidence'), {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to generate evidence text.');
      }

      const nextEvidenceText = payload.evidence_text || '';
      setEvidenceText(nextEvidenceText);
      setImprovedText((currentText) => {
        const baseText = currentText || originalText;
        if (!nextEvidenceText) {
          return currentText;
        }

        const withoutOldEvidence = baseText.replace(/\n\nEvidence Section:[\s\S]*$/i, '').trim();
        return `${withoutOldEvidence}\n\n${nextEvidenceText}`.trim();
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to generate evidence text.');
    } finally {
      setLoading((prev) => ({ ...prev, evidence: false }));
    }
  };

  const submitComplaint = async () => {
    setError('');
    setSuccess('');
    setLoading((prev) => ({ ...prev, submit: true }));

    try {
      const routing = category && department ? { category, department } : await classifyComplaint(complaintToUse);
      if (!routing) {
        throw new Error('Unable to determine department.');
      }

      const response = await fetch(apiUrl('/api/complaints'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_original: originalText,
          text_improved: improvedText || complaintToUse,
          category: routing.category,
          department: routing.department,
          evidence_text: evidenceText,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          status: 'pending',
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save complaint.');
      }

      setCategory(payload.category || routing.category);
      setDepartment(payload.department || routing.department);
      setSuccess(`Complaint submitted successfully. ID: ${payload.id}`);
      await fetchStatuses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save complaint.');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <Section
        eyebrow="Smart Complaint"
        title="Raise civic issues with AI support"
        subtitle="Improve complaint language, auto-route departments, attach evidence, and track status."
      >
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="bg-[linear-gradient(145deg,rgba(255,255,255,1),rgba(240,253,244,0.96))]">
            <div className="space-y-4">
              <div>
                <p className="font-display text-xl font-bold text-ink-950">Describe the issue</p>
                <p className="mt-1 text-sm text-ink-700">Use the same text box or voice input, then improve and route it with AI.</p>
              </div>

              <div className="space-y-2">
                <textarea
                  className="min-h-32 w-full rounded-[18px] border border-emerald-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  value={originalText}
                  onChange={(event) => setOriginalText(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => startSpeechCapture((text) => setOriginalText(text), (message) => setError(message))}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-emerald-50"
                >
                  <Mic size={16} />
                  Voice Input
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={improveComplaint}
                  loading={loading.improve}
                  className="bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-300"
                >
                  <WandSparkles size={16} />
                  ✨ Improve Complaint
                </Button>
                <Button variant="secondary" onClick={() => classifyComplaint()} loading={loading.classify} className="ring-emerald-200 hover:bg-emerald-50">
                  Auto Route
                </Button>
              </div>

              {department ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  This will be sent to: <span className="font-bold">{department}</span>
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink-800">Improved complaint</span>
                <textarea
                  className="min-h-32 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  value={improvedText}
                  onChange={(event) => setImprovedText(event.target.value)}
                  placeholder="Improved complaint will appear here..."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ink-800">Category</span>
                  <Input value={category} onChange={(event) => setCategory(event.target.value)} className="focus:border-emerald-500 focus:ring-emerald-100" />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ink-800">Department</span>
                  <Input value={department} onChange={(event) => setDepartment(event.target.value)} className="focus:border-emerald-500 focus:ring-emerald-100" />
                </label>
              </div>

              <div className="rounded-[18px] border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
                  <Upload size={16} />
                  Smart evidence builder
                </div>
                <div className="space-y-3">
                  <Input
                    value={voiceEvidence}
                    onChange={(event) => setVoiceEvidence(event.target.value)}
                    placeholder="Add voice evidence text (or use mic)"
                    className="focus:border-emerald-500 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => startSpeechCapture((text) => setVoiceEvidence(text), (message) => setError(message))}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-emerald-50"
                  >
                    <Mic size={16} />
                    Voice Evidence
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                    className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-700"
                  />
                  <Button variant="secondary" onClick={buildEvidence} loading={loading.evidence} className="ring-emerald-200 hover:bg-emerald-50">
                    Build Evidence
                  </Button>
                  {imageFile ? <p className="text-xs text-ink-600">Attached: {imageFile.name}</p> : null}
                  {evidenceText ? (
                    <pre className="whitespace-pre-wrap rounded-xl bg-emerald-50 px-3 py-3 text-sm text-ink-800">{evidenceText}</pre>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="Latitude" className="focus:border-emerald-500 focus:ring-emerald-100" />
                <Input value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="Longitude" className="focus:border-emerald-500 focus:ring-emerald-100" />
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300 sm:w-auto" onClick={submitComplaint} loading={loading.submit}>
                Submit Complaint
              </Button>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-ink-950">Similar complaints near you</p>
                  <p className="text-sm text-ink-700">Useful signals to confirm urgency and civic pattern.</p>
                </div>
              </div>
              <div className="space-y-3">
                {similarComplaints.map((item) => (
                  <div key={item.title} className="rounded-[22px] bg-surface-2/90 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-900">{item.title}</p>
                        <p className="mt-1 text-sm text-ink-700">{item.location}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-ink-950">Status tracking</p>
                  <p className="text-sm text-ink-700">Pending complaints auto-escalate to follow-up after 3 days.</p>
                </div>
              </div>

              <div className="space-y-4">
                {statuses.length === 0
                  ? complaintTimeline.map((step, index) => (
                      <div key={step.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`grid h-10 w-10 place-items-center rounded-full ${
                              step.active ? 'bg-emerald-500 text-white' : 'bg-surface-2 text-ink-500'
                            }`}
                          >
                            <CheckCircle2 size={18} />
                          </div>
                          {index < complaintTimeline.length - 1 ? <div className="mt-2 h-full w-px bg-surface-2" /> : null}
                        </div>
                        <div className="pb-5">
                          <p className="font-semibold text-ink-900">{step.title}</p>
                          <p className="mt-1 text-sm text-ink-700">{step.time}</p>
                        </div>
                      </div>
                    ))
                  : statuses.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink-900">#{item.id} - {item.category || 'civic'}</p>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-700">{item.department || 'Municipal Corporation'}</p>
                        <p className="mt-1 text-xs text-ink-600">{formatDate(item.created_at)}</p>
                      </div>
                    ))}
              </div>
            </Card>

            <Card className="bg-[linear-gradient(135deg,rgba(236,253,245,1),rgba(209,250,229,0.88))]">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Sparkles size={16} />
                AI civic helper
              </div>
              <p className="mt-2 text-sm text-ink-700">
                Improve, classify, add evidence, and submit in one flow. The dashboard now shows complaint trends and follow-up load.
              </p>
            </Card>
          </div>
        </div>
      </Section>
    </div>
  );
}
