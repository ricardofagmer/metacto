import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PROMPT_VERSIONS, PromptId } from './prompt-versions';

export type PromptTemplate = {
  id: PromptId;
  version: string;
  system: string;
  task: string;
};

export type TemplateVariables = Record<string, string | number>;

export class PromptFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptFileError';
  }
}

const PROMPT_DIRECTORY_NAME = 'prompts';
// Sentinel file proving a candidate directory is the prompt store and not an unrelated folder.
const SENTINEL_FILE = 'dedupe.md';
const VERSION_LINE = /^version:\s*(\S+)\s*$/m;
const PLACEHOLDER = /\{\{(\w+)\}\}/g;

// Same lookup from src/ (tsx, eval runner) and from a compiled dist/ tree, whichever layout the build uses.
function resolvePromptDirectory(): string {
  const candidates = [
    resolve(__dirname, '..', '..', '..', PROMPT_DIRECTORY_NAME),
    resolve(__dirname, '..', '..', '..', '..', PROMPT_DIRECTORY_NAME),
    resolve(process.cwd(), PROMPT_DIRECTORY_NAME),
  ];
  const found = candidates.find((candidate) => existsSync(join(candidate, SENTINEL_FILE)));
  if (found === undefined) {
    throw new PromptFileError(`prompt directory not found; looked in ${candidates.join(', ')}`);
  }
  return found;
}

function section(markdown: string, heading: string, file: string): string {
  const pattern = new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm');
  const body = pattern.exec(markdown)?.[1]?.trim();
  if (body === undefined || body.length === 0) {
    throw new PromptFileError(`${file} has no "## ${heading}" section`);
  }
  return body;
}

export function loadPrompt(id: PromptId): PromptTemplate {
  const file = join(resolvePromptDirectory(), `${id}.md`);
  const markdown = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const version = VERSION_LINE.exec(markdown)?.[1];
  if (version !== PROMPT_VERSIONS[id]) {
    throw new PromptFileError(`${file} declares version ${version ?? 'none'} but code pins ${PROMPT_VERSIONS[id]}`);
  }
  return { id, version, system: section(markdown, 'System', file), task: section(markdown, 'Task', file) };
}

// Fails on a placeholder with no value, so a renamed variable can never ship an unfilled prompt.
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(PLACEHOLDER, (match: string, name: string) => {
    const value = variables[name];
    if (value === undefined) {
      throw new PromptFileError(`template variable "${name}" has no value`);
    }
    return String(value);
  });
}
