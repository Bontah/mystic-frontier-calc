/**
 * Reroll analysis
 * Calculates which dice rerolls can help pass a difficulty check
 */
import { calculateScore } from './calculator.js';
import { getMaxDiceForRank } from './dice.js';
/**
 * Simulate result with specific dice values
 */
function simulateResult(dice, familiars, bonusItems, conditionalBonuses) {
    const result = calculateScore(dice, familiars, bonusItems, conditionalBonuses);
    return {
        finalResult: result.finalResult,
        activeConditionals: result.activeConditionalNames,
        diceSum: result.diceSum,
        totalFlat: result.totalFlat,
        totalMultiplier: result.totalMultiplier,
    };
}
/**
 * Calculate reroll suggestions for each die
 */
export function calculateRerollSuggestions(currentDice, familiars, bonusItems, conditionalBonuses, difficulty) {
    const suggestions = [];
    for (let dieIndex = 0; dieIndex < currentDice.length; dieIndex++) {
        const currentValue = currentDice[dieIndex];
        const rank = familiars[dieIndex]?.rank ?? 'Common';
        const maxDice = getMaxDiceForRank(rank);
        const passingValues = [];
        // Test all possible values for this die
        for (let testValue = 1; testValue <= maxDice; testValue++) {
            const testDice = [...currentDice];
            testDice[dieIndex] = testValue;
            const result = simulateResult(testDice, familiars, bonusItems, conditionalBonuses);
            if (result.finalResult >= difficulty) {
                passingValues.push({
                    value: testValue,
                    finalResult: result.finalResult,
                    activeConditionals: result.activeConditionals,
                    diceSum: result.diceSum,
                    totalFlat: result.totalFlat,
                    totalMultiplier: result.totalMultiplier,
                });
            }
        }
        // Calculate odds (out of maxDice, not fixed 6)
        const odds = passingValues.length > 0
            ? Math.round((passingValues.length / maxDice) * 100)
            : null;
        // Check if current value is among passing values
        const currentPasses = passingValues.some((p) => p.value === currentValue);
        suggestions.push({
            dieIndex,
            dieName: `Dice ${dieIndex + 1}`,
            currentValue,
            passingValues,
            odds,
            currentPasses,
            maxDice,
            rank,
        });
    }
    return suggestions;
}
/**
 * Get the best reroll option
 * Returns the die with highest odds of success
 */
export function getBestRerollOption(suggestions) {
    const rerollable = suggestions.filter((s) => s.passingValues.length > 0 && !s.currentPasses);
    if (rerollable.length === 0)
        return null;
    // Sort by odds descending
    rerollable.sort((a, b) => (b.odds ?? 0) - (a.odds ?? 0));
    return rerollable[0];
}
/**
 * Check if any single reroll can achieve pass
 */
export function canPassWithSingleReroll(suggestions) {
    return suggestions.some((s) => s.passingValues.length > 0);
}
/**
 * Get summary of reroll options
 */
export function getRerollSummary(suggestions) {
    const possible = suggestions.filter((s) => s.passingValues.length > 0);
    const impossible = suggestions.filter((s) => s.passingValues.length === 0);
    return {
        canPass: possible.length > 0,
        bestOdds: possible.length > 0
            ? Math.max(...possible.map((s) => s.odds ?? 0))
            : null,
        impossibleCount: impossible.length,
    };
}
//# sourceMappingURL=reroll-analyzer.js.map