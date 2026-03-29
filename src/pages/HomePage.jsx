import { ArrowRight, Clock3, Sparkles, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';

import Card from '../components/shared/Card';
import Section from '../components/shared/Section';
import { heroStats, quickActions, reminders, suggestions } from '../data/mockData';

export default function HomePage() {
  return (
    <div className="space-y-6 pb-4">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(30,64,175,0.96),rgba(37,99,235,0.92),rgba(96,165,250,0.9))] p-0 text-white">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
              <Sparkles size={14} />
              Good Morning, Aarav
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                Your daily civic cockpit for services, reminders, and guided action.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
                JAN-VAANI keeps your public-service tasks simple, proactive, and beautifully organized.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-3xl bg-white/16 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-sm text-white/90">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-pattern rounded-[32px] border border-white/30 bg-white/10 p-5">
            <div className="space-y-4 rounded-[28px] bg-white/12 p-5 backdrop-blur-sm">
              <p className="font-display text-lg font-bold">Today's Smart Stack</p>
              <div className="space-y-3">
                <div className="rounded-[22px] bg-white/16 p-4">
                  <p className="text-sm text-white/85">Next suggested task</p>
                  <p className="mt-1 font-semibold">Renew licence documents before 18 April</p>
                </div>
                <div className="rounded-[22px] bg-white/16 p-4">
                  <p className="text-sm text-white/85">Fastest path</p>
                  <p className="mt-1 font-semibold">Use Document Hub to auto-fill your service form</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Section
        eyebrow="Quick Access"
        title="Everything you need, one tap away"
        subtitle="Designed like a premium dashboard with civic workflows that feel fast and reassuring."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ title, description, icon: Icon, href, accent }) => (
            <Link key={title} to={href}>
              <Card className="h-full bg-white">
                <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${accent} p-3 text-white shadow-md`}>
                  <Icon size={22} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-bold text-ink-950">{title}</h3>
                  <p className="text-sm leading-6 text-ink-700">{description}</p>
                </div>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-sky-700">
                  Open flow
                  <ArrowRight size={16} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Section
          eyebrow="Smart Reminders"
          title="Keep deadlines calm, not chaotic"
          subtitle="Bills, documents, and district alerts surfaced in one timeline."
        >
          <div className="space-y-4">
            {reminders.map(({ label, detail, status, tone, icon: Icon }) => (
              <Card key={label} className="bg-white">
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl p-3 ${tone}`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-ink-950">{label}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-700">{detail}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="AI Suggestions"
          title="Personalized nudges that feel useful"
          subtitle="A soft recommendation engine for eligibility, renewals, and prep work."
        >
          <div className="grid gap-4">
            {suggestions.map((item) => (
              <Card key={item.title} className="bg-[linear-gradient(145deg,rgba(255,255,255,1),rgba(239,246,255,0.95))]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-ink-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-700">{item.description}</p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                    {item.badge}
                  </span>
                </div>
              </Card>
            ))}

            <Card className="bg-gradient-to-br from-sky-700 to-sky-500 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/15 p-3">
                  <Clock3 size={20} />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">Daily civic score</p>
                  <p className="text-sm text-white/90">You are ahead on 82% of this month's tasks.</p>
                </div>
              </div>
              <div className="mt-5 rounded-full bg-white/25 p-1">
                <div className="h-3 w-[82%] rounded-full bg-gradient-to-r from-sky-300 to-sky-100" />
              </div>
            </Card>
          </div>
        </Section>
      </div>

      <Card className="bg-[linear-gradient(145deg,rgba(255,255,255,1),rgba(239,246,255,0.95))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <WalletCards size={22} />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-ink-950">Bill center and service wallet</p>
              <p className="mt-1 text-sm text-ink-700">
                Save documents once, reuse them across payments, applications, and complaint flows.
              </p>
            </div>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-700"
          >
            Open Document Hub
            <ArrowRight size={16} />
          </Link>
        </div>
      </Card>
    </div>
  );
}
