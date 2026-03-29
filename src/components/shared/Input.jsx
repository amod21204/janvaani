import { cn } from '../../utils/cn';

export default function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-600/80 focus:border-sky-500 focus:ring-4 focus:ring-sky-100',
        className,
      )}
      {...props}
    />
  );
}
