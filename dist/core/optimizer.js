/**
 * Lineup optimizer
 * Finds optimal familiar combinations using different strategies
 */
import { evaluateLineup, calculateExpectedScore } from './calculator.js';
import { getMaxDiceForFamiliars, getAverageDiceForFamiliars } from './dice.js';
/**
 * Generate all k-combinations from an array
 */
export function generateCombinations(arr, size) {
    const result = [];
    function combine(start, combo) {
        if (combo.length === size) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }
    combine(0, []);
    return result;
}
/**
 * Get dice values based on scoring strategy
 */
function getDiceForStrategy(familiars, strategy) {
    switch (strategy) {
        case 'lowRolls':
            return [1, 1, 1];
        case 'highRolls':
            return getMaxDiceForFamiliars(familiars);
        case 'overall':
        default:
            return getAverageDiceForFamiliars(familiars);
    }
}
/**
 * Get score label for a strategy
 */
function getScoreLabel(familiars, strategy) {
    switch (strategy) {
        case 'lowRolls':
            return 'With 1-1-1';
        case 'highRolls': {
            const maxDice = getMaxDiceForFamiliars(familiars);
            return `With ${maxDice.join('-')}`;
        }
        case 'overall':
        default:
            return 'Expected';
    }
}
/**
 * Find the best lineup using a specific strategy
 */
export function findBestLineup(combinations, bonuses, strategy) {
    let best = null;
    let bestScore = -Infinity;
    for (const combo of combinations) {
        const maxDice = getMaxDiceForFamiliars(combo);
        let score;
        let testDice;
        let result;
        if (strategy === 'overall') {
            // Calculate expected value across all dice combinations
            score = calculateExpectedScore(combo, bonuses, maxDice);
            testDice = getAverageDiceForFamiliars(combo);
            result = evaluateLineup(combo, bonuses, testDice);
        }
        else {
            testDice = getDiceForStrategy(combo, strategy);
            result = evaluateLineup(combo, bonuses, testDice);
            score = result.score;
        }
        if (score > bestScore) {
            bestScore = score;
            best = {
                ...result,
                familiars: combo,
                score: Math.round(score),
                scoreLabel: getScoreLabel(combo, strategy),
                testDice,
            };
        }
    }
    return best;
}
/**
 * Async version of findBestLineup with progress reporting
 * Allows UI to remain responsive during long computations
 */
export async function findBestLineupAsync(combinations, bonuses, strategy, onProgress, shouldCancel) {
    let best = null;
    let bestScore = -Infinity;
    const total = combinations.length;
    let processed = 0;
    const batchSize = 100;
    for (const combo of combinations) {
        // Check for cancellation
        if (shouldCancel?.()) {
            return best;
        }
        const maxDice = getMaxDiceForFamiliars(combo);
        let score;
        let testDice;
        let result;
        if (strategy === 'overall') {
            score = calculateExpectedScore(combo, bonuses, maxDice);
            testDice = getAverageDiceForFamiliars(combo);
            result = evaluateLineup(combo, bonuses, testDice);
        }
        else {
            testDice = getDiceForStrategy(combo, strategy);
            result = evaluateLineup(combo, bonuses, testDice);
            score = result.score;
        }
        if (score > bestScore) {
            bestScore = score;
            best = {
                ...result,
                familiars: combo,
                score: Math.round(score),
                scoreLabel: getScoreLabel(combo, strategy),
                testDice,
            };
        }
        processed++;
        // Report progress and yield to event loop periodically
        if (processed % batchSize === 0) {
            onProgress?.(Math.round((processed / total) * 100));
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }
    onProgress?.(100);
    return best;
}
/**
 * Run all strategies and return results
 */
export async function runAllStrategies(combinations, bonuses, onProgress, shouldCancel) {
    const totalPhases = 3;
    let completedPhases = 0;
    const phaseProgress = (percent) => {
        const overallPercent = Math.round(((completedPhases + percent / 100) / totalPhases) * 100);
        onProgress?.(overallPercent);
    };
    const bestOverall = await findBestLineupAsync(combinations, bonuses, 'overall', phaseProgress, shouldCancel);
    completedPhases++;
    if (shouldCancel?.()) {
        return { bestOverall, bestLow: null, bestHigh: null };
    }
    const bestLow = await findBestLineupAsync(combinations, bonuses, 'lowRolls', phaseProgress, shouldCancel);
    completedPhases++;
    if (shouldCancel?.()) {
        return { bestOverall, bestLow, bestHigh: null };
    }
    const bestHigh = await findBestLineupAsync(combinations, bonuses, 'highRolls', phaseProgress, shouldCancel);
    return { bestOverall, bestLow, bestHigh };
}
/**
 * Filter familiars before optimization
 */
export function filterRosterForOptimization(roster, filters) {
    return roster.filter((fam) => {
        if (filters.elements?.length && !filters.elements.includes(fam.element)) {
            return false;
        }
        if (filters.types?.length && !filters.types.includes(fam.type)) {
            return false;
        }
        // Additional filters can be added here
        return true;
    });
}
//# sourceMappingURL=optimizer.js.map