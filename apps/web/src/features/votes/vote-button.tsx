'use client';

import { useState, useTransition } from 'react';
import { addVote, removeVote, type ApiFailure } from '@/lib/api';
import { isConflict } from '@/lib/failure';
import { InlineFailure } from '@/components/ui/inline-failure';
import { getVoterKey, rememberVote, useHasVoted } from './voter-key';

type VoteButtonProps = { requestId: string; voteCount: number; title: string; disabled?: boolean };

const NOT_FOUND_CODE = 'not_found';

export function VoteButton({ requestId, voteCount, title, disabled = false }: VoteButtonProps) {
  const voted = useHasVoted(requestId);
  const [countOverride, setCountOverride] = useState<number | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const count = countOverride ?? voteCount;

  function toggleVote(): void {
    setFailure(null);
    startTransition(async () => {
      const body = { voterKey: getVoterKey() };
      const result = voted ? await removeVote(requestId, body) : await addVote(requestId, body);
      if (result.ok) {
        setCountOverride(result.data.voteCount);
        rememberVote(requestId, !voted);
        return;
      }
      // The server is the source of truth: re-sync local memory when it disagrees.
      if (!voted && isConflict(result.error)) {
        rememberVote(requestId, true);
        return;
      }
      if (voted && result.error.kind === 'envelope' && result.error.envelope.code === NOT_FOUND_CODE) {
        rememberVote(requestId, false);
        return;
      }
      setFailure(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggleVote}
        disabled={pending || disabled}
        aria-pressed={voted}
        aria-label={`${voted ? 'Remove your vote for' : 'Vote for'} "${title}". ${count} ${count === 1 ? 'vote' : 'votes'}.`}
        className={`inline-flex min-w-16 flex-col items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          voted ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-fg hover:bg-surface-muted'
        }`}
      >
        <span aria-hidden="true" className="text-xs font-medium">
          {voted ? 'Voted' : 'Vote'}
        </span>
        <span aria-hidden="true" className="text-lg leading-tight">
          {count}
        </span>
      </button>
      {failure !== null ? <InlineFailure failure={failure} prefix="Vote failed." /> : null}
    </div>
  );
}
