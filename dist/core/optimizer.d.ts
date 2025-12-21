/**
 * Lineup optimizer
 * Finds optimal familiar combinations using different strategies
 */
import type { CalcFamiliar, ConditionalBonus, OptimizedLineup, ScoringStrategy, ProgressCallback } from '../types/index.js';
/**
 * Generate all k-combinations from an array
 */
export declare function generateCombinations<T>(arr: T[], size: number): T[][];
/**
 * Find the best lineup using a specific strategy
 */
export declare function findBestLineup(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[], strategy: ScoringStrategy): OptimizedLineup | null;
/**
 * Fast synchronous lineup finder
 * Uses average dice for 'overall' strategy instead of calculating all combinations
 */
export declare function findBestLineupFast(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[], strategy: ScoringStrategy): OptimizedLineup | null;
/**
 * Async version of findBestLineup with progress reporting
 * Allows UI to remain responsive during long computations
 */
export declare function findBestLineupAsync(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[], strategy: ScoringStrategy, onProgress?: ProgressCallback, shouldCancel?: () => boolean): Promise<OptimizedLineup | null>;
/**
 * Run all strategies and return results (fast synchronous version)
 */
export declare function runAllStrategiesFast(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[]): {
    bestOverall: OptimizedLineup | null;
    bestLow: OptimizedLineup | null;
    bestHigh: OptimizedLineup | null;
};
/**
 * Run all strategies and return results (async version with progress)
 */
export declare function runAllStrategies(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[], onProgress?: ProgressCallback, shouldCancel?: () => boolean): Promise<{
    bestOverall: OptimizedLineup | null;
    bestLow: OptimizedLineup | null;
    bestHigh: OptimizedLineup | null;
}>;
/**
 * Filter familiars before optimization
 */
export declare function filterRosterForOptimization(roster: CalcFamiliar[], filters: {
    elements?: string[];
    types?: string[];
    minRank?: string;
}): CalcFamiliar[];
//# sourceMappingURL=optimizer.d.ts.map