/**
 * Familiar card component
 */

import type { CalcFamiliar } from '../../types/index.js';
import { escapeHtml } from '../../utils/html.js';
import { formatConditionalDisplay } from '../../utils/format.js';

/**
 * Render an empty familiar slot
 */
export function renderEmptySlot(index: number): string {
  return `
    <div class="familiar-card empty" data-slot="${index}" data-action="add">
      <div class="familiar-card-add">+ Add Familiar ${index + 1}</div>
    </div>
  `;
}

/**
 * Render a familiar card
 */
export function renderFamiliarCard(fam: CalcFamiliar, index: number): string {
  const rankClass = `rank-${fam.rank.toLowerCase()}`;

  let condText: string | null = null;
  if (fam.conditional) {
    condText = formatConditionalDisplay(fam.conditional);
  }

  return `
    <div class="familiar-card ${rankClass}" data-slot="${index}">
      <div class="familiar-card-info">
        <div class="familiar-card-name">${escapeHtml(fam.name || `Familiar ${index + 1}`)}</div>
        <div class="familiar-card-details">
          ${fam.rank} · ${fam.element !== 'None' ? fam.element + ' · ' : ''}${fam.type}
        </div>
        <div class="familiar-card-conditional ${condText ? '' : 'none'}">
          ${condText ? escapeHtml(condText) : 'No conditional'}
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
export function renderFamiliarCards(
  familiars: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null]
): string {
  return familiars
    .map((fam, index) =>
      fam && fam.rank ? renderFamiliarCard(fam, index) : renderEmptySlot(index)
    )
    .join('');
}

/**
 * Update the familiars grid in the DOM
 */
export function updateFamiliarsGrid(
  familiars: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null]
): void {
  const grid = document.getElementById('familiarsGrid');
  if (grid) {
    grid.innerHTML = renderFamiliarCards(familiars);
  }
}
