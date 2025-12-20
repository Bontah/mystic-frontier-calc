/**
 * Conditional bonus evaluation
 * Safely evaluates condition strings against game state
 */
import type { ConditionalBonus, FamiliarContext } from '../types/index.js';
/**
 * Evaluate a single condition
 */
export declare function evaluateCondition(condition: string, dice: number[], familiars: FamiliarContext[]): boolean;
/**
 * Evaluate a conditional bonus and return its contribution if active
 */
export declare function evaluateConditionalBonus(bonus: ConditionalBonus, dice: number[], familiars: FamiliarContext[]): {
    isActive: boolean;
    flatBonus: number;
    multiplierBonus: number;
};
/**
 * Evaluate multiple conditional bonuses
 */
export declare function evaluateConditionalBonuses(bonuses: ConditionalBonus[], dice: number[], familiars: FamiliarContext[]): {
    activeNames: string[];
    totalFlat: number;
    totalMultiplier: number;
};
/**
 * Clear the condition cache (useful for testing or after config reload)
 */
export declare function clearConditionCache(): void;
//# sourceMappingURL=conditional-evaluator.d.ts.map