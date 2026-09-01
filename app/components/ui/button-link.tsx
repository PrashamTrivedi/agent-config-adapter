import { cn } from '@/lib/utils';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

const variants = {
  primary:
    'bg-gradient-to-r from-cyan to-violet text-ink shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:brightness-110',
  secondary:
    'bg-ink-4 text-snow border border-line hover:border-line-strong hover:bg-ink-3',
  ghost: 'text-fog hover:text-snow hover:bg-ink-4',
};

export function ButtonLink({
  className,
  variant = 'primary',
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: keyof typeof variants;
  href: string;
  children: ReactNode;
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition h-10 px-4 text-sm',
    variants[variant],
    className
  );

  const native =
    href.startsWith('http') ||
    href.startsWith('mailto:') ||
    href.startsWith('/api/') ||
    href.includes('/download') ||
    href.includes('/definition') ||
    href.includes('/manifest');

  if (native) {
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={classes}>
      {children}
    </Link>
  );
}
