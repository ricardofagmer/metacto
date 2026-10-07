'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from './button';

// Re-runs the server component fetch for the current route.
export function RetryButton({ label = 'Try again' }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" pending={pending} pendingLabel="Retrying..." onClick={() => startTransition(() => router.refresh())}>
      {label}
    </Button>
  );
}
