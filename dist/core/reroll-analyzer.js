/**
 * Reroll analysis
 * Calculates which dice rerolls can help pass a difficulty check
 */
import { calculateScore } from './calculator.js';
import { getMaxDiceForRank, getEffectiveDiceCap, getGlobalDiceCap } from './dice.js';
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
/**
 * Find the top passing dice combinations sorted by probability
 * Returns combinations that pass the difficulty, sorted by highest probability first
 */
export function findTopPassingCombinations(familiars, bonusItems, conditionalBonuses, difficulty, limit = 5) {
    // Filter to actual familiars and get their contexts
    const activeFamiliars = familiars.filter((f) => f !== null && f.rank !== undefined);
    if (activeFamiliars.length === 0) {
        return [];
    }
    const familiarContexts = activeFamiliars.map(f => ({
        type: f.type,
        element: f.element,
        rank: f.rank,
    }));
    // Get global dice cap from conditionals (e.g., "prevents rolling over 3")
    const globalCap = getGlobalDiceCap(familiars);
    // Get max dice for each familiar (considering rank and caps)
    const maxDice = activeFamiliars.map(f => getEffectiveDiceCap(f, globalCap));
    // Generate all passing combinations
    const passingCombos = [];
    // Handle 1, 2, or 3 familiars
    const numDice = activeFamiliars.length;
    if (numDice === 1) {
        for (let d1 = 1; d1 <= maxDice[0]; d1++) {
            const dice = [d1];
            const result = simulateResult(dice, familiarContexts, bonusItems, conditionalBonuses);
            if (result.finalResult >= difficulty) {
                // Probability of rolling exactly d1 or higher
                const prob = ((maxDice[0] - d1 + 1) / maxDice[0]) * 100;
                passingCombos.push({
                    dice: [...dice],
                    diceSum: d1,
                    finalScore: result.finalResult,
                    probability: prob,
                    activeConditionals: result.activeConditionals,
                });
            }
        }
    }
    else if (numDice === 2) {
        for (let d1 = 1; d1 <= maxDice[0]; d1++) {
            for (let d2 = 1; d2 <= maxDice[1]; d2++) {
                const dice = [d1, d2];
                const result = simulateResult(dice, familiarContexts, bonusItems, conditionalBonuses);
                if (result.finalResult >= difficulty) {
                    // Probability of rolling at least these values
                    const prob1 = (maxDice[0] - d1 + 1) / maxDice[0];
                    const prob2 = (maxDice[1] - d2 + 1) / maxDice[1];
                    const prob = prob1 * prob2 * 100;
                    passingCombos.push({
                        dice: [...dice],
                        diceSum: d1 + d2,
                        finalScore: result.finalResult,
                        probability: prob,
                        activeConditionals: result.activeConditionals,
                    });
                }
            }
        }
    }
    else {
        // 3 familiars
        for (let d1 = 1; d1 <= maxDice[0]; d1++) {
            for (let d2 = 1; d2 <= maxDice[1]; d2++) {
                for (let d3 = 1; d3 <= maxDice[2]; d3++) {
                    const dice = [d1, d2, d3];
                    const result = simulateResult(dice, familiarContexts, bonusItems, conditionalBonuses);
                    if (result.finalResult >= difficulty) {
                        // Probability of rolling at least these values
                        const prob1 = (maxDice[0] - d1 + 1) / maxDice[0];
                        const prob2 = (maxDice[1] - d2 + 1) / maxDice[1];
                        const prob3 = (maxDice[2] - d3 + 1) / maxDice[2];
                        const prob = prob1 * prob2 * prob3 * 100;
                        passingCombos.push({
                            dice: [...dice],
                            diceSum: d1 + d2 + d3,
                            finalScore: result.finalResult,
                            probability: prob,
                            activeConditionals: result.activeConditionals,
                        });
                    }
                }
            }
        }
    }
    // Sort by probability descending and take top N
    passingCombos.sort((a, b) => b.probability - a.probability);
    return passingCombos.slice(0, limit);
}
//# sourceMappingURL=reroll-analyzer.js.map