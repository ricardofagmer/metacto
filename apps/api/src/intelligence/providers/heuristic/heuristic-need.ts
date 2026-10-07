import { UNDERLYING_NEED_MAX_LENGTH } from '@fis/shared';

export type NeedSource = { title: string; description: string };

const GOAL_PHRASE_MAX_LENGTH = 300;
const LABEL = 'Heuristic extraction (template)';

// Ordered by how directly each pattern states the goal: "so that" names the outcome itself,
// "I want to" often names only the means.
const GOAL_PATTERNS: readonly RegExp[] = [
  /\bso (?:that )?((?:i|we|they|our|my|users?|customers?|the team)\b[^.!?\n]*)/i,
  /\bin order to ([^.!?\n]+)/i,
  /\b(?:because|since) ([^.!?\n]+)/i,
  /\b(?:i|we) (?:want|need|would like) to ([^.!?\n]+)/i,
  /\b(?:helps?|lets?|allows?) (?:us|me|users?|customers?|teams?) (?:to )?([^.!?\n]+)/i,
];

function cleanPhrase(phrase: string): string {
  return phrase.trim().replace(/\s+/g, ' ').replace(/[,;:]+$/, '').slice(0, GOAL_PHRASE_MAX_LENGTH);
}

// Rule-based and honest about it: it quotes the requester's own goal phrase rather than
// inferring a need it cannot see.
export function extractUnderlyingNeed(source: NeedSource): string {
  const text = `${source.description}\n${source.title}`;
  for (const pattern of GOAL_PATTERNS) {
    const phrase = pattern.exec(text)?.[1];
    if (phrase !== undefined && cleanPhrase(phrase).length > 0) {
      return `${LABEL}: the requester's stated goal is "${cleanPhrase(phrase)}".`.slice(0, UNDERLYING_NEED_MAX_LENGTH);
    }
  }
  return `${LABEL}: no explicit goal phrase found; the need is restated from the title "${cleanPhrase(source.title)}".`.slice(
    0,
    UNDERLYING_NEED_MAX_LENGTH,
  );
}
