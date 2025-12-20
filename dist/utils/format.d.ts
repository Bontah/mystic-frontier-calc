/**
 * Formatting utilities
 */
import type { ConditionalBonus } from '../types/index.js';
/**
 * Format bonus values for display
 */
export declare function formatBonusValues(bonus: ConditionalBonus): string;
/**
 * Format conditional display text
 */
export declare function formatConditionalDisplay(bonus: ConditionalBonus): string;
/**
 * Format percentage with optional decimal places
 */
export declare function formatPercent(value: number, decimals?: number): string;
/**
 * Format confidence level with color class
 */
export declare function getConfidenceClass(confidence: number): string;
//# sourceMappingURL=format.d.ts.map