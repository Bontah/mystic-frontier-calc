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
//# sourceMappingURL=format.js.map