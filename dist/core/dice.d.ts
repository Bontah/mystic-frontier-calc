/**
 * Dice utilities
 * Rank determines the max dice value (number of sides)
 */
import type { Rank, CalcFamiliar } from '../types/index.js';
/**
 * Get maximum dice value for a rank
 */
export declare function getMaxDiceForRank(rank: Rank | string): number;
/**
 * Get max dice values for an array of familiars
 */
export declare function getMaxDiceForFamiliars(familiars: CalcFamiliar[]): number[];
/**
 * Get average dice value for a rank
 */
export declare function getAverageDiceForRank(rank: Rank | string): number;
/**
 * Get average dice values for an array of familiars
 */
export declare function getAverageDiceForFamiliars(familiars: CalcFamiliar[]): number[];
/**
 * Calculate all possible dice combinations for familiars
 * Returns an iterator to avoid memory issues with large combinations
 */
export declare function generateDiceCombinations(familiars: CalcFamiliar[]): Generator<number[], void, undefined>;
/**
 * Count total possible dice combinations for familiars
 */
export declare function countDiceCombinations(familiars: CalcFamiliar[]): number;
//# sourceMappingURL=dice.d.ts.map