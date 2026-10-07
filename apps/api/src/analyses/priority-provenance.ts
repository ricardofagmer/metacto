import { Provider } from '@fis/shared';

export type PriorityProvenance = {
  score: number;
  provider: Provider;
  model: string | undefined;
};
