import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { trackEvent } from '@/lib/api';

type Search = { return?: string; error?: string };

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    return: typeof search.return === 'string' ? search.return : '/',
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { return: returnUrl, error } = Route.useSearch();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    trackEvent('login_page_view', { returnUrl });
  }, [returnUrl]);

  async function github() {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: 'github', callbackURL: returnUrl || '/' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast(data.error || 'GitHub sign-in failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!otpSent) {
        const res = await fetch('/api/auth/email-otp/send-verification-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, type: 'sign-in' }),
        });
        if (res.ok) {
          setOtpSent(true);
          toast('Code sent — check your email', 'success');
        } else {
          toast('Could not send code', 'error');
        }
        return;
      }
      const res = await fetch('/api/auth/sign-in/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });
      if (res.ok) window.location.href = returnUrl || '/';
      else toast('Invalid code', 'error');
    } finally {
      setBusy(false);
    }
  }

  const errors: Record<string, string> = {
    ownership: 'You do not have permission to modify this resource.',
    session: 'Your session expired. Sign in again.',
    forbidden: 'You are not authorized to do that.',
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Welcome back" description="Sign in to manage configs, skills, and API keys." />
      <Card>
        {error ? (
          <p className="mb-4 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">
            {errors[error] || 'Something went wrong.'}
          </p>
        ) : null}
        <Button className="w-full bg-[#24292e] text-white hover:brightness-110" onClick={github} disabled={busy}>
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.79 8.21 11.37.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
          </svg>
          Continue with GitHub
        </Button>
        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-mist">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>
        <form className="space-y-4" onSubmit={submitEmail}>
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} readOnly={otpSent} />
          </Field>
          {otpSent ? (
            <Field label="Verification code">
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="text-center tracking-[0.4em]" />
            </Field>
          ) : null}
          <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
            {otpSent ? 'Verify code' : 'Send code'}
          </Button>
        </form>
      </Card>
      <div className="mt-6 text-center">
        <ButtonLink href="/" variant="ghost">
          Back home
        </ButtonLink>
      </div>
    </div>
  );
}
