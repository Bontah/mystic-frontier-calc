/**
 * Score calculation engine
 * Unified calculation logic used by calculator, optimizer, and reroll analysis
 */
import type { CalcFamiliar, ConditionalBonus, FamiliarContext, CalculationResult, LineupEvaluation } from '../types/index.js';
import type { BonusItem } from '../types/bonus.js';
/**
 * Core calculation function
 * Returns the final score and breakdown
 */
export declare function calculateScore(dice: number[], familiars: FamiliarContext[], bonusItems: BonusItem[], conditionalBonuses: ConditionalBonus[]): CalculationResult;
/**
 * Evaluate a lineup of familiars (used by optimizer)
 * Includes familiar-specific conditionals in evaluation
 */
export declare function evaluateLineup(familiars: CalcFamiliar[], additionalBonuses: ConditionalBonus[], dice: number[]): LineupEvaluation;
/**
 * Calculate expected score across all possible dice combinations
 */
export declare function calculateExpectedScore(familiars: CalcFamiliar[], additionalBonuses: ConditionalBonus[], maxDice: number[]): number;
//# sourceMappingURL=calculator.d.ts.map