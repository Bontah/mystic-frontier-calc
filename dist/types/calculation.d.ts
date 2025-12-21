/**
 * Calculation result types
 */
import type { CalcFamiliar, ConditionalBonus } from './familiar.js';
/**
 * Input state for calculation
 */
export interface CalculationInput {
    dice: number[];
    familiars: Array<{
        type: string;
        element: string;
        rank?: string;
    }>;
    bonusItems: import('./bonus.js').BonusItem[];
    conditionalBonuses: ConditionalBonus[];
}
/**
 * Result of a score calculation
 */
export interface CalculationResult {
    diceSum: number;
    totalFlat: number;
    totalMultiplier: number | null;
    finalResult: number;
    activeConditionalNames: string[];
}
/**
 * Extended result with pass/fail status
 */
export interface CalculationResultWithStatus extends CalculationResult {
    passed: boolean;
    difference: number;
}
/**
 * Breakdown of a single familiar's contribution
 */
export interface FamiliarBreakdown {
    familiarIndex: number;
    name: string;
    element: string;
    type: string;
    rank: string;
    conditionalTriggered: boolean;
    conditionalName: string | null;
    flatContribution: number;
    multiplierContribution: number;
}
/**
 * Result of evaluating a lineup (for optimizer)
 */
export interface LineupEvaluation {
    score: number;
    diceSum: number;
    totalFlat: number;
    totalMult: number;
    activeBonusNames: string[];
    familiarBreakdown: FamiliarBreakdown[];
}
/**
 * Optimizer result with lineup and metadata
 */
export interface OptimizedLineup extends LineupEvaluation {
    familiars: CalcFamiliar[];
    scoreLabel: string;
    testDice: number[];
}
/**
 * Extended optimizer result with statistical metrics
 */
export interface ExtendedOptimizedLineup extends OptimizedLineup {
    /** Standard deviation of scores (for minVariance strategy) */
    standardDeviation?: number;
    /** Percentage of outcomes above floor (for floorGuarantee strategy) */
    floorPercentage?: number;
    /** The floor threshold used */
    floorThreshold?: number;
    /** Median score value (for median strategy) */
    medianScore?: number;
    /** Component scores for balanced strategy */
    balancedComponents?: {
        lowRollScore: number;
        avgScore: number;
        highRollScore: number;
    };
}
/**
 * Passing value for reroll analysis
 */
export interface PassingValue {
    value: number;
    diceSum: number;
    totalFlat: number;
    totalMultiplier: number | null;
    finalResult: number;
    activeConditionals: string[];
}
/**
 * Reroll suggestion for a single die
 */
export interface RerollSuggestion {
    dieIndex: number;
    dieName: string;
    currentValue: number;
    passingValues: PassingValue[];
    odds: number | null;
    currentPasses: boolean;
    maxDice: number;
    rank: string;
}
/**
 * Scoring strategy for optimizer
 */
export type ScoringStrategy = 'overall' | 'lowRolls' | 'highRolls' | 'median' | 'minVariance' | 'floorGuarantee' | 'balanced';
/**
 * Optimizer progress callback
 */
export type ProgressCallback = (percent: number) => void;
/**
 * A passing dice combination with probability
 */
export interface PassingCombination {
    dice: number[];
    diceSum: number;
    finalScore: number;
    probability: number;
    activeConditionals: string[];
}
/**
 * Strategy-specific configuration
 */
export interface StrategyConfig {
    /** Whether this strategy is enabled */
    enabled: boolean;
    /** Conditional bonus IDs to ignore for this strategy */
    ignoredConditionalIds: string[];
}
/**
 * Optimizer configuration
 */
export interface OptimizerConfig {
    version: string;
    strategies: {
        overall: StrategyConfig;
        lowRolls: StrategyConfig;
        highRolls: StrategyConfig;
        median: StrategyConfig;
        floorGuarantee: StrategyConfig;
        balanced: StrategyConfig;
        diceIndependent: StrategyConfig;
    };
}
//# sourceMappingURL=calculation.d.ts.map