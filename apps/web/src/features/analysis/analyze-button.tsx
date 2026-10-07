'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { analyzeFeatureRequest, type ApiFailure } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InlineFailure } from '@/components/ui/inline-failure';

type AnalyzeButtonProps = { requestId: string; label: string; variant?: 'primary' | 'secondary' };

export function AnalyzeButton({ requestId, label, variant = 'primary' }: AnalyzeButtonProps) {
  const router = useRouter();
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function analyze(): void {
    setFailure(null);
    startTransition(async () => {
      const result = await analyzeFeatureRequest(requestId);
      if (result.ok) router.refresh();
      else setFailure(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button variant={variant} pending={pending} pendingLabel="Analysing..." onClick={analyze}>
        {label}
      </Button>
      {failure !== null ? <InlineFailure failure={failure} prefix="Analysis failed." /> : null}
    </div>
  );
}
