'use client';

import type { DuplicateCandidate, GetFeatureRequestResponse, Provider } from '@fis/shared';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { addVote, type ApiFailure } from '@/lib/api';
import type { AsyncState } from '@/lib/async-state';
import { isConflict } from '@/lib/failure';
import { formatPercent } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { InlineFailure } from '@/components/ui/inline-failure';
import { AiProvenance } from '@/components/ui/provenance';
import { getVoterKey, rememberVote } from '@/features/votes/voter-key';

type Decision = { kind: 'undecided' } | { kind: 'kept' } | { kind: 'supported'; candidateId: string; title: string };

type SimilarPanelProps = {
  candidates: DuplicateCandidate[];
  provider: Provider;
  details: Record<string, AsyncState<GetFeatureRequestResponse>>;
};

function candidateTitle(state: AsyncState<GetFeatureRequestResponse> | undefined): string | null {
  return state?.status === 'success' ? state.data.request.title : null;
}

export function SimilarPanel({ candidates, provider, details }: SimilarPanelProps) {
  const [decision, setDecision] = useState<Decision>({ kind: 'undecided' });
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  if (candidates.length === 0) {
    return (
      <section aria-labelledby="similar-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="similar-heading" className="text-base font-semibold text-fg">
          No similar requests found
        </h2>
        <p className="mt-1 text-sm text-fg-muted">Your request looks new. Others can now find and vote for it.</p>
        <div className="mt-3">
          <AiProvenance provider={provider} />
        </div>
      </section>
    );
  }

  function support(candidateId: string, title: string): void {
    setFailure(null);
    startTransition(async () => {
      const result = await addVote(candidateId, { voterKey: getVoterKey() });
      if (result.ok || isConflict(result.error)) {
        rememberVote(candidateId, true);
        setDecision({ kind: 'supported', candidateId, title });
        return;
      }
      setFailure(result.error);
    });
  }

  return (
    <section aria-labelledby="similar-heading" className="rounded-card border border-warning bg-surface p-5">
      <h2 id="similar-heading" className="text-base font-semibold text-fg">
        These look similar
      </h2>
      <p className="mt-1 text-sm text-fg-muted">Supporting an existing request concentrates votes. Your request stays submitted either way.</p>
      <div className="mt-3">
        <AiProvenance provider={provider} />
      </div>
      <DecisionNotice decision={decision} />
      {decision.kind === 'undecided' ? (
        <>
          <ul className="mt-4 space-y-3">
            {candidates.map((candidate) => {
              const title = candidateTitle(details[candidate.id]);
              return (
                <li key={candidate.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/requests/${candidate.id}`} className="font-medium text-fg hover:underline">
                      {title ?? (details[candidate.id]?.status === 'error' ? 'Request details unavailable' : 'Loading title...')}
                    </Link>
                    <span className="text-sm font-semibold text-fg">{formatPercent(candidate.similarity)} similar</span>
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">{candidate.rationale}</p>
                  <div className="mt-3">
                    <Button variant="secondary" pending={pending} onClick={() => support(candidate.id, title ?? 'the selected request')}>
                      Support this one instead
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {failure !== null ? (
            <div className="mt-3">
              <InlineFailure failure={failure} prefix="Your vote was not recorded." />
            </div>
          ) : null}
          <div className="mt-4">
            <Button variant="ghost" onClick={() => setDecision({ kind: 'kept' })}>
              Keep mine separate
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function DecisionNotice({ decision }: { decision: Decision }) {
  if (decision.kind === 'undecided') return null;
  const message =
    decision.kind === 'kept'
      ? 'Kept separate. A product manager may still merge duplicates during triage.'
      : `Your vote went to "${decision.title}". A product manager can merge your request into it during triage.`;
  return (
    <p role="status" className="mt-4 rounded-lg bg-success-soft p-3 text-sm text-success">
      {message}
    </p>
  );
}
