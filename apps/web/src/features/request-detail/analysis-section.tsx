import type { Analysis } from '@fis/shared';
import { Card, SectionHeading } from '@/components/ui/card';
import { AiProvenance } from '@/components/ui/provenance';
import { EmptyState } from '@/components/ui/states';
import { formatDate } from '@/lib/labels';
import { AnalyzeButton } from '@/features/analysis/analyze-button';
import { PriorityBreakdown } from '@/features/analysis/priority-breakdown';
import { DuplicateList } from './related-list';

type AnalysisSectionProps = { requestId: string; analysis: Analysis | null; titles: Map<string, string> };

export function AnalysisSection({ requestId, analysis, titles }: AnalysisSectionProps) {
  if (analysis === null) {
    return (
      <EmptyState
        title="Not analysed yet"
        description="Run the analysis to extract the underlying need, find likely duplicates and recommend a priority."
        action={<AnalyzeButton requestId={requestId} label="Analyse this request" />}
      />
    );
  }
  return (
    <div className="space-y-5">
      <Card as="section">
        <SectionHeading aside={<AnalyzeButton requestId={requestId} label="Re-run analysis" variant="secondary" />}>Analysis</SectionHeading>
        <AiProvenance provider={analysis.provider} model={analysis.model} promptVersion={analysis.promptVersion} />
        <p className="mt-1 text-xs text-fg-muted">
          Produced <time dateTime={analysis.createdAt}>{formatDate(analysis.createdAt)}</time>
        </p>
        <h3 className="mt-4 text-sm font-semibold text-fg">Underlying need</h3>
        <p className="mt-1 text-sm text-fg">{analysis.underlyingNeed}</p>
      </Card>
      <Card as="section">
        <SectionHeading>Recommended priority</SectionHeading>
        <PriorityBreakdown priority={analysis.priority} />
      </Card>
      <Card as="section">
        <SectionHeading>Possible duplicates</SectionHeading>
        <DuplicateList candidates={analysis.duplicateCandidates} titles={titles} />
      </Card>
    </div>
  );
}
