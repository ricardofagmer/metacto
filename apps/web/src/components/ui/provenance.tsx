import type { Provider } from '@fis/shared';
import { Badge } from './badge';

type ProviderBadgeProps = { provider: Provider; model?: string };

// ADR 0003: a heuristic result must never read as LLM output, so the label always names its origin.
export function providerLabel({ provider, model }: ProviderBadgeProps): string {
  if (provider === 'heuristic') return 'Rule-based (heuristic)';
  return model !== undefined ? `AI - anthropic ${model}` : 'AI - anthropic';
}

export function ProviderBadge({ provider, model }: ProviderBadgeProps) {
  return (
    <Badge tone={provider === 'anthropic' ? 'ai' : 'heuristic'} title="Which engine produced this result">
      {providerLabel({ provider, model })}
    </Badge>
  );
}

export function AiExplainer() {
  return <p className="text-xs text-fg-muted">AI recommends, humans decide. Nothing here changes a request until a person confirms it.</p>;
}

type AiProvenanceProps = ProviderBadgeProps & { promptVersion?: string };

export function AiProvenance({ provider, model, promptVersion }: AiProvenanceProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProviderBadge provider={provider} model={model} />
      {promptVersion !== undefined ? <span className="text-xs text-fg-muted">prompt {promptVersion}</span> : null}
      <AiExplainer />
    </div>
  );
}
