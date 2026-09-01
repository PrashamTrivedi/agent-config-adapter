import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';

export const Route = createFileRoute('/auth/logout')({
  component: LogoutPage,
});

function LogoutPage() {
  const navigate = useNavigate();

  async function logout() {
    await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    navigate({ to: '/' });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Sign out" />
      <Card className="text-center">
        <p className="text-fog">Are you sure you want to sign out?</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={logout}>Sign out</Button>
          <ButtonLink href="/" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
