import {
  Bolt,
  Clock3,
  Droplets,
  Landmark,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import Input from '../components/shared/Input';
import Section from '../components/shared/Section';
import { serviceSteps } from '../data/mockData';

const coreServices = [
  {
    title: 'Electricity Service',
    description: 'Bill payment help, outage complaint, meter issue, and connection support.',
    icon: Bolt,
    action: 'Open Electricity Flow',
  },
  {
    title: 'Water Service',
    description: 'Water supply complaint, leakage report, tanker request, and billing support.',
    icon: Droplets,
    action: 'Open Water Flow',
  },
  {
    title: 'Complaint Service',
    description: 'File civic complaints with location, category, and status tracking.',
    icon: ShieldAlert,
    action: 'Open Complaint Flow',
  },
];

const helplines = [
  {
    label: 'Electricity Helpline',
    number: '1912',
    detail: 'Power outage and urgent electricity complaints.',
  },
  {
    label: 'Water Helpline',
    number: '1916',
    detail: 'Water supply and pipeline complaints (availability varies by state).',
  },
  {
    label: 'Emergency Complaint Helpline',
    number: '112',
    detail: 'Immediate emergency response support.',
  },
  {
    label: 'Women Helpline',
    number: '1091',
    detail: 'Women safety and emergency support.',
  },
];

export default function ServicesPage() {
  const [serviceNeed, setServiceNeed] = useState('I need help with electricity complaint');

  return (
    <div className="space-y-6 pb-4">
      <Section
        eyebrow="Public Services"
        title="Electricity, Water, Complaints & Helplines"
        subtitle="Choose a service and get guided assistance with quick support numbers in one place."
      >
        <Card className="bg-[linear-gradient(145deg,rgba(255,255,255,1),rgba(239,246,255,0.95))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <p className="mb-3 font-display text-lg font-bold text-ink-950">What service do you need now?</p>
              <Input
                value={serviceNeed}
                onChange={(event) => setServiceNeed(event.target.value)}
                className="h-14 rounded-[24px] text-base"
              />
            </div>
            <Button size="lg" className="lg:self-end">
              Build my flow
            </Button>
          </div>
        </Card>
      </Section>

      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-sky-700 to-sky-500 text-white">
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoStat icon={Clock3} label="Avg response" value="Within 24 hours" />
            <InfoStat icon={Landmark} label="Coverage" value="Utility + civic complaints" />
            <InfoStat icon={MapPin} label="Routing" value="Mapped to nearest office" />
          </div>
        </Card>

        <Card className="bg-white">
          <p className="font-display text-xl font-bold text-ink-950">Available service flows</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coreServices.map(({ title, description, icon: Icon, action }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-sky-700 shadow-sm">
                  <Icon size={18} />
                </div>
                <p className="font-semibold text-ink-900">{title}</p>
                <p className="mt-1 text-sm text-ink-700">{description}</p>
                <button className="mt-3 text-sm font-semibold text-sky-700 hover:text-sky-800">{action}</button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,1))]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
              <PhoneCall size={20} />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink-950">Important helplines</p>
              <p className="text-sm text-ink-700">Quick-call numbers for electricity, water, and emergency complaints.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {helplines.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink-900">{item.label}</p>
                    <p className="mt-1 text-sm text-ink-700">{item.detail}</p>
                  </div>
                  <a
                    href={`tel:${item.number}`}
                    className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Call {item.number}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white">
          <p className="font-display text-xl font-bold text-ink-950">How JAN-VAANI handles it</p>
          <div className="mt-4 space-y-4">
            {serviceSteps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  {index < serviceSteps.length - 1 ? <div className="mt-2 h-full w-px bg-sky-200" /> : null}
                </div>
                <p className="pb-5 pt-1 text-sm leading-6 text-ink-800">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function InfoStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] bg-white/10 p-4">
      <div className="mb-3 inline-flex rounded-2xl bg-white/12 p-2 text-white">
        <Icon size={18} />
      </div>
      <p className="text-sm text-white/80">{label}</p>
      <p className="mt-1 font-semibold leading-6 text-white">{value}</p>
    </div>
  );
}
