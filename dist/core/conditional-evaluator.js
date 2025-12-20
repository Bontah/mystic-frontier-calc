/**
 * Conditional bonus evaluation
 * Safely evaluates condition strings against game state
 */
/**
 * Cache for compiled condition functions
 */
const conditionCache = new Map();
/**
 * Compile a condition string into a function
 * Uses caching to avoid repeated compilation
 */
function compileCondition(condition) {
    if (conditionCache.has(condition)) {
        return conditionCache.get(condition);
    }
    try {
        // Create function that takes dice array and familiars array
        const fn = new Function('dice', 'familiars', `return ${condition}`);
        conditionCache.set(condition, fn);
        return fn;
    }
    catch {
        // Invalid condition syntax
        conditionCache.set(condition, () => false);
        return null;
    }
}
/**
 * Evaluate a single condition
 */
export function evaluateCondition(condition, dice, familiars) {
    const fn = compileCondition(condition);
    if (!fn)
        return false;
    try {
        return Boolean(fn(dice, familiars));
    }
    catch {
        // Runtime error in condition
        return false;
    }
}
/**
 * Evaluate a conditional bonus and return its contribution if active
 */
export function evaluateConditionalBonus(bonus, dice, familiars) {
    const isActive = evaluateCondition(bonus.condition, dice, familiars);
    if (!isActive) {
        return { isActive: false, flatBonus: 0, multiplierBonus: 0 };
    }
    // Normalize multiplier - 0 and 1 mean "no multiplier"
    const multiplier = bonus.multiplierBonus !== 0 && bonus.multiplierBonus !== 1
        ? bonus.multiplierBonus
        : 0;
    return {
        isActive: true,
        flatBonus: bonus.flatBonus || 0,
        multiplierBonus: multiplier,
    };
}
/**
 * Evaluate multiple conditional bonuses
 */
export function evaluateConditionalBonuses(bonuses, dice, familiars) {
    let totalFlat = 0;
    let totalMultiplier = 0;
    const activeNames = [];
    for (const bonus of bonuses) {
        const result = evaluateConditionalBonus(bonus, dice, familiars);
        if (result.isActive) {
            activeNames.push(bonus.name);
            totalFlat += result.flatBonus;
            totalMultiplier += result.multiplierBonus;
        }
    }
    return { activeNames, totalFlat, totalMultiplier };
}
/**
 * Clear the condition cache (useful for testing or after config reload)
 */
export function clearConditionCache() {
    conditionCache.clear();
}
//# sourceMappingURL=conditional-evaluator.js.map