import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-snow">
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-snow placeholder:text-mist outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-48 rounded-xl border border-line bg-ink px-3.5 py-2.5 font-mono text-sm text-snow placeholder:text-mist outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-snow outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20',
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-mist">{hint}</p> : null}
    </div>
  );
}
