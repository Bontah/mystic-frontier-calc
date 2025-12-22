/**
 * Calculation result display component
 */
import type { CalculationResultWithStatus, ConditionalBonus } from '../../types/index.js';
/**
 * Conditional display data
 */
export interface ConditionalDisplayData {
    conditional: ConditionalBonus;
    isActive: boolean;
    familiarName?: string;
    familiarIndex: number;
    isManuallyDisabled: boolean;
}
/**
 * Update the result display
 */
export declare function renderResultDisplay(result: CalculationResultWithStatus): void;
/**
 * Update active conditionals summary
 */
export declare function updateActiveConditionals(conditionals: ConditionalDisplayData[]): void;
//# sourceMappingURL=result-display.d.ts.map