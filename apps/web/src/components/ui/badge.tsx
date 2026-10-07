import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'ai' | 'heuristic';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-fg-muted border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  ai: 'bg-ai-soft text-ai border-transparent',
  heuristic: 'bg-heuristic-soft text-heuristic border-transparent',
};

type BadgeProps = { tone?: BadgeTone; children: ReactNode; title?: string };

export function Badge({ tone = 'neutral', children, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
