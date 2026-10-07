import { Theme } from '@fis/shared';
import { ThemeEntity, ThemeMemberEntity } from '../database/entities';

export function toTheme(entity: ThemeEntity, requestIds: string[]): Theme {
  return Theme.parse({
    id: entity.id,
    name: entity.name,
    summary: entity.summary,
    requestIds,
    provider: entity.provider,
  });
}

export function toThemeMember(themeId: string, featureRequestId: string): ThemeMemberEntity {
  const member = new ThemeMemberEntity();
  member.themeId = themeId;
  member.featureRequestId = featureRequestId;
  return member;
}

export function groupMembersByTheme(members: ThemeMemberEntity[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  members.forEach((member) => {
    const requestIds = grouped.get(member.themeId) ?? [];
    requestIds.push(member.featureRequestId);
    grouped.set(member.themeId, requestIds);
  });
  return grouped;
}
