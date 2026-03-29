import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import {Bar, Doughnut} from 'react-chartjs-2';

import type {ComplaintDashboard as ComplaintDashboardData, ComplaintRecord} from '../types/legal.ts';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function statusTone(status: ComplaintRecord['status']) {
  if (status === 'resolved') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (status === 'follow-up required') {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-slate-100 text-slate-700';
}

interface ComplaintDashboardProps {
  dashboard: ComplaintDashboardData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onResolve: (id: number) => void;
}

export default function ComplaintDashboard({dashboard, loading, error, onRefresh, onResolve}: ComplaintDashboardProps) {
  const categoryLabels = dashboard?.categoryBreakdown.map((item) => item.category) ?? [];
  const categoryValues = dashboard?.categoryBreakdown.map((item) => item.total) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-[#dbe4f0] bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E40AF]">Civic Dashboard</p>
          <h3 className="mt-2 text-2xl font-bold text-[#111827]">Complaint analytics and status tracking</h3>
          <p className="mt-2 text-sm text-[#475569]">Track total complaints, department categories, and follow-up risk in one place.</p>
        </div>
        <button onClick={onRefresh} className="rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF]" type="button">
          Refresh Dashboard
        </button>
      </div>

      {loading && <div className="rounded-3xl border border-[#dbe4f0] bg-white px-5 py-4 text-sm text-[#475569]">Loading complaint dashboard...</div>}
      {error && <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>}

      {dashboard && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total Complaints', dashboard.totalComplaints, 'bg-[#eff6ff] text-[#1E40AF]'],
              ['Pending', dashboard.pendingComplaints, 'bg-[#fef5e7] text-[#1E3A8A]'],
              ['Follow-up Required', dashboard.followUpRequiredComplaints, 'bg-[#fff3e8] text-[#1E40AF]'],
              ['Resolved', dashboard.resolvedComplaints, 'bg-[#edf7ff] text-[#175985]'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className={`rounded-3xl border border-[#dbe4f0] p-5 ${tone}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
                <p className="mt-3 text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
            <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Complaints By Category</p>
              <div className="mt-4 h-[320px]">
                <Bar
                  data={{
                    labels: categoryLabels,
                    datasets: [
                      {
                        label: 'Complaints',
                        data: categoryValues,
                        backgroundColor: ['#2563EB', '#60a5fa', '#f59e0b', '#ef4444', '#8b5cf6'],
                        borderRadius: 10,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {legend: {display: false}},
                  }}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Pending Vs Resolved</p>
              <div className="mt-4 h-[320px]">
                <Doughnut
                  data={{
                    labels: ['Pending', 'Follow-up Required', 'Resolved'],
                    datasets: [
                      {
                        data: [dashboard.pendingComplaints, dashboard.followUpRequiredComplaints, dashboard.resolvedComplaints],
                        backgroundColor: ['#f59e0b', '#fb923c', '#2563EB'],
                      },
                    ],
                  }}
                  options={{maintainAspectRatio: false}}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Recent Complaints</p>
            <div className="mt-4 space-y-4">
              {dashboard.recentComplaints.length ? (
                dashboard.recentComplaints.map((complaint) => (
                  <div key={complaint.id} className="rounded-2xl border border-[#e5edff] bg-[#ffffff] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#1f2f22]">{complaint.department}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#6f8773]">{complaint.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusTone(complaint.status)}`}>{complaint.status}</span>
                        {complaint.status !== 'resolved' && (
                          <button onClick={() => onResolve(complaint.id)} className="rounded-xl border border-[#bfdbfe] px-3 py-2 text-xs font-semibold text-[#2563EB]" type="button">
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#1f2937]">{complaint.text_improved}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#dbe4f0] px-4 py-5 text-sm text-[#64748b]">No complaints saved yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

