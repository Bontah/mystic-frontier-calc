/**
 * Text matching utilities for conditional bonus matching
 */

import type { ConditionalBonus } from '../types/index.js';
import { store } from '../state/store.js';

// Keywords with weights for matching
const KEYWORD_WEIGHTS: Record<string, number> = {
  // Elements (highest weight)
  fire: 10, ice: 10, lightning: 10, poison: 10, dark: 10, holy: 10,
  elemental: 8, 'non-elemental': 10,
  // Types
  human: 10, beast: 10, plant: 10, aquatic: 10, fairy: 10,
  reptile: 10, devil: 10, undead: 10, machine: 10,
  // Condition words
  same: 8, different: 8, all: 6, three: 6, two: 6, one: 5,
  type: 5, element: 5, familiar: 3, familiars: 3,
  // Low weight common words
  lineup: 1, active: 1, your: 0, is: 0, on: 0, if: 0, a: 0, an: 0, the: 0, have: 0,
};

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Jaro-Winkler similarity (handles OCR errors well)
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3;

  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculate n-gram similarity
 */
function calculateNgramSimilarity(text1: string, text2: string, n: number): number {
  const getNgrams = (text: string): Set<string> => {
    const ngrams = new Set<string>();
    const cleaned = text.replace(/\s+/g, ' ');
    for (let i = 0; i <= cleaned.length - n; i++) {
      ngrams.add(cleaned.substring(i, i + n));
    }
    return ngrams;
  };

  const ngrams1 = getNgrams(text1);
  const ngrams2 = getNgrams(text2);

  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  let intersection = 0;
  for (const ng of ngrams1) {
    if (ngrams2.has(ng)) intersection++;
  }

  return ((2 * intersection) / (ngrams1.size + ngrams2.size)) * 100;
}

/**
 * Calculate keyword-weighted score
 */
function calculateKeywordScore(text1: string, text2: string): number {
  const words1 = text1.split(/\s+/).filter((w) => w.length > 1);
  const words2 = text2.split(/\s+/).filter((w) => w.length > 1);

  if (words1.length === 0 || words2.length === 0) return 0;

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const w2 of words2) {
    const weight = KEYWORD_WEIGHTS[w2] ?? 2;
    totalWeight += weight;

    for (const w1 of words1) {
      if (
        w1 === w2 ||
        w1.includes(w2) ||
        w2.includes(w1) ||
        levenshteinDistance(w1, w2) <= Math.max(1, Math.floor(w2.length / 4))
      ) {
        matchedWeight += weight;
        break;
      }
    }
  }

  return totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
}

/**
 * Calculate combined text similarity
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const keywordScore = calculateKeywordScore(text1, text2);
  const ngramScore = calculateNgramSimilarity(text1, text2, 3);
  const jaroScore = jaroWinklerSimilarity(text1, text2) * 100;

  return keywordScore * 0.5 + ngramScore * 0.3 + jaroScore * 0.2;
}

/**
 * Extract bonus values from OCR text
 */
export function extractBonusValues(text: string): {
  flat: number | null;
  mult: number | null;
} {
  const result: { flat: number | null; mult: number | null } = {
    flat: null,
    mult: null,
  };

  // Look for flat bonus patterns
  const flatMatch = text.match(/([+-]\d+)(?!\.\d)/);
  if (flatMatch) {
    result.flat = parseInt(flatMatch[1]);
  }

  // Look for multiplier patterns
  const multMatch = text.match(/[x×](\d+\.?\d*)|(\d+\.?\d*)[x×]/i);
  if (multMatch) {
    result.mult = parseFloat(multMatch[1] || multMatch[2]);
  }

  return result;
}

/**
 * Calculate bonus value match score
 */
function calculateBonusValueMatch(
  extracted: { flat: number | null; mult: number | null },
  bonus: ConditionalBonus
): number {
  let score = 0;
  let checks = 0;

  if (extracted.flat !== null && bonus.flatBonus !== undefined) {
    checks++;
    if (extracted.flat === bonus.flatBonus) score += 100;
    else if (Math.abs(extracted.flat - bonus.flatBonus) <= 1) score += 50;
  }

  if (extracted.mult !== null && bonus.multiplierBonus !== undefined) {
    checks++;
    if (Math.abs(extracted.mult - bonus.multiplierBonus) < 0.05) score += 100;
    else if (Math.abs(extracted.mult - bonus.multiplierBonus) < 0.2) score += 50;
  }

  return checks > 0 ? score / checks : 0;
}

/**
 * Match extracted text against known conditionals
 */
export function matchConditionalText(
  extractedText: string
): (ConditionalBonus & { matchScore: number }) | null {
  const state = store.getState();
  const bonuses = state.configConditionalBonuses.bonuses;

  if (!extractedText || !bonuses) return null;

  const normalized = extractedText
    .toLowerCase()
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const extractedBonus = extractBonusValues(normalized);

  let bestMatch: (ConditionalBonus & { matchScore: number }) | null = null;
  let bestScore = 0;

  for (const bonus of bonuses) {
    const bonusText = bonus.name.toLowerCase();
    const textScore = calculateTextSimilarity(normalized, bonusText);

    let bonusValueScore = 0;
    if (extractedBonus.flat !== null || extractedBonus.mult !== null) {
      bonusValueScore = calculateBonusValueMatch(extractedBonus, bonus);
    }

    const finalScore =
      bonusValueScore > 0 ? textScore * 0.7 + bonusValueScore * 0.3 : textScore;

    if (finalScore > bestScore && finalScore > 35) {
      bestScore = finalScore;
      bestMatch = { ...bonus, matchScore: Math.round(finalScore) };
    }
  }

  return bestMatch;
}

/**
 * Find top N matches for extracted text
 */
export function findTopMatches(
  extractedText: string,
  limit: number = 10
): Array<ConditionalBonus & { matchScore: number }> {
  const state = store.getState();
  const bonuses = state.configConditionalBonuses.bonuses;

  if (!extractedText || !bonuses) return [];

  const normalized = extractedText
    .toLowerCase()
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const extractedBonus = extractBonusValues(normalized);
  const matches: Array<ConditionalBonus & { matchScore: number }> = [];

  for (const bonus of bonuses) {
    const bonusText = bonus.name.toLowerCase();
    const textScore = calculateTextSimilarity(normalized, bonusText);

    let bonusValueScore = 0;
    if (extractedBonus.flat !== null || extractedBonus.mult !== null) {
      bonusValueScore = calculateBonusValueMatch(extractedBonus, bonus);
    }

    const finalScore =
      bonusValueScore > 0 ? textScore * 0.7 + bonusValueScore * 0.3 : textScore;

    if (finalScore > 20) {
      matches.push({ ...bonus, matchScore: Math.round(finalScore) });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return matches.slice(0, limit);
}
