import { CheckCircle2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import Input from '../components/shared/Input';
import { apiUrl } from '../utils/api';

const initialForm = {
  name: '',
  email: '',
  password: '',
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('credentials');
  const [form, setForm] = useState(initialForm);
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (mode === 'signup') {
      return Boolean(form.name.trim() && form.email.trim() && form.password.trim());
    }

    return Boolean(form.email.trim() && form.password.trim());
  }, [form, mode]);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetMessages = () => {
    setError('');
    setNotice('');
  };

  async function submitCredentials(event) {
    event.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const signup = await fetch(apiUrl('/api/auth/signup'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
          }),
        });

        const signupData = await signup.json();
        if (!signup.ok) {
          throw new Error(signupData.error || 'Signup failed.');
        }

        setNotice('Account created successfully. Continuing to OTP login...');
      }

      const login = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const loginData = await login.json();
      if (!login.ok) {
        throw new Error(loginData.error || 'Login failed.');
      }

      setChallengeId(loginData.challengeId);
      setDemoOtp(loginData.demoOtp ?? '');
      setStep('otp');
      setNotice(loginData.message || 'OTP sent.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to process request.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      if (data?.token) {
        localStorage.setItem('janvaani_token', data.token);
      }

      setNotice('Login successful. Redirecting to your workspace...');
      window.setTimeout(() => navigate('/services'), 400);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            <ShieldCheck size={14} />
            Secure Access
          </div>
        </div>

        <Card className="mx-auto max-w-2xl bg-white">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="font-display text-3xl font-bold text-ink-950">Citizen Workspace Login</h1>
              <p className="text-sm text-ink-700">Login or create an account, then verify OTP to continue.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setStep('credentials');
                  setOtp('');
                  resetMessages();
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  mode === 'login' ? 'bg-white text-sky-700 shadow-sm' : 'text-ink-700 hover:text-sky-700'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setStep('credentials');
                  setOtp('');
                  resetMessages();
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  mode === 'signup' ? 'bg-white text-sky-700 shadow-sm' : 'text-ink-700 hover:text-sky-700'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            {notice ? <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">{notice}</p> : null}

            {step === 'credentials' ? (
              <form onSubmit={submitCredentials} className="space-y-4">
                {mode === 'signup' ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ink-800">Full Name</span>
                    <Input value={form.name} onChange={updateField('name')} placeholder="Enter full name" />
                  </label>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ink-800">Email</span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={updateField('email')}
                    placeholder="Enter your email"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ink-800">Password</span>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={updateField('password')}
                    placeholder="Enter your password"
                  />
                </label>

                <Button type="submit" className="w-full" loading={loading} disabled={!canSubmit}>
                  {mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />}
                  Continue to OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ink-800">Enter OTP</span>
                  <Input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                  />
                </label>

                {demoOtp ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Demo OTP: <strong>{demoOtp}</strong>
                  </p>
                ) : null}

                <Button type="submit" className="w-full" loading={loading} disabled={otp.length !== 6}>
                  <CheckCircle2 size={16} />
                  Confirm Login
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setOtp('');
                    setDemoOtp('');
                    resetMessages();
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-slate-50"
                >
                  Back to credentials
                </button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
