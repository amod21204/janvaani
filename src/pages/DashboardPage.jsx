import { useEffect, useRef, useState } from 'react';
import { BarChart3, MapPinned } from 'lucide-react';
import { Chart, registerables } from 'chart.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import Card from '../components/shared/Card';
import Section from '../components/shared/Section';
import { apiUrl } from '../utils/api';

Chart.register(...registerables);

export default function DashboardPage() {
  const [data, setData] = useState({
    total: 0,
    categories: [],
    statuses: [],
    summary: { pending: 0, resolved: 0, followUpRequired: 0 },
    mapPoints: [],
    recentComplaints: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(apiUrl('/api/dashboard'));
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

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: data.categories.map((item) => item.category),
        datasets: [
          {
            label: 'Complaints',
            data: data.categories.map((item) => Number(item.count)),
            backgroundColor: '#10B981',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data.categories]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current.removeLayer(layer);
      }
    });

    if (data.mapPoints.length === 0) {
      return;
    }

    const bounds = [];
    data.mapPoints.forEach((point) => {
      const lat = Number(point.latitude);
      const lng = Number(point.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const marker = L.marker([lat, lng]).addTo(mapRef.current);
      marker.bindPopup(`${point.category || 'uncategorized'} (${point.status || 'pending'})`);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [data.mapPoints]);

  return (
    <div className="space-y-6 pb-4">
      <Section
        eyebrow="Analytics"
        title="Civic Heatmap Dashboard"
        subtitle="Track complaint volume, status distribution, and geo-hotspots."
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

          <Card className="bg-white lg:col-span-2">
            <p className="font-display text-lg font-bold text-ink-950">Status breakdown</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.statuses.map((statusRow) => (
                <span
                  key={statusRow.status}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {statusRow.status}: {statusRow.count}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Pending</p>
                <p className="mt-1 text-2xl font-bold text-ink-950">{data.summary.pending}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Resolved</p>
                <p className="mt-1 text-2xl font-bold text-ink-950">{data.summary.resolved}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Follow-up</p>
                <p className="mt-1 text-2xl font-bold text-ink-950">{data.summary.followUpRequired}</p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="bg-white">
          <p className="font-display text-lg font-bold text-ink-950">Category-wise complaints</p>
          <div className="mt-4 h-[280px]">
            <canvas ref={chartRef} />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="mb-3 flex items-center gap-2">
            <MapPinned size={18} className="text-emerald-700" />
            <p className="font-display text-lg font-bold text-ink-950">Heatmap markers</p>
          </div>
          <div ref={mapContainerRef} className="h-[280px] w-full overflow-hidden rounded-xl border border-slate-200" />
        </Card>
      </div>

      <Card className="bg-white">
        <p className="font-display text-lg font-bold text-ink-950">Recent routed complaints</p>
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
