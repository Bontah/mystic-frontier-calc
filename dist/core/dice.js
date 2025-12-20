/**
 * Dice utilities
 * Rank determines the max dice value (number of sides)
 */
/**
 * Rank to max dice value mapping
 * Common = d3, Rare = d4, Epic = d5, Unique/Legendary = d6
 */
const RANK_DICE_MAP = {
    Common: 3,
    Rare: 4,
    Epic: 5,
    Unique: 6,
    Legendary: 6,
};
/**
 * Get maximum dice value for a rank
 */
export function getMaxDiceForRank(rank) {
    return RANK_DICE_MAP[rank] ?? 3;
}
/**
 * Get max dice values for an array of familiars
 */
export function getMaxDiceForFamiliars(familiars) {
    return familiars.map((f) => getMaxDiceForRank(f.rank));
}
/**
 * Get average dice value for a rank
 */
export function getAverageDiceForRank(rank) {
    const max = getMaxDiceForRank(rank);
    return (1 + max) / 2;
}
/**
 * Get average dice values for an array of familiars
 */
export function getAverageDiceForFamiliars(familiars) {
    return familiars.map((f) => Math.ceil(getAverageDiceForRank(f.rank)));
}
/**
 * Calculate all possible dice combinations for familiars
 * Returns an iterator to avoid memory issues with large combinations
 */
export function* generateDiceCombinations(familiars) {
    const maxDice = getMaxDiceForFamiliars(familiars);
    if (maxDice.length === 0)
        return;
    if (maxDice.length === 1) {
        for (let d1 = 1; d1 <= maxDice[0]; d1++) {
            yield [d1];
        }
        return;
    }
    if (maxDice.length === 2) {
        for (let d1 = 1; d1 <= maxDice[0]; d1++) {
            for (let d2 = 1; d2 <= maxDice[1]; d2++) {
                yield [d1, d2];
            }
        }
        return;
    }
    // Standard 3-familiar case
    for (let d1 = 1; d1 <= maxDice[0]; d1++) {
        for (let d2 = 1; d2 <= maxDice[1]; d2++) {
            for (let d3 = 1; d3 <= maxDice[2]; d3++) {
                yield [d1, d2, d3];
            }
        }
    }
}
/**
 * Count total possible dice combinations for familiars
 */
export function countDiceCombinations(familiars) {
    const maxDice = getMaxDiceForFamiliars(familiars);
    return maxDice.reduce((acc, max) => acc * max, 1);
}
/**
 * Extract dice cap from a conditional bonus name
 * Matches patterns like "Prevents dice from rolling over 3"
 * Returns null if no cap found
 */
export function getDiceCapFromConditional(conditional) {
    if (!conditional?.name)
        return null;
    const match = conditional.name.match(/prevents dice from rolling over (\d+)/i);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}
/**
 * Get the effective dice cap for a familiar slot
 * Takes the minimum of rank-based max and any conditional caps
 */
export function getEffectiveDiceCap(familiar, globalCap) {
    if (!familiar?.rank)
        return 6;
    const rankMax = getMaxDiceForRank(familiar.rank);
    const conditionalCap = getDiceCapFromConditional(familiar.conditional);
    // Take minimum of all applicable caps
    let effectiveCap = rankMax;
    if (conditionalCap !== null) {
        effectiveCap = Math.min(effectiveCap, conditionalCap);
    }
    if (globalCap !== null) {
        effectiveCap = Math.min(effectiveCap, globalCap);
    }
    return effectiveCap;
}
/**
 * Find the global dice cap from all familiars' conditionals
 * Returns the minimum cap if any familiar has a "prevents rolling over" conditional
 */
export function getGlobalDiceCap(familiars) {
    let minCap = null;
    for (const fam of familiars) {
        if (fam?.conditional) {
            const cap = getDiceCapFromConditional(fam.conditional);
            if (cap !== null) {
                minCap = minCap === null ? cap : Math.min(minCap, cap);
            }
        }
    }
    return minCap;
}
//# sourceMappingURL=dice.js.map