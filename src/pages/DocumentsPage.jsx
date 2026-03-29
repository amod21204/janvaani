import { Check, FileBadge2, FolderOpen, Upload, WalletCards } from 'lucide-react';

import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import Section from '../components/shared/Section';
import { uploadedDocuments } from '../data/mockData';

export default function DocumentsPage() {
  const featured = uploadedDocuments[0];

  return (
    <div className="space-y-6 pb-4">
      <Section
        eyebrow="Document Hub"
        title="Your smart document brain"
        subtitle="Upload once, extract key fields, and reuse verified files across every flow."
      >
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <Card className="bg-[linear-gradient(160deg,rgba(30,64,175,0.95),rgba(37,99,235,0.9),rgba(147,197,253,0.88))] text-white">
              <div className="rounded-[30px] border border-dashed border-white/40 bg-white/12 p-8 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white/12">
                  <Upload size={26} />
                </div>
                <p className="mt-5 font-display text-2xl font-bold">Drop or upload a document</p>
                <p className="mt-2 text-sm leading-6 text-white/76">
                  Aadhaar, bills, licences, certificates, and application PDFs are all supported.
                </p>
                <Button variant="secondary" className="mt-6 bg-white text-ink-950">
                  Upload file
                </Button>
              </div>
            </Card>

            <Card className="bg-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <FileBadge2 size={20} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-ink-950">Extracted fields</p>
                  <p className="text-sm text-ink-700">Auto-read from your latest document for faster reuse.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(featured.fields).map(([key, value]) => (
                  <div key={key} className="rounded-[22px] bg-surface-2/90 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-600">{key}</p>
                    <p className="mt-2 font-semibold text-ink-950">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="bg-white">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <FolderOpen size={20} />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-ink-950">Uploaded documents</p>
                <p className="text-sm text-ink-700">A reusable wallet optimized for everyday civic tasks.</p>
              </div>
            </div>

            <div className="space-y-4">
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc.name}
                  className="rounded-[26px] border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,1),rgba(239,246,255,0.95))] p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-[0_10px_20px_rgba(15,27,52,0.06)]">
                          <WalletCards size={18} />
                        </div>
                        <div>
                          <p className="font-display text-lg font-bold text-ink-950">{doc.name}</p>
                          <p className="text-sm text-ink-700">{doc.type}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-ink-700">{doc.updated}</p>
                    </div>

                    <Button variant="secondary">Use this document</Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {Object.entries(doc.fields).map(([key, value]) => (
                      <div key={key} className="rounded-[20px] bg-white/90 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-600">
                          <Check size={12} className="text-success-500" />
                          {key}
                        </div>
                        <p className="text-sm font-semibold text-ink-900">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}
