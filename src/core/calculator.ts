/**
 * Score calculation engine
 * Unified calculation logic used by calculator, optimizer, and reroll analysis
 */

import type {
  CalcFamiliar,
  ConditionalBonus,
  FamiliarContext,
  CalculationResult,
  FamiliarBreakdown,
  LineupEvaluation,
} from '../types/index.js';
import type { BonusItem } from '../types/bonus.js';
import { evaluateConditionalBonus } from './conditional-evaluator.js';

/**
 * Calculate bonuses from items
 */
function calculateItemBonuses(items: BonusItem[]): {
  flat: number;
  multiplier: number;
} {
  let flat = 0;
  let multiplier = 0;

  for (const item of items) {
    flat += item.flatBonus || 0;
    if (item.multiplierBonus !== 0 && item.multiplierBonus !== 1) {
      multiplier += item.multiplierBonus;
    }
  }

  return { flat, multiplier };
}

/**
 * Convert CalcFamiliar to FamiliarContext for condition evaluation
 */
function toFamiliarContext(familiar: CalcFamiliar): FamiliarContext {
  return {
    type: familiar.type,
    element: familiar.element,
    rank: familiar.rank,
  };
}

/**
 * Core calculation function
 * Returns the final score and breakdown
 */
export function calculateScore(
  dice: number[],
  familiars: FamiliarContext[],
  bonusItems: BonusItem[],
  conditionalBonuses: ConditionalBonus[]
): CalculationResult {
  const diceSum = dice.reduce((a, b) => a + b, 0);

  // Calculate item bonuses
  const itemBonuses = calculateItemBonuses(bonusItems);

  // Evaluate conditional bonuses
  let conditionalFlat = 0;
  let conditionalMult = 0;
  const activeConditionalNames: string[] = [];

  for (const cond of conditionalBonuses) {
    const result = evaluateConditionalBonus(cond, dice, familiars);
    if (result.isActive) {
      activeConditionalNames.push(cond.name);
      conditionalFlat += result.flatBonus;
      conditionalMult += result.multiplierBonus;
    }
  }

  // Sum up totals
  const totalFlat = itemBonuses.flat + conditionalFlat;
  const totalMultiplier = itemBonuses.multiplier + conditionalMult;

  // Calculate final result
  const afterFlat = diceSum + totalFlat;
  const finalMultiplier = totalMultiplier !== 0 ? totalMultiplier : null;
  const finalResult = finalMultiplier
    ? Math.floor(afterFlat * finalMultiplier)
    : afterFlat;

  return {
    diceSum,
    totalFlat,
    totalMultiplier: finalMultiplier,
    finalResult,
    activeConditionalNames,
  };
}

/**
 * Evaluate a lineup of familiars (used by optimizer)
 * Includes familiar-specific conditionals in evaluation
 */
export function evaluateLineup(
  familiars: CalcFamiliar[],
  additionalBonuses: ConditionalBonus[],
  dice: number[]
): LineupEvaluation {
  const diceSum = dice.reduce((a, b) => a + b, 0);
  const familiarContexts = familiars.map(toFamiliarContext);

  let totalFlat = 0;
  let totalMult = 0;
  const activeBonusNames: string[] = [];
  const familiarBreakdown: FamiliarBreakdown[] = [];

  // Evaluate each familiar's conditional
  for (let index = 0; index < familiars.length; index++) {
    const fam = familiars[index];
    const breakdown: FamiliarBreakdown = {
      familiarIndex: index,
      name: fam.name,
      element: fam.element,
      type: fam.type,
      rank: fam.rank,
      conditionalTriggered: false,
      conditionalName: null,
      flatContribution: 0,
      multiplierContribution: 0,
    };

    if (fam.conditional) {
      const result = evaluateConditionalBonus(
        fam.conditional,
        dice,
        familiarContexts
      );

      if (result.isActive) {
        breakdown.conditionalTriggered = true;
        breakdown.conditionalName = fam.conditional.name;
        breakdown.flatContribution = result.flatBonus;
        breakdown.multiplierContribution = result.multiplierBonus;

        activeBonusNames.push(fam.conditional.name);
        totalFlat += result.flatBonus;
        totalMult += result.multiplierBonus;
      }
    }

    familiarBreakdown.push(breakdown);
  }

  // Evaluate additional conditional bonuses
  for (const cond of additionalBonuses) {
    const result = evaluateConditionalBonus(cond, dice, familiarContexts);

    if (result.isActive) {
      activeBonusNames.push(cond.name);
      totalFlat += result.flatBonus;
      totalMult += result.multiplierBonus;
    }
  }

  // Calculate final score
  const afterFlat = diceSum + totalFlat;
  const score = totalMult !== 0 ? Math.floor(afterFlat * totalMult) : afterFlat;

  return {
    score,
    diceSum,
    totalFlat,
    totalMult,
    activeBonusNames,
    familiarBreakdown,
  };
}

/**
 * Calculate expected score across all possible dice combinations
 */
export function calculateExpectedScore(
  familiars: CalcFamiliar[],
  additionalBonuses: ConditionalBonus[],
  maxDice: number[]
): number {
  let totalScore = 0;
  let count = 0;

  // Iterate through all dice combinations
  for (let d1 = 1; d1 <= maxDice[0]; d1++) {
    for (let d2 = 1; d2 <= maxDice[1]; d2++) {
      for (let d3 = 1; d3 <= maxDice[2]; d3++) {
        const result = evaluateLineup(familiars, additionalBonuses, [d1, d2, d3]);
        totalScore += result.score;
        count++;
      }
    }
  }

  return count > 0 ? totalScore / count : 0;
}
