/**
 * Core business logic exports
 */

// Dice utilities
export {
  getMaxDiceForRank,
  getMaxDiceForFamiliars,
  getAverageDiceForRank,
  getAverageDiceForFamiliars,
  generateDiceCombinations,
  countDiceCombinations,
} from './dice.js';

// Conditional evaluation
export {
  evaluateCondition,
  evaluateConditionalBonus,
  evaluateConditionalBonuses,
  clearConditionCache,
} from './conditional-evaluator.js';

// Score calculation
export {
  calculateScore,
  evaluateLineup,
  calculateExpectedScore,
} from './calculator.js';

// Optimizer
export {
  generateCombinations,
  findBestLineup,
  findBestLineupAsync,
  runAllStrategies,
  filterRosterForOptimization,
} from './optimizer.js';

// Reroll analysis
export {
  calculateRerollSuggestions,
  getBestRerollOption,
  canPassWithSingleReroll,
  getRerollSummary,
} from './reroll-analyzer.js';
