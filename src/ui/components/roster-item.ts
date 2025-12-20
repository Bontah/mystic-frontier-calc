/**
 * Roster item component
 */

import type { Familiar, Wave } from '../../types/index.js';
import { escapeHtml } from '../../utils/html.js';
import { formatBonusValues } from '../../utils/format.js';

/**
 * Render a roster item
 */
export function renderRosterItem(fam: Familiar): string {
  const rankClass = `rank-${fam.rank.toLowerCase()}`;
  const disabledClass = fam.disabled ? 'disabled' : '';

  let condText = '';
  if (fam.conditional) {
    const stats = formatBonusValues(fam.conditional);
    condText = `<div class="roster-conditional">${escapeHtml(fam.conditional.name)} (${stats})</div>`;
  }

  const waveText = fam.wave ? `Wave ${fam.wave}` : 'No wave';

  return `
    <div class="roster-item ${rankClass} ${disabledClass}" data-familiar-id="${fam.id}">
      <div class="roster-item-info">
        <div class="roster-item-name">${escapeHtml(fam.name)}</div>
        <div class="roster-item-details">
          ${fam.rank} · ${fam.element !== 'None' ? fam.element + ' · ' : ''}${fam.type}
        </div>
        ${condText}
        <div class="roster-item-wave">${waveText}</div>
      </div>
      <div class="roster-item-actions">
        <button class="roster-btn edit" data-action="edit" data-id="${fam.id}">Edit</button>
        <button class="roster-btn toggle" data-action="toggle" data-id="${fam.id}">
          ${fam.disabled ? 'Enable' : 'Disable'}
        </button>
        <button class="roster-btn delete" data-action="delete" data-id="${fam.id}">Delete</button>
      </div>
    </div>
  `;
}

/**
 * Render the full roster list
 */
export function renderRosterList(roster: Familiar[]): string {
  if (roster.length === 0) {
    return '<div class="roster-empty">No familiars in roster. Add one below or use the scanner.</div>';
  }

  // Sort by wave, then by name
  const sorted = [...roster].sort((a, b) => {
    const waveA = a.wave ?? 999;
    const waveB = b.wave ?? 999;
    if (waveA !== waveB) return waveA - waveB;
    return a.name.localeCompare(b.name);
  });

  return sorted.map(renderRosterItem).join('');
}

/**
 * Render wave filter tabs
 */
export function renderWaveFilters(activeWave: Wave | null): string {
  const waves: (Wave | null)[] = [null, 1, 2, 3];

  return waves
    .map((wave) => {
      const active = wave === activeWave ? 'active' : '';
      const label = wave === null ? 'All' : `Wave ${wave}`;
      return `<button class="wave-filter ${active}" data-wave="${wave ?? ''}">${label}</button>`;
    })
    .join('');
}

/**
 * Update roster list in the DOM
 */
export function updateRosterList(roster: Familiar[]): void {
  const container = document.getElementById('rosterList');
  if (container) {
    container.innerHTML = renderRosterList(roster);
  }
}
