import type { ReactNode } from 'react';

type PageHeaderProps = { title: string; description?: string; actions?: ReactNode };

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {description !== undefined ? <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
