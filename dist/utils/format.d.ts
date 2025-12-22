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
/**
 * Detect conditionals that are bugged in-game
 * Returns warning message if bugged, false if not
 */
export declare function isBuggedConditional(cond: ConditionalBonus | null | undefined): string | false;
/**
 * Detect conditionals with misleading wording in-game
 * Returns informational note if misleading, false if not
 */
export declare function getMisleadingWordingNote(cond: ConditionalBonus | null | undefined): string | false;
//# sourceMappingURL=format.d.ts.map