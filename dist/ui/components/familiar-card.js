/**
 * Familiar card component
 */
import { escapeHtml } from '../../utils/html.js';
import { formatConditionalDisplay, isBuggedConditional } from '../../utils/format.js';
/**
 * Render an empty familiar slot
 */
export function renderEmptySlot(index) {
    return `
    <div class="familiar-card empty" data-slot="${index}" data-action="add">
      <div class="familiar-card-add">+ Add Familiar ${index + 1}</div>
    </div>
  `;
}
/**
 * Render a familiar card
 */
export function renderFamiliarCard(fam, index) {
    const rankClass = `rank-${fam.rank.toLowerCase()}`;
    let condText = null;
    let bugWarning = false;
    if (fam.conditional) {
        condText = formatConditionalDisplay(fam.conditional);
        bugWarning = isBuggedConditional(fam.conditional);
    }
    const warningHtml = bugWarning ? `<span class="bugged-badge" title="${escapeHtml(bugWarning)}">BUGGED</span>` : '';
    return `
    <div class="familiar-card ${rankClass}" data-slot="${index}">
      <div class="familiar-card-info">
        <div class="familiar-card-name">${escapeHtml(fam.name || `Familiar ${index + 1}`)}</div>
        <div class="familiar-card-details">
          ${fam.rank} · ${fam.element !== 'None' ? fam.element + ' · ' : ''}${fam.type}
        </div>
        <div class="familiar-card-conditional ${condText ? '' : 'none'}">
          ${condText ? escapeHtml(condText) : 'No conditional'} ${warningHtml}
        </div>
      </div>
      <div class="familiar-card-actions">
        <button class="familiar-edit-btn" data-action="edit" data-slot="${index}">Edit</button>
        <button class="familiar-delete-btn" data-action="delete" data-slot="${index}">×</button>
      </div>
    </div>
  `;
}
/**
 * Render all familiar cards in the calculator
 */
export function renderFamiliarCards(familiars) {
    return familiars
        .map((fam, index) => fam && fam.rank ? renderFamiliarCard(fam, index) : renderEmptySlot(index))
        .join('');
}
/**
 * Update the familiars grid in the DOM
 */
export function updateFamiliarsGrid(familiars) {
    const grid = document.getElementById('familiarsGrid');
    if (grid) {
        grid.innerHTML = renderFamiliarCards(familiars);
    }
}
//# sourceMappingURL=familiar-card.js.map