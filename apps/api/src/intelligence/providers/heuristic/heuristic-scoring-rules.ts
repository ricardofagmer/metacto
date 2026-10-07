import { PriorityBreakdown } from '@fis/shared';

/**
 * Documented keyword rules for the heuristic priority scorer (spec "Resolved open questions" 5).
 *
 * Each judgement criterion starts at `base`, gains `step` for every distinct phrase in `raises`
 * found in title + description + underlying need, loses `step` for every phrase in `lowers`,
 * and is clamped to 0..100. `demand` has no keywords: it is voteCount / maxVoteCount * 100.
 *
 * - reach: how many users the request touches. Raised by broad-audience words, lowered by
 *   niche-audience words.
 * - impact: how much it hurts today. Raised by blocking/pain words, lowered by cosmetic words.
 * - strategicFit: alignment with an enterprise B2B roadmap (integrations, security, data).
 * - effortInverse: higher means cheaper to build. Lowered by known-expensive work, raised by
 *   small UI changes.
 *
 * These rules are a transparent floor, not a model of the product: the output is labelled
 * `heuristic` and the rationale lists every phrase that moved a score.
 */
export type KeywordRule = {
  base: number;
  step: number;
  raises: readonly string[];
  lowers: readonly string[];
};

export type JudgementCriterion = Exclude<keyof PriorityBreakdown, 'demand'>;

export const HEURISTIC_SCORING_RULES: Record<JudgementCriterion, KeywordRule> = {
  reach: {
    base: 40,
    step: 10,
    raises: ['all users', 'everyone', 'every user', 'customers', 'teams', 'team', 'organization', 'company', 'login', 'onboarding', 'dashboard', 'mobile', 'password'],
    lowers: ['admin', 'admins', 'internal', 'power user', 'power users', 'edge case', 'a few'],
  },
  impact: {
    base: 40,
    step: 10,
    raises: ['blocked', 'blocking', 'cannot', "can't", 'unable', 'broken', 'lose', 'lost', 'manually', 'by hand', 'hours', 'error', 'fails', 'security', 'compliance', 'churn', 'revenue'],
    lowers: ['nice to have', 'cosmetic', 'minor', 'color', 'colour', 'icon', 'would be nice'],
  },
  strategicFit: {
    base: 50,
    step: 10,
    raises: ['integration', 'api', 'sso', 'okta', 'security', 'compliance', 'enterprise', 'automation', 'analytics', 'export', 'report', 'reports'],
    lowers: ['theme', 'color', 'colour', 'font', 'emoji', 'animation'],
  },
  effortInverse: {
    base: 60,
    step: 10,
    raises: ['button', 'label', 'text', 'sort', 'filter', 'toggle', 'shortcut', 'color', 'colour', 'rename', 'tooltip', 'link', 'email'],
    lowers: ['integration', 'migrate', 'migration', 'rewrite', 'real-time', 'realtime', 'offline', 'sync', 'mobile app', 'machine learning', 'permissions', 'sso'],
  },
};
