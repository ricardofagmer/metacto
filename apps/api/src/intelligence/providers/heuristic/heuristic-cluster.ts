import { RequestSummary, THEME_NAME_MAX_LENGTH, THEME_SUMMARY_MAX_LENGTH } from '@fis/shared';
import { SparseVector, TermVectors, buildTermVectors, cosineSimilarity } from './text-vectors';

export type HeuristicTheme = {
  name: string;
  summary: string;
  requestIds: string[];
};

// Average-linkage similarity a merge must reach; below it two groups share too few terms
// to be called one theme. Chosen before the first golden-set run; see evals/RESULTS.md.
const MERGE_THRESHOLD = 0.2;
const MIN_THEME_SIZE = 2;
const NAME_TERM_COUNT = 3;
const SUMMARY_TITLE_COUNT = 3;
const SUMMARY_TITLE_MAX_LENGTH = 80;

type Group = { members: number[] };

function pairwiseSimilarity(vectors: SparseVector[]): number[][] {
  return vectors.map((left, row) => vectors.map((right, column) => (row === column ? 0 : cosineSimilarity(left, right))));
}

// Agglomerative clustering with the Lance-Williams update for average linkage, so each merge
// costs one pass over the groups instead of recomputing member-pair averages.
function agglomerate(similarity: number[][]): Group[] {
  const groups: Array<Group | undefined> = similarity.map((_, index) => ({ members: [index] }));
  const linkage = similarity.map((row) => [...row]);
  for (;;) {
    let best = { left: -1, right: -1, value: 0 };
    // Plain loops: this scan runs once per merge over up to MAX_CORPUS_SIZE squared cells.
    for (let left = 0; left < groups.length; left += 1) {
      const row = linkage[left];
      if (groups[left] === undefined || row === undefined) {
        continue;
      }
      for (let right = left + 1; right < groups.length; right += 1) {
        const value = row[right] ?? 0;
        if (groups[right] !== undefined && value >= MERGE_THRESHOLD && (best.left === -1 || value > best.value)) {
          best = { left, right, value };
        }
      }
    }
    const leftGroup = groups[best.left];
    const rightGroup = groups[best.right];
    if (leftGroup === undefined || rightGroup === undefined) {
      return groups.filter((group): group is Group => group !== undefined);
    }
    const leftSize = leftGroup.members.length;
    const rightSize = rightGroup.members.length;
    groups.forEach((other, index) => {
      if (other === undefined || index === best.left || index === best.right) {
        return;
      }
      const merged = ((linkage[best.left]?.[index] ?? 0) * leftSize + (linkage[best.right]?.[index] ?? 0) * rightSize) / (leftSize + rightSize);
      const leftRow = linkage[best.left];
      const otherRow = linkage[index];
      if (leftRow !== undefined && otherRow !== undefined) {
        leftRow[index] = merged;
        otherRow[best.left] = merged;
      }
    });
    groups[best.left] = { members: [...leftGroup.members, ...rightGroup.members] };
    groups[best.right] = undefined;
  }
}

function topTerms(memberVectors: SparseVector[], termVectors: TermVectors): string[] {
  const totals = new Map<string, number>();
  memberVectors.forEach((vector) => {
    vector.forEach((weight, term) => totals.set(term, (totals.get(term) ?? 0) + weight));
  });
  // A term carried by one member only describes that member, not the theme.
  const sharedBy = (term: string): number => memberVectors.filter((vector) => vector.has(term)).length;
  return [...totals.entries()]
    .sort((left, right) => sharedBy(right[0]) - sharedBy(left[0]) || right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, NAME_TERM_COUNT)
    .map(([term]) => termVectors.displayForms.get(term) ?? term);
}

function themeName(terms: string[]): string {
  const name = terms.map((term) => term.charAt(0).toUpperCase() + term.slice(1)).join(' / ');
  return (name.length > 0 ? name : 'Miscellaneous').slice(0, THEME_NAME_MAX_LENGTH);
}

function themeSummary(members: RequestSummary[], terms: string[]): string {
  const totalVotes = members.reduce((total, member) => total + member.voteCount, 0);
  const topTitles = [...members]
    .sort((left, right) => right.voteCount - left.voteCount)
    .slice(0, SUMMARY_TITLE_COUNT)
    .map((member) => `"${member.title.slice(0, SUMMARY_TITLE_MAX_LENGTH)}"`)
    .join('; ');
  const summary = `Keyword cluster of ${members.length} requests (${totalVotes} votes) sharing the terms ${terms.join(', ')}. Most voted: ${topTitles}. Grouped by term overlap, not by a language model; review before acting on it.`;
  return summary.slice(0, THEME_SUMMARY_MAX_LENGTH);
}

export function clusterRequests(requests: RequestSummary[], maxThemes: number): HeuristicTheme[] {
  const termVectors = buildTermVectors(requests);
  const vectors = requests.map((request) => termVectors.vectors.get(request.id) ?? new Map<string, number>());
  return agglomerate(pairwiseSimilarity(vectors))
    .filter((group) => group.members.length >= MIN_THEME_SIZE)
    .map((group) => group.members.flatMap((index) => {
      const member = requests[index];
      return member === undefined ? [] : [member];
    }))
    .sort((left, right) => right.reduce((total, member) => total + member.voteCount, 0) - left.reduce((total, member) => total + member.voteCount, 0) || right.length - left.length)
    .slice(0, maxThemes)
    .map((members) => {
      const terms = topTerms(members.map((member) => termVectors.vectors.get(member.id) ?? new Map<string, number>()), termVectors);
      return { name: themeName(terms), summary: themeSummary(members, terms), requestIds: members.map((member) => member.id) };
    });
}
