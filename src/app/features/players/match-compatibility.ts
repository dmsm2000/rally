import { Player } from '../../core/models';

/**
 * Real Match Score algorithm. Replaces the old placeholder (mock players had a hand-written
 * number/sentence; real players got a hardcoded 0 and their own bio reused as the "reason" — see
 * CLAUDE.md's Match Score entry for the full design discussion this implements).
 *
 * Each factor scores 0-100 independently and `null` when the data needed for it is missing on
 * either side (most profile fields are optional) — a missing factor is excluded from the weighted
 * average and its weight is redistributed across the rest, rather than guessing a neutral number,
 * so leaving an optional field blank never drags a score down or up.
 *
 * Dominant hand, backhand, coached (as its own factor — see coaching below) and play style are
 * deliberately not scored: hand/backhand don't affect whether two people make a good match, level
 * already captures playing seriousness, and it's genuinely unclear whether similar or contrasting
 * play styles make a better match — guessing felt worse than leaving it out.
 */

const LEVEL_ORDER: readonly string[] = ['Beginner', 'Improver', 'Intermediate', 'Advanced', 'Competitive'];
const FREQUENCY_ORDER: readonly string[] = [
  'Daily',
  '3–4 times a week',
  'Twice a week',
  'Once a week',
  'A few times a month'
];

/** Reason shown when nothing clears the "worth mentioning" bar (see REASON_THRESHOLD below). */
const DEFAULT_REASON_KEY = 'players.matchReasons.default';
/** A factor only becomes a shown reason once its own score is at least this good — keeps the
 *  blurb honest (e.g. "same city" never shows for two people who just share a country). */
const REASON_THRESHOLD = 80;
/** How many reasons to surface at most — a short highlight, not a full breakdown of the score. */
const MAX_REASONS = 2;

export interface MatchCompatibility {
  /** 0-100, rounded. */
  score: number;
  /** `players.matchReasons.*` translation keys, most relevant first — resolve each with
   *  `| translate` at render time and join for display (e.g. with " · "). Always at least one. */
  reasonKeys: string[];
}

interface WeightedFactor {
  key: string;
  weight: number;
  score: number | null;
}

function ordinalScore(order: readonly string[], a: string | undefined, b: string | undefined): number | null {
  if (!a || !b) {
    return null;
  }
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);
  if (indexA < 0 || indexB < 0) {
    return null;
  }
  return 100 * (1 - Math.abs(indexA - indexB) / (order.length - 1));
}

/** For fields where one specific value means "anything works" (Format's 'Both', CourtPref's
 *  'NoPreference') rather than just another category to match exactly. */
function wildcardAwareScore(
  a: string | undefined,
  b: string | undefined,
  wildcard: string,
  mismatchScore: number
): number | null {
  if (!a || !b) {
    return null;
  }
  return a === b || a === wildcard || b === wildcard ? 100 : mismatchScore;
}

function softEqualityScore(a: string | undefined, b: string | undefined, mismatchScore: number): number | null {
  if (!a || !b) {
    return null;
  }
  return a === b ? 100 : mismatchScore;
}

/** Jaccard overlap (intersection / union) of two option sets — used for combined
 *  availability + timesOfDay, since both are "when could we actually play" signals. */
function overlapScore(a: readonly string[] | undefined, b: readonly string[] | undefined): number | null {
  if (!a?.length || !b?.length) {
    return null;
  }
  const setA = new Set(a);
  const setB = new Set(b);
  const intersectionSize = [...setA].filter(value => setB.has(value)).length;
  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize === 0 ? null : 100 * (intersectionSize / unionSize);
}

function locationScore(viewer: Player, other: Player): number | null {
  if (!viewer.city || !other.city || !viewer.country || !other.country) {
    return null;
  }
  if (viewer.city === other.city && viewer.country === other.country) {
    return 100;
  }
  return viewer.country === other.country ? 60 : 25;
}

/** Both coached (or both not) is the real signal; when both are coached, how closely their
 *  training frequency lines up refines it further. */
function coachingScore(viewer: Player, other: Player): number | null {
  if (viewer.coached === undefined || other.coached === undefined) {
    return null;
  }
  if (viewer.coached !== other.coached) {
    return 50;
  }
  if (!viewer.coached) {
    return 100;
  }
  const frequencyProximity = ordinalScore(FREQUENCY_ORDER, viewer.coachedFrequency, other.coachedFrequency);
  return frequencyProximity === null ? 100 : 40 + 0.6 * frequencyProximity;
}

/** How many completed matches each side has, compared by ratio rather than fixed tiers — pairing
 *  two brand-new players (0 and 0) is treated as neutral parity, not a mismatch. */
function activityScore(viewerActivity: number, otherActivity: number): number {
  if (viewerActivity === 0 && otherActivity === 0) {
    return 100;
  }
  const lower = Math.min(viewerActivity, otherActivity);
  const higher = Math.max(viewerActivity, otherActivity);
  return higher === 0 ? 100 : 100 * (lower / higher);
}

export function computeMatchCompatibility(
  viewer: Player,
  viewerActivity: number,
  other: Player,
  otherActivity: number
): MatchCompatibility {
  const factors: WeightedFactor[] = [
    {
      key: 'availability',
      weight: 20,
      score: overlapScore(
        [...(viewer.availability ?? []), ...(viewer.timesOfDay ?? [])],
        [...(other.availability ?? []), ...(other.timesOfDay ?? [])]
      )
    },
    { key: 'level', weight: 20, score: ordinalScore(LEVEL_ORDER, viewer.level, other.level) },
    { key: 'activity', weight: 15, score: activityScore(viewerActivity, otherActivity) },
    { key: 'coaching', weight: 10, score: coachingScore(viewer, other) },
    { key: 'frequency', weight: 10, score: ordinalScore(FREQUENCY_ORDER, viewer.frequency ?? undefined, other.frequency ?? undefined) },
    { key: 'format', weight: 8, score: wildcardAwareScore(viewer.format, other.format, 'Both', 50) },
    { key: 'surface', weight: 7, score: softEqualityScore(viewer.surface, other.surface, 50) },
    { key: 'location', weight: 7, score: locationScore(viewer, other) },
    { key: 'courtPref', weight: 3, score: wildcardAwareScore(viewer.courtPref, other.courtPref, 'NoPreference', 50) }
  ];

  const available = factors.filter((factor): factor is WeightedFactor & { score: number } => factor.score !== null);
  const totalWeight = available.reduce((sum, factor) => sum + factor.weight, 0);
  // No comparable data at all (two near-empty profiles) — neutral, not zero.
  const score = totalWeight === 0 ? 50 : available.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / totalWeight;

  const topFactors = [...available]
    .filter(factor => factor.score >= REASON_THRESHOLD)
    .sort((a, b) => b.weight * b.score - a.weight * a.score)
    .slice(0, MAX_REASONS);

  return {
    score: Math.round(score),
    reasonKeys: topFactors.length ? topFactors.map(factor => `players.matchReasons.${factor.key}`) : [DEFAULT_REASON_KEY]
  };
}
