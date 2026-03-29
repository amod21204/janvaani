import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-sky-500 text-white shadow-md hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-lg',
  secondary:
    'bg-white text-ink-900 ring-1 ring-sky-200 shadow-sm hover:bg-sky-50',
  ghost:
    'bg-transparent text-sky-700 hover:bg-sky-50',
};

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  ...props
}) {
  const sizes = {
    sm: 'h-10 rounded-2xl px-4 text-sm',
    md: 'h-11 rounded-2xl px-5 text-sm sm:h-12 sm:px-6',
    lg: 'h-14 rounded-3xl px-7 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300/60 disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" /> : null}
      {children}
    </button>
  );
}
