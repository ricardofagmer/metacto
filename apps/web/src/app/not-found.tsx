import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page or feature request you are looking for does not exist or was removed."
      action={<ButtonLink href="/">Back to Discover</ButtonLink>}
    />
  );
}
