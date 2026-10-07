export type SparseVector = Map<string, number>;

export type VectorDocument = {
  id: string;
  title: string;
  description: string;
};

export type TermVectors = {
  vectors: Map<string, SparseVector>;
  // Most frequent original spelling per stem, so theme names read as words rather than stems.
  displayForms: Map<string, string>;
};

const MIN_TOKEN_LENGTH = 2;
const MIN_STEM_LENGTH = 3;
// Titles are short and dense with intent, so they count twice against verbose descriptions.
const TITLE_WEIGHT = 2;

const STOPWORDS = new Set<string>([
  'a', 'about', 'add', 'also', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
  'can', 'could', 'do', 'does', 'for', 'from', 'get', 'has', 'have', 'having', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'just', 'let', 'like', 'make', 'me', 'more', 'my', 'need',
  'needs', 'new', 'no', 'not', 'of', 'on', 'or', 'our', 'please', 'should', 'so', 'some', 'such',
  'support', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'to', 'too', 'up', 'us', 'use', 'using', 'very', 'via', 'want', 'was', 'way', 'we', 'when',
  'where', 'which', 'while', 'who', 'will', 'with', 'without', 'would', 'you', 'your',
]);

// Small, explicit equivalence table: TF-IDF cannot see synonyms, and these are the product
// vocabulary pairs requesters use interchangeably. Extend only with golden-set evidence.
const SYNONYMS = new Map<string, string>([
  ['signin', 'login'],
  ['logon', 'login'],
  ['2fa', 'mfa'],
  ['twofactor', 'mfa'],
  ['spreadsheet', 'csv'],
  ['excel', 'csv'],
  ['xlsx', 'csv'],
  ['night', 'dark'],
  ['bulk', 'multiple'],
  ['batch', 'multiple'],
]);

const SUFFIX_RULES: ReadonlyArray<{ suffix: string; replacement: string }> = [
  { suffix: 'ies', replacement: 'y' },
  { suffix: 'ing', replacement: '' },
  { suffix: 'ed', replacement: '' },
  { suffix: 'es', replacement: '' },
  { suffix: 's', replacement: '' },
];

// Light suffix stripping, not Porter: enough to fold plurals and verb forms, cheap and predictable.
export function stem(word: string): string {
  if (word.endsWith('ss')) {
    return word;
  }
  for (const rule of SUFFIX_RULES) {
    if (word.endsWith(rule.suffix)) {
      const candidate = word.slice(0, word.length - rule.suffix.length) + rule.replacement;
      if (candidate.length >= MIN_STEM_LENGTH) {
        return candidate;
      }
    }
  }
  return word;
}

export type Token = { stem: string; surface: string };

export function tokenize(text: string): Token[] {
  const normalized = text.toLowerCase().replace(/\btwo[\s-]factor\b/g, 'twofactor').replace(/\bsign[\s-]?in\b/g, 'signin');
  return normalized
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(word))
    .map((word) => {
      const canonical = SYNONYMS.get(word) ?? word;
      return { stem: SYNONYMS.get(stem(canonical)) ?? stem(canonical), surface: word };
    });
}

function documentTokens(document: VectorDocument): Token[] {
  const titleTokens = tokenize(document.title);
  const repeatedTitle = Array.from({ length: TITLE_WEIGHT }, () => titleTokens).flat();
  return [...repeatedTitle, ...tokenize(document.description)];
}

function normalize(vector: SparseVector): SparseVector {
  const norm = Math.sqrt([...vector.values()].reduce((total, value) => total + value * value, 0));
  if (norm === 0) {
    return vector;
  }
  return new Map([...vector.entries()].map(([term, value]) => [term, value / norm]));
}

function countSurfaceForms(tokenLists: Token[][]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  tokenLists.flat().forEach((token) => {
    const forms = counts.get(token.stem) ?? new Map<string, number>();
    forms.set(token.surface, (forms.get(token.surface) ?? 0) + 1);
    counts.set(token.stem, forms);
  });
  const displayForms = new Map<string, string>();
  counts.forEach((forms, termStem) => {
    const [best] = [...forms.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    displayForms.set(termStem, best?.[0] ?? termStem);
  });
  return displayForms;
}

// Unit-length TF-IDF vectors with smoothed IDF, so cosine similarity is a plain dot product.
export function buildTermVectors(documents: VectorDocument[]): TermVectors {
  const tokenLists = documents.map(documentTokens);
  const documentFrequency = new Map<string, number>();
  tokenLists.forEach((tokens) => {
    new Set(tokens.map((token) => token.stem)).forEach((term) => {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    });
  });
  const documentCount = documents.length;
  const vectors = new Map<string, SparseVector>();
  documents.forEach((document, index) => {
    const termFrequency = new Map<string, number>();
    (tokenLists[index] ?? []).forEach((token) => {
      termFrequency.set(token.stem, (termFrequency.get(token.stem) ?? 0) + 1);
    });
    const weighted: SparseVector = new Map();
    termFrequency.forEach((frequency, term) => {
      const inverseFrequency = Math.log((1 + documentCount) / (1 + (documentFrequency.get(term) ?? 0))) + 1;
      weighted.set(term, (1 + Math.log(frequency)) * inverseFrequency);
    });
    vectors.set(document.id, normalize(weighted));
  });
  return { vectors, displayForms: countSurfaceForms(tokenLists) };
}

export function cosineSimilarity(left: SparseVector, right: SparseVector): number {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let dot = 0;
  smaller.forEach((value, term) => {
    dot += value * (larger.get(term) ?? 0);
  });
  return Math.min(1, Math.max(0, dot));
}

export function sharedTerms(left: SparseVector, right: SparseVector, limit: number): string[] {
  return [...left.keys()]
    .filter((term) => right.has(term))
    .sort((first, second) => (right.get(second) ?? 0) * (left.get(second) ?? 0) - (right.get(first) ?? 0) * (left.get(first) ?? 0))
    .slice(0, limit);
}
