/**
 * Dice utilities
 * Rank determines the max dice value (number of sides)
 */
import type { Rank, CalcFamiliar, ConditionalBonus } from '../types/index.js';
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
/**
 * Extract dice cap from a conditional bonus name
 * Matches patterns like "Prevents dice from rolling over 3"
 * Returns null if no cap found
 */
export declare function getDiceCapFromConditional(conditional: ConditionalBonus | null): number | null;
/**
 * Get the effective dice cap for a familiar slot
 * Takes the minimum of rank-based max and any conditional caps
 */
export declare function getEffectiveDiceCap(familiar: CalcFamiliar | null, globalCap: number | null): number;
/**
 * Find the global dice cap from all familiars' conditionals
 * Returns the minimum cap if any familiar has a "prevents rolling over" conditional
 */
export declare function getGlobalDiceCap(familiars: (CalcFamiliar | null)[]): number | null;
//# sourceMappingURL=dice.d.ts.map