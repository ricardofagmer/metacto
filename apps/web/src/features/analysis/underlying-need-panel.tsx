import type { Analysis } from '@fis/shared';
import type { ReactNode } from 'react';
import type { AsyncState } from '@/lib/async-state';
import { AiProvenance } from '@/components/ui/provenance';
import { ErrorState, SkeletonBlock } from '@/components/ui/states';

type UnderlyingNeedPanelProps = { state: AsyncState<Analysis>; retry: ReactNode };

export function UnderlyingNeedPanel({ state, retry }: UnderlyingNeedPanelProps) {
  return (
    <section aria-labelledby="need-heading" aria-busy={state.status === 'loading'} className="rounded-card border border-border bg-surface p-5">
      <h2 id="need-heading" className="text-base font-semibold text-fg">
        Underlying need
      </h2>
      <NeedBody state={state} retry={retry} />
    </section>
  );
}

function NeedBody({ state, retry }: UnderlyingNeedPanelProps) {
  switch (state.status) {
    case 'idle':
      return <p className="mt-2 text-sm text-fg-muted">Analysis has not started.</p>;
    case 'loading':
      return (
        <div role="status" className="mt-3 space-y-2">
          <span className="sr-only">Analysing your request</span>
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      );
    case 'error':
      return (
        <div className="mt-3">
          <ErrorState title="The analysis could not be produced" failure={state.failure} action={retry} />
        </div>
      );
    case 'success':
      return (
        <>
          <p className="mt-2 text-sm text-fg">{state.data.underlyingNeed}</p>
          <div className="mt-3">
            <AiProvenance provider={state.data.provider} model={state.data.model} promptVersion={state.data.promptVersion} />
          </div>
        </>
      );
  }
}
