import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { HealthStatus, HealthStatusFallback } from '@/components/layout/health-status';
import { NavLinks } from '@/components/layout/nav-links';
import { PmModeToggle } from '@/features/pm-mode/pm-mode-toggle';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Feature Intelligence', template: '%s | Feature Intelligence' },
  description: 'Collect, deduplicate, cluster and prioritise feature requests with AI assistance and human decisions.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/" className="text-base font-bold tracking-tight text-fg">
                Feature Intelligence
              </Link>
              <NavLinks />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Suspense fallback={<HealthStatusFallback />}>
                <HealthStatus />
              </Suspense>
              <PmModeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
