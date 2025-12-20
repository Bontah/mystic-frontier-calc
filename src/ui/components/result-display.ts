/**
 * Calculation result display component
 */

import type { CalculationResultWithStatus } from '../../types/index.js';
import { getElementById } from '../../utils/html.js';

/**
 * Update the result display
 */
export function renderResultDisplay(result: CalculationResultWithStatus): void {
  // Dice sum
  const diceSumEl = getElementById<HTMLElement>('diceSum');
  if (diceSumEl) {
    diceSumEl.textContent = String(result.diceSum);
  }

  // Flat bonus
  const flatBonusEl = getElementById<HTMLElement>('flatBonus');
  if (flatBonusEl) {
    flatBonusEl.textContent =
      (result.totalFlat >= 0 ? '+' : '') + result.totalFlat;
  }

  // Multiplier
  const multEl = getElementById<HTMLElement>('totalMult');
  const multContainer = multEl?.closest('.result-stat') as HTMLElement | null;
  if (multEl && multContainer) {
    if (result.totalMultiplier !== null) {
      multContainer.style.display = '';
      multEl.textContent = '×' + result.totalMultiplier.toFixed(2);
    } else {
      multContainer.style.display = 'none';
    }
  }

  // Final result
  const finalResultEl = getElementById<HTMLElement>('finalResult');
  if (finalResultEl) {
    finalResultEl.textContent = String(result.finalResult);
    finalResultEl.className = 'final-result ' + (result.passed ? 'pass' : 'fail');
  }

  // Status
  const statusEl = getElementById<HTMLElement>('resultStatus');
  if (statusEl) {
    statusEl.textContent = result.passed ? 'PASS' : 'FAIL';
    statusEl.className = 'result-status ' + (result.passed ? 'pass' : 'fail');
  }

  // Difference
  const diffEl = getElementById<HTMLElement>('difference');
  if (diffEl) {
    diffEl.textContent =
      result.difference >= 0
        ? `Beat by ${result.difference}`
        : `Failed by ${Math.abs(result.difference)}`;
  }
}

/**
 * Update active conditionals summary
 */
export function updateActiveConditionals(names: string[]): void {
  const container = getElementById<HTMLElement>('waveSummaryConditionals');
  if (!container) return;

  if (names.length === 0) {
    container.innerHTML = '<span class="no-conditionals">No active conditionals</span>';
  } else {
    container.innerHTML = names
      .map((name) => `<span class="conditional-pill">${name}</span>`)
      .join('');
  }
}
