import { cn } from '../../utils/cn';

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'glass-panel gradient-border relative overflow-hidden rounded-3xl border border-slate-200 p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-float sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
