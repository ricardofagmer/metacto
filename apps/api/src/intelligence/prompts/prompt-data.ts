import { RequestSummary } from '@fis/shared';

export type RequestText = { id: string; title: string; description: string };

export type RequestRefs = {
  refOf: (id: string) => string;
  idOf: (ref: string) => string | undefined;
};

// Corpus entries are context, not the subject, so they are shortened to bound prompt tokens.
export const CORPUS_DESCRIPTION_MAX_LENGTH = 600;
const REF_PREFIX = 'r';

// Escaping angle brackets means request text can never close its own <request> block and
// smuggle text that looks like it sits outside the data region (ADR 0006).
export function escapeData(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Short refs instead of UUIDs: fewer output tokens, and a hallucinated id is easy to reject.
export function buildRequestRefs(ids: readonly string[]): RequestRefs {
  const refById = new Map(ids.map((id, index) => [id, `${REF_PREFIX}${index + 1}`]));
  const idByRef = new Map([...refById.entries()].map(([id, ref]) => [ref, id]));
  return {
    refOf: (id) => refById.get(id) ?? `${REF_PREFIX}?`,
    idOf: (ref) => idByRef.get(ref),
  };
}

export type RequestBlockOptions = {
  ref: string;
  request: RequestText;
  summary?: Pick<RequestSummary, 'voteCount' | 'status'> | undefined;
  descriptionMaxLength?: number | undefined;
};

export function renderRequestBlock(options: RequestBlockOptions): string {
  const maxLength = options.descriptionMaxLength ?? options.request.description.length;
  const description = options.request.description.slice(0, maxLength);
  const truncated = description.length < options.request.description.length ? ' truncated="true"' : '';
  const attributes = options.summary !== undefined ? ` votes="${options.summary.voteCount}" status="${options.summary.status}"` : '';
  return [
    `<request ref="${options.ref}"${attributes}${truncated}>`,
    `<title>${escapeData(options.request.title)}</title>`,
    `<description>${escapeData(description)}</description>`,
    '</request>',
  ].join('\n');
}

export function renderTaggedData(tag: string, text: string): string {
  return `<${tag}>${escapeData(text)}</${tag}>`;
}
