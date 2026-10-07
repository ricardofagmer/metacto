'use client';

import type { Analysis, CreateFeatureRequestResponse, GetFeatureRequestResponse } from '@fis/shared';
import { useState } from 'react';
import { analyzeFeatureRequest, getFeatureRequest } from '@/lib/api';
import { fromResult, type AsyncState } from '@/lib/async-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { UnderlyingNeedPanel } from '@/features/analysis/underlying-need-panel';
import { SimilarPanel } from './similar-panel';
import { SubmitForm } from './submit-form';

type CandidateDetails = Record<string, AsyncState<GetFeatureRequestResponse>>;

export function SubmitFlow() {
  const [submitted, setSubmitted] = useState<CreateFeatureRequestResponse | null>(null);
  const [analysis, setAnalysis] = useState<AsyncState<Analysis>>({ status: 'idle' });
  const [details, setDetails] = useState<CandidateDetails>({});

  async function runAnalysis(requestId: string): Promise<void> {
    setAnalysis({ status: 'loading' });
    setAnalysis(fromResult(await analyzeFeatureRequest(requestId)));
  }

  // Candidates carry ids only; titles are fetched once, bounded by MAX_DUPLICATE_CANDIDATES.
  async function loadCandidateDetails(response: CreateFeatureRequestResponse): Promise<void> {
    const ids = response.duplicateCandidates.map((candidate) => candidate.id);
    setDetails(Object.fromEntries(ids.map((id) => [id, { status: 'loading' }])));
    const results = await Promise.all(
      ids.map(async (id): Promise<[string, AsyncState<GetFeatureRequestResponse>]> => [id, fromResult(await getFeatureRequest(id))]),
    );
    setDetails(Object.fromEntries(results));
  }

  function handleSubmitted(response: CreateFeatureRequestResponse): void {
    setSubmitted(response);
    void runAnalysis(response.request.id);
    void loadCandidateDetails(response);
  }

  if (submitted === null) return <SubmitForm onSubmitted={handleSubmitted} />;

  const requestId = submitted.request.id;
  return (
    <div className="space-y-5">
      <div role="status" className="rounded-card border border-success bg-success-soft p-5">
        <p className="font-semibold text-success">Request submitted</p>
        <p className="mt-1 text-sm text-fg">&quot;{submitted.request.title}&quot; is now open for votes.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href={`/requests/${requestId}`} variant="secondary">
            View your request
          </ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Back to Discover
          </ButtonLink>
        </div>
      </div>
      <SimilarPanel candidates={submitted.duplicateCandidates} provider={submitted.provider} details={details} />
      <UnderlyingNeedPanel
        state={analysis}
        retry={
          <Button variant="secondary" onClick={() => void runAnalysis(requestId)}>
            Retry analysis
          </Button>
        }
      />
    </div>
  );
}
