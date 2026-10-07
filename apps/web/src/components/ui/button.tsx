import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  danger: 'border border-danger bg-surface text-danger hover:bg-danger-soft',
};

export function buttonClassName(variant: ButtonVariant = 'primary'): string {
  return `${BASE} ${VARIANTS[variant]}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  pending?: boolean;
  pendingLabel?: string;
};

export function Button({ variant = 'primary', pending = false, pendingLabel, className, children, disabled, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={`${buttonClassName(variant)} ${className ?? ''}`}
      disabled={disabled === true || pending}
      aria-busy={pending}
      {...rest}
    >
      {pending && pendingLabel !== undefined ? pendingLabel : children}
    </button>
  );
}

type ButtonLinkProps = { href: string; variant?: ButtonVariant; children: ReactNode };

export function ButtonLink({ href, variant = 'primary', children }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClassName(variant)}>
      {children}
    </Link>
  );
}
