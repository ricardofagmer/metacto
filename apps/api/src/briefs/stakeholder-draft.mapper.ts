import { Audience, DraftStakeholderOutput, StakeholderDraft } from '@fis/shared';
import { StakeholderDraftEntity } from '../database/entities';

export function toStakeholderDraft(entity: StakeholderDraftEntity): StakeholderDraft {
  return StakeholderDraft.parse({
    id: entity.id,
    briefId: entity.briefId,
    audience: entity.audience,
    body: entity.body,
    provider: entity.provider,
    model: entity.model ?? undefined,
    promptVersion: entity.promptVersion,
    status: entity.status,
    updatedBy: entity.updatedBy ?? undefined,
    updatedAt: entity.updatedAt,
    createdAt: entity.createdAt,
  });
}

export type NewDraftFields = { id: string; briefId: string; audience: Audience; output: DraftStakeholderOutput; createdAt: string };

// A generated draft is never approved on creation; a human approves it through PATCH /drafts/:id.
export function toNewDraftEntity(fields: NewDraftFields): StakeholderDraftEntity {
  const entity = new StakeholderDraftEntity();
  entity.id = fields.id;
  entity.briefId = fields.briefId;
  entity.audience = fields.audience;
  entity.body = fields.output.body;
  entity.provider = fields.output.provider;
  entity.model = fields.output.model ?? null;
  entity.promptVersion = fields.output.promptVersion;
  entity.status = 'draft';
  entity.updatedBy = null;
  entity.updatedAt = fields.createdAt;
  entity.createdAt = fields.createdAt;
  return entity;
}
