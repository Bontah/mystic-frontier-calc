/**
 * Reroll suggestions display component
 */
import { getElementById } from '../../utils/html.js';
/**
 * Render reroll suggestions
 */
export function renderRerollSuggestions(suggestions, passed) {
    const section = getElementById('rerollSection');
    const container = getElementById('rerollSuggestions');
    if (!section || !container)
        return;
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
        }
        else {
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
          ${s.odds !== null
            ? `<div class="reroll-odds">${s.odds}% chance (${s.passingValues.length}/${s.maxDice})</div>`
            : ''}
        </div>
      `;
    })
        .join('');
}
/**
 * Hide reroll section
 */
export function hideRerollSection() {
    const section = getElementById('rerollSection');
    if (section) {
        section.style.display = 'none';
    }
}
/**
 * Render passing combinations result
 */
export function renderPassingCombinations(combinations) {
    const container = getElementById('passingCombosResult');
    if (!container)
        return;
    if (combinations.length === 0) {
        container.innerHTML = `
      <div class="passing-combos-empty">
        Cannot pass with current lineup
      </div>
    `;
        container.style.display = 'block';
        return;
    }
    const combosHtml = combinations.map((combo, index) => {
        const diceStr = combo.dice.map((d, i) => `<span class="combo-die">D${i + 1}: ${d}</span>`).join('');
        const probStr = combo.probability.toFixed(1);
        return `
      <div class="passing-combo">
        <div class="combo-rank">#${index + 1}</div>
        <div class="combo-dice">${diceStr}</div>
        <div class="combo-score">Score: ${combo.finalScore}</div>
        <div class="combo-probability">${probStr}%</div>
      </div>
    `;
    }).join('');
    container.innerHTML = `
    <div class="passing-combos-header">Top Passing Combinations</div>
    <div class="passing-combos-list">
      ${combosHtml}
    </div>
  `;
    container.style.display = 'block';
}
/**
 * Hide passing combinations result
 */
export function hidePassingCombinations() {
    const container = getElementById('passingCombosResult');
    if (container) {
        container.style.display = 'none';
    }
}
//# sourceMappingURL=reroll-display.js.map