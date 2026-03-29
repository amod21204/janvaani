import { Menu, MoveRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Complaints', to: '/complaint' },
  { label: 'Documents', to: '/documents' },
  { label: 'Dashboard', to: '/dashboard' },
];

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md backdrop-blur sm:px-6">
          <Link to="/" className="flex items-center gap-3 text-ink-950">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 font-display text-lg font-bold text-white shadow-md">
              JV
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-wide">JAN-VAANI</p>
              <p className="text-xs text-ink-600">AI Civic Copilot</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm font-semibold text-ink-700 transition hover:text-sky-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:bg-sky-50 sm:inline-flex"
            >
              Login
            </Link>
            <Link
              to="/assistant"
              className="hidden items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 sm:inline-flex"
            >
              Open App
              <MoveRight size={16} />
            </Link>
            <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-ink-700 lg:hidden">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
