import type { ReactNode } from 'react';

type CardProps = { children: ReactNode; className?: string; as?: 'div' | 'article' | 'section' | 'li' };

export function Card({ children, className, as: Element = 'div' }: CardProps) {
  return <Element className={`rounded-card border border-border bg-surface p-4 shadow-sm sm:p-5 ${className ?? ''}`}>{children}</Element>;
}

type SectionHeadingProps = { id?: string; children: ReactNode; aside?: ReactNode };

export function SectionHeading({ id, children, aside }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-base font-semibold text-fg">
        {children}
      </h2>
      {aside}
    </div>
  );
}
