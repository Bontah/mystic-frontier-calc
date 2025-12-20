/**
 * Dice utilities
 * Rank determines the max dice value (number of sides)
 */

import type { Rank, CalcFamiliar } from '../types/index.js';

/**
 * Rank to max dice value mapping
 * Common = d3, Rare = d4, Epic = d5, Unique/Legendary = d6
 */
const RANK_DICE_MAP: Record<Rank, number> = {
  Common: 3,
  Rare: 4,
  Epic: 5,
  Unique: 6,
  Legendary: 6,
};

/**
 * Get maximum dice value for a rank
 */
export function getMaxDiceForRank(rank: Rank | string): number {
  return RANK_DICE_MAP[rank as Rank] ?? 3;
}

/**
 * Get max dice values for an array of familiars
 */
export function getMaxDiceForFamiliars(familiars: CalcFamiliar[]): number[] {
  return familiars.map((f) => getMaxDiceForRank(f.rank));
}

/**
 * Get average dice value for a rank
 */
export function getAverageDiceForRank(rank: Rank | string): number {
  const max = getMaxDiceForRank(rank);
  return (1 + max) / 2;
}

/**
 * Get average dice values for an array of familiars
 */
export function getAverageDiceForFamiliars(familiars: CalcFamiliar[]): number[] {
  return familiars.map((f) => Math.ceil(getAverageDiceForRank(f.rank)));
}

/**
 * Calculate all possible dice combinations for familiars
 * Returns an iterator to avoid memory issues with large combinations
 */
export function* generateDiceCombinations(
  familiars: CalcFamiliar[]
): Generator<number[], void, undefined> {
  const maxDice = getMaxDiceForFamiliars(familiars);

  if (maxDice.length === 0) return;

  if (maxDice.length === 1) {
    for (let d1 = 1; d1 <= maxDice[0]; d1++) {
      yield [d1];
    }
    return;
  }

  if (maxDice.length === 2) {
    for (let d1 = 1; d1 <= maxDice[0]; d1++) {
      for (let d2 = 1; d2 <= maxDice[1]; d2++) {
        yield [d1, d2];
      }
    }
    return;
  }

  // Standard 3-familiar case
  for (let d1 = 1; d1 <= maxDice[0]; d1++) {
    for (let d2 = 1; d2 <= maxDice[1]; d2++) {
      for (let d3 = 1; d3 <= maxDice[2]; d3++) {
        yield [d1, d2, d3];
      }
    }
  }
}

/**
 * Count total possible dice combinations for familiars
 */
export function countDiceCombinations(familiars: CalcFamiliar[]): number {
  const maxDice = getMaxDiceForFamiliars(familiars);
  return maxDice.reduce((acc, max) => acc * max, 1);
}
