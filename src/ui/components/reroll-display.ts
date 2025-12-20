/**
 * Reroll suggestions display component
 */

import type { RerollSuggestion } from '../../types/index.js';
import { getElementById } from '../../utils/html.js';

/**
 * Render reroll suggestions
 */
export function renderRerollSuggestions(
  suggestions: RerollSuggestion[],
  passed: boolean
): void {
  const section = getElementById<HTMLElement>('rerollSection');
  const container = getElementById<HTMLElement>('rerollSuggestions');

  if (!section || !container) return;

  // Hide section if already passing
  if (passed) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  container.innerHTML = suggestions
    .map((s) => {
      let itemClass = 'reroll-item';
      let targetClass = 'reroll-target';
      let targetText = '';

      if (s.passingValues.length === 0) {
        itemClass += ' impossible';
        targetClass += ' impossible';
        targetText = 'Impossible alone';
      } else {
        itemClass += ' can-reroll';
        targetClass += ' possible';
        const passingNums = s.passingValues.map((p) => p.value);
        targetText = `Need: ${passingNums.join(', ')}`;
      }

      return `
        <div class="${itemClass}">
          <div class="reroll-die-name">${s.dieName} (d${s.maxDice})</div>
          <div class="reroll-current">Current: ${s.currentValue} | ${s.rank}</div>
          <div class="${targetClass}">${targetText}</div>
          ${
            s.odds !== null
              ? `<div class="reroll-odds">${s.odds}% chance (${s.passingValues.length}/${s.maxDice})</div>`
              : ''
          }
        </div>
      `;
    })
    .join('');
}

/**
 * Hide reroll section
 */
export function hideRerollSection(): void {
  const section = getElementById<HTMLElement>('rerollSection');
  if (section) {
    section.style.display = 'none';
  }
}
