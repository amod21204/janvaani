import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3 } from 'lucide-react';

import Card from '../components/shared/Card';
import Section from '../components/shared/Section';
import { apiUrl, getAuthHeaders } from '../utils/api';

export default function DashboardPage() {
  const [data, setData] = useState({
    total: 0,
    categories: [],
    statuses: [],
    summary: { pending: 0, resolved: 0, followUpRequired: 0 },
    recentComplaints: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(apiUrl('/api/dashboard'), {
          headers: getAuthHeaders(),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load dashboard.');
        }

        if (!ignore) {
          setData(payload);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to load dashboard.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-6 pb-4">
      <Section
        eyebrow="Overview"
        title="My Civic Overview"
        subtitle="A focused summary of your own complaint progress."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <BarChart3 size={18} />
              </div>
              <div>
                <p className="text-sm text-ink-700">Total complaints</p>
                <p className="text-2xl font-bold text-ink-950">{loading ? '...' : data.total}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                <Clock3 size={18} />
              </div>
              <div>
                <p className="text-sm text-ink-700">Pending</p>
                <p className="text-2xl font-bold text-ink-950">{loading ? '...' : data.summary.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-sm text-ink-700">Resolved</p>
                <p className="text-2xl font-bold text-ink-950">{loading ? '...' : data.summary.resolved}</p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <Card className="bg-white">
        <p className="font-display text-lg font-bold text-ink-950">Recent complaints</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentComplaints.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-ink-600">No complaints submitted yet.</div>
          ) : (
            data.recentComplaints.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink-900">#{item.id}</p>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-800">{item.category}</p>
                <p className="mt-1 text-sm text-ink-600">{item.department}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
