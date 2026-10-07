import { Injectable } from '@nestjs/common';
import { Analysis, BriefSubject, RequestSummary, Theme } from '@fis/shared';
import { NotFoundError } from '../common/domain-errors';
import { AnalysesService } from '../analyses/analyses.service';
import { FeatureRequestsService } from '../feature-requests/feature-requests.service';
import { ThemesService } from '../themes/themes.service';

const THEME_RESOURCE = 'Theme';

export type BriefSubjectContext = {
  requests: RequestSummary[];
  analyses: Analysis[];
  theme?: Theme;
};

// Gathers what a brief or a stakeholder draft is about, shared by both flows.
@Injectable()
export class BriefSubjectLoader {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly analysesService: AnalysesService,
    private readonly themesService: ThemesService,
  ) {}

  async load(subject: BriefSubject): Promise<BriefSubjectContext> {
    if ('themeId' in subject) {
      const theme = await this.themesService.findVisible(subject.themeId);
      if (theme === null) {
        throw new NotFoundError(THEME_RESOURCE, subject.themeId);
      }
      const [requests, analyses] = await Promise.all([
        this.featureRequestsService.findSummariesByIds(theme.requestIds),
        this.analysesService.findForRequests(theme.requestIds),
      ]);
      return { requests, analyses, theme };
    }
    const request = await this.featureRequestsService.requireSummary(subject.featureRequestId);
    const analysis = await this.analysesService.findForRequest(request.id);
    return { requests: [request], analyses: analysis === null ? [] : [analysis] };
  }

  // A theme replaced by re-clustering keeps its brief but may no longer have members; the draft then works from the brief alone.
  async loadRequestsForDraft(subject: BriefSubject): Promise<RequestSummary[]> {
    if ('themeId' in subject) {
      const theme = await this.themesService.findVisible(subject.themeId);
      return theme === null ? [] : this.featureRequestsService.findSummariesByIds(theme.requestIds);
    }
    return [await this.featureRequestsService.requireSummary(subject.featureRequestId)];
  }
}
