import {useMemo, useState} from 'react';
import {Phone, WandSparkles} from 'lucide-react';

import {cn} from '../lib/utils.ts';

const DOCUMENT_TYPES = ['Complaint', 'FIR', 'Certificate', 'RTI', 'Legal Notice'];

const STARTER_SUGGESTIONS = [
  'Police complaint for harassment near bus stand',
  'FIR draft for phone theft incident',
  'Income certificate application guidance',
  'RTI for road repair expenditure details',
  'Legal notice for delayed service delivery',
];

function normalize(value) {
  return value.toLowerCase().trim();
}

export default function HelpAndGuidance({helplineGroups, onHelplinePrefill, onGuidedStart, children}) {
  const [activeTab, setActiveTab] = useState('helpline');
  const [docType, setDocType] = useState('Complaint');
  const [starterQuery, setStarterQuery] = useState('');
  const [decisionQuery, setDecisionQuery] = useState('');

  const dynamicSuggestions = useMemo(() => {
    const query = normalize(starterQuery);
    if (!query) {
      return STARTER_SUGGESTIONS.slice(0, 4);
    }
    return STARTER_SUGGESTIONS.filter((item) => normalize(item).includes(query)).slice(0, 4);
  }, [starterQuery]);

  const helplineList = useMemo(() => {
    return Object.values(helplineGroups).flat();
  }, [helplineGroups]);

  const relatedHelplines = useMemo(() => {
    const query = normalize(starterQuery);
    if (!query) {
      return [];
    }
    if (query.includes('police') || query.includes('fir') || query.includes('harassment') || query.includes('emergency')) {
      return helplineList.filter((entry) => normalize(entry.title).includes('police') || normalize(entry.category).includes('emergency')).slice(0, 3);
    }
    if (query.includes('women')) {
      return helplineList.filter((entry) => normalize(entry.title).includes('women')).slice(0, 3);
    }
    return [];
  }, [helplineList, starterQuery]);

  const recommendation = useMemo(() => {
    const value = normalize(decisionQuery);
    if (!value) {
      return null;
    }
    if (/(emergency|urgent|police|assault|violence|danger|harassment)/.test(value)) {
      return 'Call Helpline';
    }
    return 'Write Complaint with Guidance';
  }, [decisionQuery]);

  return (
    <section className="glass-panel app-slide-up overflow-hidden rounded-[32px] border border-[#d8cfc4] bg-white shadow-[0_28px_60px_rgba(71,49,27,0.08)]">
      <div className="border-b border-[#ece2d6] bg-[radial-gradient(circle_at_top_left,#fff2e8_0%,#fffaf5_52%,#ffffff_100%)] px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E40AF]">Unified Support</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">Get Help & Guided Assistance</h2>
        <p className="mt-2 text-sm text-[#475569]">Switch between helpline calling and guided legal writing in one flow.</p>

        <div className="mt-4 flex rounded-2xl border border-[#dbe4f0] bg-white/90 p-1">
          <button
            onClick={() => setActiveTab('helpline')}
            className={cn('flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition', activeTab === 'helpline' ? 'bg-[#2563EB] text-white' : 'text-[#475569]')}
            type="button"
          >
            Call Helpline
          </button>
          <button
            onClick={() => setActiveTab('guidance')}
            className={cn('flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition', activeTab === 'guidance' ? 'bg-[#2563EB] text-white' : 'text-[#475569]')}
            type="button"
          >
            Write Complaint with Guidance
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="glass-card mb-5 rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Not sure what to do?</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={decisionQuery}
              onChange={(event) => setDecisionQuery(event.target.value)}
              placeholder="Describe your issue briefly..."
              className="w-full rounded-xl border border-[#dacfc4] bg-white px-4 py-2 text-sm outline-none"
            />
            <div className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-semibold text-[#334155]">
              Suggested: {recommendation ?? 'Type your issue'}
            </div>
          </div>
        </div>

        {activeTab === 'helpline' ? (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[#111827]">Toll-Free Help Numbers</h3>
            <p className="text-sm text-[#475569]">Call directly or push a category into complaint drafting.</p>

            {Object.entries(helplineGroups).map(([category, entries]) => (
              <div key={category} className="glass-card card-hover rounded-2xl border border-[#dbe4f0] bg-[#ffffff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{category}</p>
                <div className="mt-3 space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.title} className="glass-card card-hover rounded-2xl border border-[#e5edff] bg-[#f8fbff] p-3">
                      <p className="text-sm font-bold text-[#2d241d]">{entry.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#7b6657]">{entry.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.numbers.map((number) => (
                          <a
                            key={`${entry.title}-${number}`}
                            href={`tel:${number.replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[#d7c9bb] bg-white px-3 py-1 text-xs font-semibold text-[#1E40AF]"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Call {number}
                          </a>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            onHelplinePrefill?.(entry.title);
                            setActiveTab('guidance');
                          }}
                          className="rounded-full border border-[#d7c9bb] bg-white px-3 py-1 text-xs font-semibold text-[#334155]"
                        >
                          Use in Complaint
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="glass-card rounded-2xl border border-[#dbe4f0] bg-[#ffffff] p-4">
              <h3 className="text-base font-bold text-[#111827]">Guided Draft Setup</h3>
              <p className="mt-1 text-sm text-[#475569]">Choose a document type, start with a prompt, and continue in the legal drafting workspace below.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-[220px,minmax(0,1fr)]">
                <label className="text-sm font-semibold text-[#334155]">
                  Document Type
                  <select
                    value={docType}
                    onChange={(event) => setDocType(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#dacfc4] bg-white px-3 py-2 text-sm outline-none"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <div>
                  <label className="text-sm font-semibold text-[#334155]">
                    Describe your issue
                    <input
                      value={starterQuery}
                      onChange={(event) => setStarterQuery(event.target.value)}
                      placeholder="Example: Police complaint for neighborhood harassment"
                      className="mt-2 w-full rounded-xl border border-[#dacfc4] bg-white px-3 py-2 text-sm outline-none"
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dynamicSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setStarterQuery(suggestion)}
                        className="glass-card rounded-full border border-[#cbd5e1] bg-white px-3 py-1 text-xs font-semibold text-[#475569] transition hover:scale-[1.03]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {relatedHelplines.length > 0 ? (
                <div className="mt-4 rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1E40AF]">Suggested Helplines</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {relatedHelplines.map((entry) => (
                      <button
                        key={entry.title}
                        type="button"
                        onClick={() => onHelplinePrefill?.(entry.title)}
                        className="rounded-full border border-[#bfdbfe] bg-white px-3 py-1 text-xs font-semibold text-[#1E40AF]"
                      >
                        {entry.title}: {entry.numbers.join(' / ')}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onGuidedStart?.(starterQuery.trim(), docType)}
                className="btn-glass mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              >
                <WandSparkles className="h-4 w-4" />
                Open Guided Workspace
              </button>
            </div>

            <div>{children}</div>
          </div>
        )}
      </div>
    </section>
  );
}


