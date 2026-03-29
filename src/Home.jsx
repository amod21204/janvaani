import { ArrowRight, AudioLines, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import Navbar from './components/Navbar';

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-0 text-ink-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(30,64,175,0.1),transparent_34%)]" />

      <Navbar />

      <main className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <section className="w-full max-w-4xl rounded-[32px] border border-slate-200 bg-white px-6 py-10 text-center shadow-md sm:px-10 sm:py-14 lg:px-14">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            <ShieldCheck size={14} />
            Built for everyday civic life
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Your AI Civic Assistant for Everyday Life
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-ink-700 sm:text-lg">
            Apply, track, and solve government tasks effortlessly with simple guided workflows.
          </p>

          <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row">
            <input
              type="text"
              placeholder="Ask anything (e.g. how to apply for income certificate)"
              className="h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-ink-900 outline-none placeholder:text-ink-600 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
            <Link
              to="/services"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Ask JAN-VAANI
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/complaint"
              className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-sky-500 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Start Your Complaint
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/assistant"
              className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-ink-800 transition hover:bg-sky-50"
            >
              <AudioLines size={18} />
              Use Voice Assistant
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
