/**
 * Lineup optimizer
 * Finds optimal familiar combinations using different strategies
 */
import { evaluateLineup, calculateExpectedScore } from './calculator.js';
import { getMaxDiceForFamiliars, getAverageDiceForFamiliars, generateDiceCombinations } from './dice.js';
/**
 * Filter familiars and bonuses by removing ignored conditional IDs
 * Returns new arrays with ignored conditionals nulled/removed
 */
function filterIgnoredConditionals(familiars, bonuses, ignoredIds) {
    if (ignoredIds.length === 0) {
        return { familiars, bonuses };
    }
    // Convert all IDs to strings for consistent comparison
    const ignoredSet = new Set(ignoredIds.map(id => String(id)));
    // Create new familiars with ignored conditionals nulled
    const filteredFamiliars = familiars.map((fam) => {
        if (fam.conditional?.id && ignoredSet.has(fam.conditional.id)) {
            return { ...fam, conditional: null };
        }
        return fam;
    });
    // Filter out ignored bonuses
    const filteredBonuses = bonuses.filter((bonus) => !bonus.id || !ignoredSet.has(bonus.id));
    return { familiars: filteredFamiliars, bonuses: filteredBonuses };
}
/**
 * Filter combinations by removing ignored conditionals from each familiar
 */
function filterCombinationsForStrategy(combinations, bonuses, ignoredIds) {
    if (ignoredIds.length === 0) {
        return { combinations, bonuses };
    }
    // Convert all IDs to strings for consistent comparison
    const ignoredSet = new Set(ignoredIds.map(id => String(id)));
    // Filter each combination's familiars
    const filteredCombinations = combinations.map((combo) => combo.map((fam) => {
        if (fam.conditional?.id && ignoredSet.has(fam.conditional.id)) {
            return { ...fam, conditional: null };
        }
        return fam;
    }));
    // Filter bonuses
    const filteredBonuses = bonuses.filter((bonus) => !bonus.id || !ignoredSet.has(bonus.id));
    return { combinations: filteredCombinations, bonuses: filteredBonuses };
}
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
 * Check if a conditional bonus is dice-independent
 * (doesn't require specific dice rolls to activate)
 */
export function isDiceIndependent(conditional) {
    if (!conditional)
        return true; // No conditional = always active
    if (!conditional.condition)
        return true; // No condition = always active
    if (conditional.condition === 'true')
        return true; // Explicit always-active
    // Check if the condition references 'dice' variable
    return !conditional.condition.includes('dice');
}
/**
 * Check if lineup-composition conditionals will activate for a given lineup
 */
function willConditionalActivate(conditional, familiars) {
    if (!conditional.condition || conditional.condition === 'true') {
        return true;
    }
    // Build familiar context for evaluation
    const familiarContext = familiars.map(f => ({
        type: f.type,
        element: f.element,
        rank: f.rank,
    }));
    try {
        // Safely evaluate the condition with familiars context only
        const conditionFn = new Function('familiars', `return ${conditional.condition}`);
        return conditionFn(familiarContext);
    }
    catch {
        // If evaluation fails, assume it won't activate
        return false;
    }
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
            return 'Score with dice: 1-1-1';
        case 'highRolls': {
            const maxDice = getMaxDiceForFamiliars(familiars);
            return `Score with dice: ${maxDice.join('-')}`;
        }
        case 'overall':
        default: {
            const avgDice = getAverageDiceForFamiliars(familiars);
            const formatted = avgDice.map(d => Number.isInteger(d) ? d.toString() : d.toFixed(1));
            return `Avg dice: ${formatted.join('-')}`;
        }
    }
}
/**
 * Calculate all scores for a lineup across all dice combinations
 */
function getAllScoresForLineup(familiars, bonuses) {
    const scores = [];
    for (const dice of generateDiceCombinations(familiars)) {
        const result = evaluateLineup(familiars, bonuses, dice);
        scores.push(result.score);
    }
    return scores;
}
/**
 * Calculate median of a sorted array
 */
function calculateMedian(sortedScores) {
    const mid = Math.floor(sortedScores.length / 2);
    if (sortedScores.length % 2 === 0) {
        return (sortedScores[mid - 1] + sortedScores[mid]) / 2;
    }
    return sortedScores[mid];
}
/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(scores, mean) {
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
    return Math.sqrt(avgSquaredDiff);
}
/**
 * Calculate floor guarantee percentage
 */
function calculateFloorPercentage(scores, floor) {
    const aboveFloor = scores.filter(s => s >= floor).length;
    return (aboveFloor / scores.length) * 100;
}
/**
 * Find best lineup using median strategy
 */
