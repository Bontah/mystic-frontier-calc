/**
 * Calculation result display component
 */

import type { CalculationResultWithStatus, ConditionalBonus } from '../../types/index.js';
import { getElementById } from '../../utils/html.js';

/**
 * Conditional display data
 */
export interface ConditionalDisplayData {
  conditional: ConditionalBonus;
  isActive: boolean;
  familiarName?: string;
}

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
 * Format bonus values for display
 */
function formatBonusValues(flat: number, mult: number): string {
  const parts: string[] = [];
  if (flat !== 0) {
    parts.push(`<span class="cond-flat">${flat >= 0 ? '+' : ''}${flat}</span>`);
  }
  if (mult !== 0 && mult !== 1) {
    parts.push(`<span class="cond-mult">×${mult.toFixed(2)}</span>`);
  }
  return parts.length > 0 ? parts.join(' ') : '';
}

/**
 * Update active conditionals summary
 */
export function updateActiveConditionals(conditionals: ConditionalDisplayData[]): void {
  const container = getElementById<HTMLElement>('waveSummaryConditionals');
  if (!container) return;

  if (conditionals.length === 0) {
    container.innerHTML = '<span class="no-conditionals">No conditionals</span>';
  } else {
    container.innerHTML = conditionals
      .map((data) => {
        const { conditional, isActive, familiarName } = data;
        const statusClass = isActive ? 'active' : 'inactive';
        const bonusText = formatBonusValues(conditional.flatBonus, conditional.multiplierBonus);
        const nameDisplay = familiarName
          ? `<span class="cond-familiar">${familiarName}:</span> ${conditional.name}`
          : conditional.name;

        return `<span class="conditional-pill ${statusClass}">
          <span class="cond-name">${nameDisplay}</span>
          ${bonusText ? `<span class="cond-values">${bonusText}</span>` : ''}
        </span>`;
      })
      .join('');
  }
}
