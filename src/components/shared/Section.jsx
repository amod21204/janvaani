import { cn } from '../../utils/cn';

export default function Section({ eyebrow, title, subtitle, action, className, children }) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-xl font-bold text-ink-950 sm:text-2xl">{title}</h2>
          {subtitle ? <p className="max-w-2xl text-sm leading-6 text-ink-700">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