export function findBestLineupMedian(combinations, bonuses) {
    let best = null;
    let bestMedian = -Infinity;
    for (const combo of combinations) {
        const scores = getAllScoresForLineup(combo, bonuses);
        scores.sort((a, b) => a - b);
        const median = calculateMedian(scores);
        if (median > bestMedian) {
            bestMedian = median;
            const avgDice = getAverageDiceForFamiliars(combo);
            const result = evaluateLineup(combo, bonuses, avgDice);
            best = {
                ...result,
                familiars: combo,
                score: Math.round(median),
                scoreLabel: 'Median of all outcomes',
                testDice: avgDice,
                medianScore: median,
            };
        }
    }
    return best;
}
/**
 * Find lineup with minimum variance (most consistent)
 */
export function findBestLineupMinVariance(combinations, bonuses) {
    let best = null;
    let lowestStdDev = Infinity;
    let bestMean = 0;
    for (const combo of combinations) {
        const scores = getAllScoresForLineup(combo, bonuses);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const stdDev = calculateStandardDeviation(scores, mean);
        // Prefer lower variance, but use mean as tiebreaker
        if (stdDev < lowestStdDev || (stdDev === lowestStdDev && mean > bestMean)) {
            lowestStdDev = stdDev;
            bestMean = mean;
            const avgDice = getAverageDiceForFamiliars(combo);
            const result = evaluateLineup(combo, bonuses, avgDice);
            best = {
                ...result,
                familiars: combo,
                score: Math.round(mean),
                scoreLabel: `Std Dev: ${stdDev.toFixed(1)}`,
                testDice: avgDice,
                standardDeviation: stdDev,
            };
        }
    }
    return best;
}
/**
 * Find lineup with best floor guarantee (80% of outcomes above floor)
 */
export function findBestLineupFloorGuarantee(combinations, bonuses) {
    let best = null;
    let bestFloor = -Infinity;
    for (const combo of combinations) {
        const scores = getAllScoresForLineup(combo, bonuses);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        // Floor is 80% of mean score
        const floorThreshold = mean * 0.8;
        const floorPct = calculateFloorPercentage(scores, floorThreshold);
        // Only consider if 80%+ of outcomes meet the floor
        if (floorPct >= 80) {
            // Among qualifying lineups, prefer higher floor threshold
            if (floorThreshold > bestFloor) {
                bestFloor = floorThreshold;
                const avgDice = getAverageDiceForFamiliars(combo);
                const result = evaluateLineup(combo, bonuses, avgDice);
                best = {
                    ...result,
                    familiars: combo,
                    score: Math.round(floorThreshold),
                    scoreLabel: `${floorPct.toFixed(0)}% above ${Math.round(floorThreshold)}`,
                    testDice: avgDice,
                    floorPercentage: floorPct,
                    floorThreshold,
                };
            }
        }
    }
    // If no lineup meets 80% threshold, find best available
    if (!best && combinations.length > 0) {
        let bestPct = -Infinity;
        for (const combo of combinations) {
            const scores = getAllScoresForLineup(combo, bonuses);
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
            const floorThreshold = mean * 0.8;
            const floorPct = calculateFloorPercentage(scores, floorThreshold);
            if (floorPct > bestPct) {
                bestPct = floorPct;
                const avgDice = getAverageDiceForFamiliars(combo);
                const result = evaluateLineup(combo, bonuses, avgDice);
                best = {
                    ...result,
                    familiars: combo,
                    score: Math.round(floorThreshold),
                    scoreLabel: `${floorPct.toFixed(0)}% above ${Math.round(floorThreshold)}`,
                    testDice: avgDice,
                    floorPercentage: floorPct,
                    floorThreshold,
                };
            }
        }
    }
    return best;
}
/**
 * Find best lineup using balanced weighted scoring (25% low + 50% avg + 25% high)
 */
export function findBestLineupBalanced(combinations, bonuses) {
    let best = null;
    let bestWeightedScore = -Infinity;
    for (const combo of combinations) {
        // Get low roll score (1-1-1)
        const lowResult = evaluateLineup(combo, bonuses, [1, 1, 1]);
        const lowScore = lowResult.score;
        // Get average score
        const avgDice = getAverageDiceForFamiliars(combo);
        const avgResult = evaluateLineup(combo, bonuses, avgDice);
        const avgScore = avgResult.score;
        // Get high roll score
        const maxDice = getMaxDiceForFamiliars(combo);
        const highResult = evaluateLineup(combo, bonuses, maxDice);
        const highScore = highResult.score;
        // Weighted combination: 25% low + 50% avg + 25% high
        const weightedScore = 0.25 * lowScore + 0.50 * avgScore + 0.25 * highScore;
        if (weightedScore > bestWeightedScore) {
            bestWeightedScore = weightedScore;
            best = {
                ...avgResult,
                familiars: combo,
                score: Math.round(weightedScore),
                scoreLabel: 'Weighted (25/50/25)',
                testDice: avgDice,
                balancedComponents: {
                    lowRollScore: lowScore,
                    avgScore: avgScore,
                    highRollScore: highScore,
                },
            };
        }
    }
    return best;
}
/**
 * Find the best lineup with dice-independent conditionals
 * Only considers familiars whose conditionals don't depend on dice rolls
 */
