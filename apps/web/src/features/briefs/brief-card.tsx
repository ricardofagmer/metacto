'use client';

import type { DecisionBrief, StakeholderDraft } from '@fis/shared';
import { Badge } from '@/components/ui/badge';
import { AiProvenance } from '@/components/ui/provenance';
import type { ApiFailure } from '@/lib/api';
import { formatDate } from '@/lib/labels';
import { PmGate } from '@/features/pm-mode/pm-gate';
import { BriefDecisionForm } from './brief-decision-form';
import { StakeholderDrafts } from './stakeholder-drafts';

type BriefCardProps = {
  brief: DecisionBrief;
  initialDrafts: StakeholderDraft[];
  draftsFailure: ApiFailure | null;
  onChange: (brief: DecisionBrief) => void;
};

const STATUS_TONE = { draft: 'warning', approved: 'success', rejected: 'danger' } as const;
const STATUS_TEXT = { draft: 'Awaiting decision', approved: 'Approved', rejected: 'Rejected' } as const;

export function BriefCard(props: BriefCardProps) {
  const { brief } = props;
  return (
    <article aria-label="Decision brief" className="space-y-4 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-fg">Decision brief</h3>
        <Badge tone={STATUS_TONE[brief.status]}>{STATUS_TEXT[brief.status]}</Badge>
      </div>
      <AiProvenance provider={brief.provider} model={brief.model} promptVersion={brief.promptVersion} />
      <div>
        <h4 className="text-sm font-semibold text-fg">Recommendation</h4>
        <p className="mt-1 whitespace-pre-line text-sm text-fg">{brief.recommendation}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <BriefList title="Evidence" items={brief.evidence} />
        <BriefList title="Risks" items={brief.risks} />
        <BriefList title="Open questions" items={brief.openQuestions} />
      </div>
      <DecisionArea {...props} />
    </article>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-fg">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-fg-muted">None listed.</p>
      ) : (
        <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-fg">
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DecisionArea({ brief, initialDrafts, draftsFailure, onChange }: BriefCardProps) {
  if (brief.status === 'draft') {
    return (
      <PmGate offFallback={<p className="text-sm text-fg-muted">Turn on PM mode to approve or reject this brief.</p>}>
        {(actingAs) => <BriefDecisionForm brief={brief} actingAs={actingAs} onDecided={onChange} />}
      </PmGate>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg">
        {STATUS_TEXT[brief.status]} by <span className="font-medium">{brief.decidedBy ?? 'unknown'}</span>
        {brief.decidedAt !== undefined ? (
          <>
            {' '}
            on <time dateTime={brief.decidedAt}>{formatDate(brief.decidedAt)}</time>
          </>
        ) : null}
        {brief.decisionNote !== undefined ? <span className="block text-fg-muted">Note: {brief.decisionNote}</span> : null}
      </p>
      {brief.status === 'approved' ? (
        <PmGate offFallback={<p className="text-sm text-fg-muted">Turn on PM mode to draft stakeholder updates.</p>}>
          {(actingAs) => (
            <StakeholderDrafts briefId={brief.id} actingAs={actingAs} initialDrafts={initialDrafts} loadFailure={draftsFailure} />
          )}
        </PmGate>
      ) : null}
    </div>
  );
}
