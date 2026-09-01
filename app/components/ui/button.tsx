import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary:
    'bg-gradient-to-r from-cyan to-violet text-ink shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:brightness-110',
  secondary:
    'bg-ink-4 text-snow border border-line hover:border-line-strong hover:bg-ink-3',
  ghost: 'text-fog hover:text-snow hover:bg-ink-4',
  danger: 'bg-rose/90 text-ink hover:bg-rose',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
