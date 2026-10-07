import { PRIORITY_MAX, SCORING_WEIGHTS, type PriorityScore, type ScoringCriterion } from '@fis/shared';
import { CRITERION_LABELS, formatPercent } from '@/lib/labels';

const CRITERIA: readonly ScoringCriterion[] = ['reach', 'impact', 'strategicFit', 'effortInverse', 'demand'];

const FULL_WIDTH_PERCENT = 100;

export function PriorityBreakdown({ priority }: { priority: PriorityScore }) {
  return (
    <div>
      <p className="text-sm text-fg-muted">
        Priority score <span className="text-2xl font-bold text-fg">{priority.score}</span> / {PRIORITY_MAX}
      </p>
      <dl className="mt-4 space-y-3">
        {CRITERIA.map((criterion) => {
          const value = priority.breakdown[criterion];
          const widthPercent = (value / PRIORITY_MAX) * FULL_WIDTH_PERCENT;
          return (
            <div key={criterion}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <dt className="font-medium text-fg">
                  {CRITERION_LABELS[criterion]} <span className="font-normal text-fg-muted">(weight {formatPercent(SCORING_WEIGHTS[criterion])})</span>
                </dt>
                <dd className="tabular-nums text-fg">
                  {value} / {PRIORITY_MAX}
                </dd>
              </div>
              <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${widthPercent}%` }} />
              </div>
            </div>
          );
        })}
      </dl>
      <p className="mt-4 whitespace-pre-line text-sm text-fg">{priority.rationale}</p>
    </div>
  );
}
