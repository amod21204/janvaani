import {
  Bot,
  LayoutGrid,
  MessageSquareWarning,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { cn } from '../../utils/cn';
import { apiUrl, getAuthHeaders, getStoredToken } from '../../utils/api';

const navItems = [
  { to: '/', label: 'Home', icon: LayoutGrid },
  { to: '/services', label: 'Services', icon: ShieldCheck },
  { to: '/assistant', label: 'Assistant', icon: Bot },
  { to: '/complaint', label: 'Complaints', icon: MessageSquareWarning },
];

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState(null);
  const searchableItems = useMemo(
    () => [
      ...navItems,
      { to: '/services', label: 'Income Certificate', icon: ShieldCheck },
      { to: '/complaint', label: 'Police Complaint', icon: MessageSquareWarning },
      { to: '/assistant', label: 'Voice Assistant', icon: Bot },
    ],
    [],
  );
  const filteredResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return searchableItems.filter((item) => item.label.toLowerCase().includes(normalized)).slice(0, 5);
  }, [query, searchableItems]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }

    let ignore = false;
    fetch(apiUrl('/api/auth/session'), { headers: getAuthHeaders() })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ignore && ok) {
          setUser(payload.user || null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setUser(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const onSearchSubmit = (event) => {
    event.preventDefault();
    if (filteredResults.length > 0) {
      navigate(filteredResults[0].to);
      setShowResults(false);
      return;
    }

    navigate('/services');
    setShowResults(false);
  };

  const logout = () => {
    window.localStorage.removeItem('janvaani_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.1),_transparent_58%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
        <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 rounded-[32px] border border-slate-200 p-5 shadow-soft lg:flex lg:flex-col">
          <BrandBlock />
          <nav className="mt-8 space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-ink-700 transition hover:bg-white/70',
                    isActive && 'bg-sky-50 text-sky-800 shadow-sm',
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-[28px] bg-gradient-to-br from-sky-500 to-sky-700 p-5 text-white shadow-float">
            <p className="font-display text-lg font-bold">Citizen Workspace</p>
            <p className="mt-2 text-sm text-white/85">
              Keep your most important civic tasks, complaints, and guided help in one place.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="glass-panel sticky top-4 z-20 mb-6 flex items-center gap-3 rounded-[28px] border border-slate-200 px-4 py-3 shadow-soft sm:px-5">
            <form
              onSubmit={onSearchSubmit}
              className="relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
            >
              <Search size={18} className="text-ink-600" />
              <input
                value={query}
                onFocus={() => setShowResults(true)}
                onBlur={() => {
                  // Delay close so click on result can register.
                  window.setTimeout(() => setShowResults(false), 120);
                }}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services, complaints, and help"
                className="w-full bg-transparent text-sm text-ink-700 outline-none placeholder:text-ink-600"
              />
              {showResults && filteredResults.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                  {filteredResults.map((item) => (
                    <button
                      key={`${item.to}-${item.label}`}
                      type="button"
                      onClick={() => {
                        navigate(item.to);
                        setQuery(item.label);
                        setShowResults(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-700 transition hover:bg-sky-50"
                    >
                      <item.icon size={14} className="text-sky-700" />
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </form>
            {user ? (
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
              >
                Login
              </button>
            )}
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>

      <nav className="glass-panel fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-[28px] border border-slate-200 px-2 py-2 shadow-soft lg:hidden">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold text-ink-600 transition',
                isActive && 'bg-sky-50 text-sky-800 shadow-sm',
              )
            }
          >
            <Icon size={18} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function BrandBlock() {
  return (
    <div className="rounded-[28px] bg-gradient-to-br from-sky-500 to-sky-700 p-5 text-white shadow-float">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/18 backdrop-blur">
          <span className="font-display text-lg font-bold">JV</span>
        </div>
        <div>
          <p className="font-display text-xl font-bold">JAN-VAANI</p>
          <p className="text-sm text-white/80">AI Civic Copilot</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-white/85">
        A focused civic workspace for services, complaints, and guided support.
      </p>
    </div>
  );
}