export function findBestLineupDiceIndependent(combinations, bonuses) {
    let best = null;
    let bestScore = -Infinity;
    let bestActiveCount = 0;
    for (const combo of combinations) {
        // Check that all familiars have dice-independent conditionals
        const allDiceIndependent = combo.every(f => isDiceIndependent(f.conditional));
        if (!allDiceIndependent)
            continue;
        // Count how many conditionals will actually activate for this lineup
        let activeCount = 0;
        let guaranteedFlat = 0;
        let guaranteedMult = 1;
        for (const f of combo) {
            if (f.conditional) {
                if (willConditionalActivate(f.conditional, combo)) {
                    activeCount++;
                    guaranteedFlat += f.conditional.flatBonus || 0;
                    guaranteedMult *= f.conditional.multiplierBonus || 1;
                }
            }
        }
        // Calculate score with average dice (since bonuses are guaranteed)
        const avgDice = getAverageDiceForFamiliars(combo);
        const result = evaluateLineup(combo, bonuses, avgDice);
        // Prefer lineups with more active conditionals, then higher scores
        if (activeCount > bestActiveCount || (activeCount === bestActiveCount && result.score > bestScore)) {
            bestActiveCount = activeCount;
            bestScore = result.score;
            best = {
                ...result,
                familiars: combo,
                score: result.score,
                scoreLabel: `${activeCount} guaranteed bonus${activeCount !== 1 ? 'es' : ''}`,
                testDice: avgDice,
            };
        }
    }
    return best;
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
 * Fast synchronous lineup finder
 * Uses average dice for 'overall' strategy instead of calculating all combinations
 */
export function findBestLineupFast(combinations, bonuses, strategy) {
    let best = null;
    let bestScore = -Infinity;
    for (const combo of combinations) {
        const testDice = getDiceForStrategy(combo, strategy);
        const result = evaluateLineup(combo, bonuses, testDice);
        const score = result.score;
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
    const batchSize = 500; // Larger batch for less overhead
    for (const combo of combinations) {
        // Check for cancellation
        if (shouldCancel?.()) {
            return best;
        }
        const testDice = getDiceForStrategy(combo, strategy);
        const result = evaluateLineup(combo, bonuses, testDice);
        const score = result.score;
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
 * Run all strategies and return results (fast synchronous version)
 * Uses optimizer config to filter ignored conditionals and skip disabled strategies
 */
export function runAllStrategiesFast(combinations, bonuses, config) {
    const strategies = config?.strategies;
    // Helper to run a strategy with its config
    const runStrategy = (strategyKey, finder) => {
        const strategyConfig = strategies?.[strategyKey];
        // Skip if disabled
        if (strategyConfig && !strategyConfig.enabled) {
            return null;
        }
        // Filter ignored conditionals
        const ignoredIds = strategyConfig?.ignoredConditionalIds ?? [];
        const { combinations: filteredCombos, bonuses: filteredBonuses } = filterCombinationsForStrategy(combinations, bonuses, ignoredIds);
        return finder(filteredCombos, filteredBonuses);
    };
    // Basic strategies (fast - single evaluation per combo)
    const bestOverall = runStrategy('overall', (c, b) => findBestLineupFast(c, b, 'overall'));
    const bestLow = runStrategy('lowRolls', (c, b) => findBestLineupFast(c, b, 'lowRolls'));
    const bestHigh = runStrategy('highRolls', (c, b) => findBestLineupFast(c, b, 'highRolls'));
    // Advanced strategies (require evaluating all dice combos)
    const bestMedian = runStrategy('median', findBestLineupMedian);
    const bestMinVariance = findBestLineupMinVariance(combinations, bonuses); // Keep for backwards compat
    const bestFloorGuarantee = runStrategy('floorGuarantee', findBestLineupFloorGuarantee);
    const bestBalanced = runStrategy('balanced', findBestLineupBalanced);
    return {
        bestOverall,
        bestLow,
        bestHigh,
        bestMedian,
        bestMinVariance,
        bestFloorGuarantee,
        bestBalanced,
    };
}
/**
 * Run all strategies and return results (async version with progress)
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