import {
  AnalyzeInput,
  AnalyzeOutput,
  ClusterInput,
  ClusterOutput,
  DraftBriefInput,
  DraftBriefOutput,
  DraftStakeholderInput,
  DraftStakeholderOutput,
  FindDuplicatesInput,
  FindDuplicatesOutput,
  IntelligenceService,
  Provider,
  ScorePriorityInput,
  ScorePriorityOutput,
} from '@fis/shared';
import { DailyCallBudget } from './daily-call-budget';

// Routes each call to the paid provider while the daily budget lasts, then to the heuristic. Every output keeps
// the label of the provider that actually produced it, so a degraded answer is never presented as a model answer.
export class BudgetedIntelligence implements IntelligenceService {
  constructor(
    private readonly primary: IntelligenceService,
    private readonly fallback: IntelligenceService,
    private readonly budget: DailyCallBudget,
  ) {}

  get provider(): Provider {
    return this.isMetered() && this.budget.isExhausted() ? this.fallback.provider : this.primary.provider;
  }

  analyze(input: AnalyzeInput): Promise<AnalyzeOutput> {
    return this.select().analyze(input);
  }

  findDuplicates(input: FindDuplicatesInput): Promise<FindDuplicatesOutput> {
    return this.select().findDuplicates(input);
  }

  cluster(input: ClusterInput): Promise<ClusterOutput> {
    return this.select().cluster(input);
  }

  scorePriority(input: ScorePriorityInput): Promise<ScorePriorityOutput> {
    return this.select().scorePriority(input);
  }

  draftBrief(input: DraftBriefInput): Promise<DraftBriefOutput> {
    return this.select().draftBrief(input);
  }

  draftStakeholderMessage(input: DraftStakeholderInput): Promise<DraftStakeholderOutput> {
    return this.select().draftStakeholderMessage(input);
  }

  // With no API key the boot selection already is the heuristic, which costs nothing and is not metered.
  private isMetered(): boolean {
    return this.primary !== this.fallback;
  }

  private select(): IntelligenceService {
    if (!this.isMetered()) {
      return this.primary;
    }
    return this.budget.tryConsume() ? this.primary : this.fallback;
  }
}
