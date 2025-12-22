/**
 * Formatting utilities
 */
/**
 * Format bonus values for display
 */
export function formatBonusValues(bonus) {
    const parts = [];
    if (bonus.flatBonus && bonus.flatBonus !== 0) {
        parts.push(`${bonus.flatBonus >= 0 ? '+' : ''}${bonus.flatBonus}`);
    }
    if (bonus.multiplierBonus &&
        bonus.multiplierBonus !== 0 &&
        bonus.multiplierBonus !== 1) {
        parts.push(`×${bonus.multiplierBonus}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'No bonus';
}
/**
 * Format conditional display text
 */
export function formatConditionalDisplay(bonus) {
    const stats = formatBonusValues(bonus);
    return stats !== 'No bonus' ? `${bonus.name} (${stats})` : bonus.name;
}
/**
 * Format percentage with optional decimal places
 */
export function formatPercent(value, decimals = 0) {
    return `${value.toFixed(decimals)}%`;
}
/**
 * Format confidence level with color class
 */
export function getConfidenceClass(confidence) {
    if (confidence >= 80)
        return 'confidence-high';
    if (confidence >= 50)
        return 'confidence-medium';
    return 'confidence-low';
}
/**
 * Detect conditionals that are bugged in-game
 * Returns warning message if bugged, false if not
 */
export function isBuggedConditional(cond) {
    if (!cond)
        return false;
    const name = (cond.name || '').toLowerCase();
    const condition = (cond.condition || '').toLowerCase();
    // Bug 1: Non-elemental/None element conditionals don't work in-game
    // if (name.includes('non-elemental') || condition.includes("element === 'none'")) {
    //   return 'Non-elemental conditionals are bugged in-game';
    // }
    return false;
}
/**
 * Detect conditionals with misleading wording in-game
 * Returns informational note if misleading, false if not
 */
export function getMisleadingWordingNote(cond) {
    if (!cond)
        return false;
    const name = (cond.name || '').toLowerCase();
    // "Dice add up to X" wording is misleading - actual behavior is each die >= threshold
    if (name.includes('dice add up to')) {
        return 'Misleading wording: Each die must individually meet the threshold';
    }
    return false;
}
//# sourceMappingURL=format.js.map