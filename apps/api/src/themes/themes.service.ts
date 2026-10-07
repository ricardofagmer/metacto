import { Inject, Injectable } from '@nestjs/common';
import { ClusterOutput, ClusterResponse, DEFAULT_MAX_THEMES, IntelligenceService, ListThemesResponse, Theme } from '@fis/shared';
import { Clock, IdFactory } from '../common/clock';
import { ConflictError } from '../common/domain-errors';
import { appLogger } from '../common/json-logger';
import { ThemeEntity, ThemeMemberEntity } from '../database/entities';
import { UnitOfWork } from '../database/unit-of-work';
import { FeatureRequestsService } from '../feature-requests/feature-requests.service';
import { BUDGETED_INTELLIGENCE_SERVICE } from '../ai-budget/ai-budget.module';
import { ThemeMembersRepository } from './theme-members.repository';
import { groupMembersByTheme, toTheme, toThemeMember } from './theme.mapper';
import { ThemesRepository } from './themes.repository';

const MIN_REQUESTS_TO_CLUSTER = 2;

type PlannedTheme = { entity: ThemeEntity; members: ThemeMemberEntity[] };

@Injectable()
export class ThemesService {
  constructor(
    private readonly themesRepository: ThemesRepository,
    private readonly themeMembersRepository: ThemeMembersRepository,
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly idFactory: IdFactory,
    @Inject(BUDGETED_INTELLIGENCE_SERVICE) private readonly intelligence: IntelligenceService,
  ) {}

  // Member-less themes (kept only because a brief references them) are hidden.
  async list(): Promise<ListThemesResponse> {
    const membersByTheme = groupMembersByTheme(await this.themeMembersRepository.findAll());
    const themes = await this.themesRepository.findByIds([...membersByTheme.keys()]);
    return { items: themes.map((theme) => toTheme(theme, membersByTheme.get(theme.id) ?? [])) };
  }

  async findVisible(themeId: string): Promise<Theme | null> {
    const theme = await this.themesRepository.findById(themeId);
    if (theme === null) {
      return null;
    }
    const members = await this.themeMembersRepository.findByTheme(themeId);
    if (members.length === 0) {
      return null;
    }
    return toTheme(
      theme,
      members.map((member) => member.featureRequestId),
    );
  }

  // Clustering is an AI artefact, not a decision: it rewrites membership but never request status (ADR 0004).
  async recluster(): Promise<ClusterResponse> {
    const requests = await this.featureRequestsService.loadCorpus();
    if (requests.length < MIN_REQUESTS_TO_CLUSTER) {
      throw new ConflictError(`Clustering needs at least ${MIN_REQUESTS_TO_CLUSTER} non-merged feature requests`);
    }
    const output = await this.intelligence.cluster({ requests, maxThemes: DEFAULT_MAX_THEMES });
    const planned = this.planThemes(
      output,
      new Set(requests.map((request) => request.id)),
    );

    await this.unitOfWork.run(async (scope) => {
      await this.themeMembersRepository.deleteAll(scope);
      await this.featureRequestsService.clearThemeAssignments(scope);
      await this.themesRepository.insertMany(
        planned.map((theme) => theme.entity),
        scope,
      );
      await this.themeMembersRepository.insertMany(
        planned.flatMap((theme) => theme.members),
        scope,
      );
      for (const theme of planned) {
        await this.featureRequestsService.assignTheme(
          theme.members.map((member) => member.featureRequestId),
          theme.entity.id,
          scope,
        );
      }
      await this.themesRepository.deleteUnreferencedExcept(
        planned.map((theme) => theme.entity.id),
        scope,
      );
    });

    appLogger.event('info', 'themes.reclustered', {
      provider: output.provider,
      promptVersion: output.promptVersion,
      themeCount: planned.length,
      requestCount: requests.length,
    });
    return {
      themes: planned.map((theme) =>
        toTheme(
          theme.entity,
          theme.members.map((member) => member.featureRequestId),
        ),
      ),
      provider: output.provider,
    };
  }

  // Model output is untrusted: ids outside the clustered corpus are dropped, and a theme left empty is discarded.
  private planThemes(output: ClusterOutput, corpusIds: Set<string>): PlannedTheme[] {
    const createdAt = this.clock.nowIso();
    return output.themes
      .map((theme) => {
        const entity = new ThemeEntity();
        entity.id = this.idFactory.newId();
        entity.name = theme.name;
        entity.summary = theme.summary;
        entity.provider = theme.provider;
        entity.createdAt = createdAt;
        const members = theme.requestIds
          .filter((requestId) => corpusIds.has(requestId))
          .map((requestId) => toThemeMember(entity.id, requestId));
        return { entity, members };
      })
      .filter((theme) => theme.members.length > 0);
  }
}
