import { SkeletonList } from '@/components/ui/states';

export default function Loading() {
  return <SkeletonList rows={4} label="Loading feature requests" />;
}
