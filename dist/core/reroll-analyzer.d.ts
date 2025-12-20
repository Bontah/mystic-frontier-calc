/**
 * Reroll analysis
 * Calculates which dice rerolls can help pass a difficulty check
 */
import type { ConditionalBonus, FamiliarContext, RerollSuggestion } from '../types/index.js';
import type { BonusItem } from '../types/bonus.js';
/**
 * Calculate reroll suggestions for each die
 */
export declare function calculateRerollSuggestions(currentDice: number[], familiars: Array<FamiliarContext & {
    rank: string;
}>, bonusItems: BonusItem[], conditionalBonuses: ConditionalBonus[], difficulty: number): RerollSuggestion[];
/**
 * Get the best reroll option
 * Returns the die with highest odds of success
 */
export declare function getBestRerollOption(suggestions: RerollSuggestion[]): RerollSuggestion | null;
/**
 * Check if any single reroll can achieve pass
 */
export declare function canPassWithSingleReroll(suggestions: RerollSuggestion[]): boolean;
/**
 * Get summary of reroll options
 */
export declare function getRerollSummary(suggestions: RerollSuggestion[]): {
    canPass: boolean;
    bestOdds: number | null;
    impossibleCount: number;
};
//# sourceMappingURL=reroll-analyzer.d.ts.map