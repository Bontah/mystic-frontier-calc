/**
 * Lineup optimizer
 * Finds optimal familiar combinations using different strategies
 */
import type { CalcFamiliar, ConditionalBonus, OptimizedLineup, ExtendedOptimizedLineup, ScoringStrategy, ProgressCallback, OptimizerConfig } from '../types/index.js';
/**
 * Generate all k-combinations from an array
 */
export declare function generateCombinations<T>(arr: T[], size: number): T[][];
/**
 * Check if a conditional bonus is dice-independent
 * (doesn't require specific dice rolls to activate)
 */
export declare function isDiceIndependent(conditional: ConditionalBonus | null | undefined): boolean;
/**
 * Find best lineup using median strategy
 */
export declare function findBestLineupMedian(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[]): ExtendedOptimizedLineup | null;
/**
 * Find lineup with minimum variance (most consistent)
 */
export declare function findBestLineupMinVariance(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[]): ExtendedOptimizedLineup | null;
/**
 * Find lineup with best floor guarantee (80% of outcomes above floor)
 */
export declare function findBestLineupFloorGuarantee(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[]): ExtendedOptimizedLineup | null;
/**
 * Find best lineup using balanced weighted scoring (25% low + 50% avg + 25% high)
 */
export declare function findBestLineupBalanced(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[]): ExtendedOptimizedLineup | null;
/**
 * Find the best lineup with dice-independent conditionals
 * Only considers familiars whose conditionals don't depend on dice rolls
 */
export declare function findBestLineupDiceIndependent(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[]): ExtendedOptimizedLineup | null;
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
 * Result type for strategy execution
 */
export interface StrategyResults {
    bestOverall: OptimizedLineup | null;
    bestLow: OptimizedLineup | null;
    bestHigh: OptimizedLineup | null;
    bestMedian: ExtendedOptimizedLineup | null;
    bestMinVariance: ExtendedOptimizedLineup | null;
    bestFloorGuarantee: ExtendedOptimizedLineup | null;
    bestBalanced: ExtendedOptimizedLineup | null;
}
/**
 * Run all strategies and return results (fast synchronous version)
 * Uses optimizer config to filter ignored conditionals and skip disabled strategies
 */
export declare function runAllStrategiesFast(combinations: CalcFamiliar[][], bonuses: ConditionalBonus[], config?: OptimizerConfig): StrategyResults;
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