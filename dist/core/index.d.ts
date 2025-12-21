/**
 * Core business logic exports
 */
export { getMaxDiceForRank, getMaxDiceForFamiliars, getAverageDiceForRank, getAverageDiceForFamiliars, generateDiceCombinations, countDiceCombinations, getDiceCapFromConditional, getEffectiveDiceCap, getGlobalDiceCap, } from './dice.js';
export { evaluateCondition, evaluateConditionalBonus, evaluateConditionalBonuses, clearConditionCache, } from './conditional-evaluator.js';
export { calculateScore, evaluateLineup, calculateExpectedScore, } from './calculator.js';
export { generateCombinations, findBestLineup, findBestLineupAsync, runAllStrategies, filterRosterForOptimization, } from './optimizer.js';
export { calculateRerollSuggestions, getBestRerollOption, canPassWithSingleReroll, getRerollSummary, findTopPassingCombinations, } from './reroll-analyzer.js';
//# sourceMappingURL=index.d.ts.map