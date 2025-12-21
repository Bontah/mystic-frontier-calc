/**
 * Lineup optimizer
 * Finds optimal familiar combinations using different strategies
 */

import type {
  CalcFamiliar,
  ConditionalBonus,
  OptimizedLineup,
  ScoringStrategy,
  ProgressCallback,
} from '../types/index.js';
import { evaluateLineup, calculateExpectedScore } from './calculator.js';
import { getMaxDiceForFamiliars, getAverageDiceForFamiliars } from './dice.js';

/**
 * Generate all k-combinations from an array
 */
export function generateCombinations<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];

  function combine(start: number, combo: T[]): void {
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
function getDiceForStrategy(
  familiars: CalcFamiliar[],
  strategy: ScoringStrategy
): number[] {
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
function getScoreLabel(
  familiars: CalcFamiliar[],
  strategy: ScoringStrategy
): string {
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
      return `Avg dice: ${avgDice.map(d => d.toFixed(1)).join('-')}`;
    }
  }
}

/**
 * Find the best lineup using a specific strategy
 */
export function findBestLineup(
  combinations: CalcFamiliar[][],
  bonuses: ConditionalBonus[],
  strategy: ScoringStrategy
): OptimizedLineup | null {
  let best: OptimizedLineup | null = null;
  let bestScore = -Infinity;

  for (const combo of combinations) {
    const maxDice = getMaxDiceForFamiliars(combo);
    let score: number;
    let testDice: number[];
    let result;

    if (strategy === 'overall') {
      // Calculate expected value across all dice combinations
      score = calculateExpectedScore(combo, bonuses, maxDice);
      testDice = getAverageDiceForFamiliars(combo);
      result = evaluateLineup(combo, bonuses, testDice);
    } else {
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
export function findBestLineupFast(
  combinations: CalcFamiliar[][],
  bonuses: ConditionalBonus[],
  strategy: ScoringStrategy
): OptimizedLineup | null {
  let best: OptimizedLineup | null = null;
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
export async function findBestLineupAsync(
  combinations: CalcFamiliar[][],
  bonuses: ConditionalBonus[],
  strategy: ScoringStrategy,
  onProgress?: ProgressCallback,
  shouldCancel?: () => boolean
): Promise<OptimizedLineup | null> {
  let best: OptimizedLineup | null = null;
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
 */
export function runAllStrategiesFast(
  combinations: CalcFamiliar[][],
  bonuses: ConditionalBonus[]
): {
  bestOverall: OptimizedLineup | null;
  bestLow: OptimizedLineup | null;
  bestHigh: OptimizedLineup | null;
} {
  const bestOverall = findBestLineupFast(combinations, bonuses, 'overall');
  const bestLow = findBestLineupFast(combinations, bonuses, 'lowRolls');
  const bestHigh = findBestLineupFast(combinations, bonuses, 'highRolls');

  return { bestOverall, bestLow, bestHigh };
}

/**
 * Run all strategies and return results (async version with progress)
 */
export async function runAllStrategies(
  combinations: CalcFamiliar[][],
  bonuses: ConditionalBonus[],
  onProgress?: ProgressCallback,
  shouldCancel?: () => boolean
): Promise<{
  bestOverall: OptimizedLineup | null;
  bestLow: OptimizedLineup | null;
  bestHigh: OptimizedLineup | null;
}> {
  const totalPhases = 3;
  let completedPhases = 0;

  const phaseProgress = (percent: number) => {
    const overallPercent = Math.round(
      ((completedPhases + percent / 100) / totalPhases) * 100
    );
    onProgress?.(overallPercent);
  };

  const bestOverall = await findBestLineupAsync(
    combinations,
    bonuses,
    'overall',
    phaseProgress,
    shouldCancel
  );
  completedPhases++;

  if (shouldCancel?.()) {
    return { bestOverall, bestLow: null, bestHigh: null };
  }

  const bestLow = await findBestLineupAsync(
    combinations,
    bonuses,
    'lowRolls',
    phaseProgress,
    shouldCancel
  );
  completedPhases++;

  if (shouldCancel?.()) {
    return { bestOverall, bestLow, bestHigh: null };
  }

  const bestHigh = await findBestLineupAsync(
    combinations,
    bonuses,
    'highRolls',
    phaseProgress,
    shouldCancel
  );

  return { bestOverall, bestLow, bestHigh };
}

/**
 * Filter familiars before optimization
 */
export function filterRosterForOptimization(
  roster: CalcFamiliar[],
  filters: {
    elements?: string[];
    types?: string[];
    minRank?: string;
  }
): CalcFamiliar[] {
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
