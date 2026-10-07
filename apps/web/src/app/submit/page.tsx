import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { SubmitFlow } from '@/features/submit/submit-flow';

export const metadata: Metadata = { title: 'Submit a request' };

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Submit a feature request"
        description="Tell us what you need. We look for similar requests after you submit and summarise the underlying need."
      />
      <SubmitFlow />
    </div>
  );
}
