/**
 * Roster item component
 */
import { escapeHtml } from '../../utils/html.js';
import { formatBonusValues, isBuggedConditional } from '../../utils/format.js';
/**
 * Render a roster item
 */
export function renderRosterItem(fam) {
    const rankClass = `rank-${fam.rank.toLowerCase()}`;
    const disabledClass = fam.disabled ? 'disabled' : '';
    let condText = '';
    let buggedBadge = '';
    if (fam.conditional) {
        const stats = formatBonusValues(fam.conditional);
        const bugWarning = isBuggedConditional(fam.conditional);
        if (bugWarning) {
            buggedBadge = `<span class="bugged-badge" title="${escapeHtml(bugWarning)}">BUGGED</span>`;
        }
        condText = `<div class="roster-conditional">${escapeHtml(fam.conditional.name)} (${stats})</div>`;
    }
    const waveText = fam.wave ? `<div class="roster-item-wave">Wave ${fam.wave}</div>` : '';
    return `
    <div class="roster-item ${rankClass} ${disabledClass}" data-familiar-id="${fam.id}">
      ${buggedBadge}
      <div class="roster-item-info">
        <div class="roster-item-name">${escapeHtml(fam.name)}</div>
        <div class="roster-item-details">
          ${fam.rank} · ${fam.element !== 'None' ? fam.element + ' · ' : ''}${fam.type}
        </div>
        ${condText}
        ${waveText}
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
const RANK_ORDER = {
    'Common': 1,
    'Rare': 2,
    'Epic': 3,
    'Unique': 4,
    'Legendary': 5,
};
/**
 * Filter and sort roster based on options
 */
export function filterAndSortRoster(roster, options) {
    let filtered = [...roster];
    // Search filter (name or conditional)
    if (options.search) {
        const searchLower = options.search.toLowerCase();
        filtered = filtered.filter((f) => f.name.toLowerCase().includes(searchLower) ||
            (f.conditional?.name?.toLowerCase().includes(searchLower) ?? false));
    }
    // Rank filter
    if (options.rank) {
        filtered = filtered.filter((f) => f.rank === options.rank);
    }
    // Element filter
    if (options.element) {
        filtered = filtered.filter((f) => f.element === options.element);
    }
    // Type filter
    if (options.type) {
        filtered = filtered.filter((f) => f.type === options.type);
    }
    // Wave filter
    if (options.wave) {
        if (options.wave === 'none') {
            filtered = filtered.filter((f) => !f.wave);
        }
        else {
            const waveNum = parseInt(options.wave);
            filtered = filtered.filter((f) => f.wave === waveNum);
        }
    }
    // Sorting
    filtered.sort((a, b) => {
        switch (options.sortBy) {
            case 'rank':
                return (RANK_ORDER[b.rank] || 0) - (RANK_ORDER[a.rank] || 0);
            case 'element':
                return a.element.localeCompare(b.element);
            case 'type':
                return a.type.localeCompare(b.type);
            case 'wave':
                const waveA = a.wave ?? 999;
                const waveB = b.wave ?? 999;
                return waveA - waveB;
            case 'name':
            default:
                return a.name.localeCompare(b.name);
        }
    });
    return filtered;
}
/**
 * Render the full roster list
 */
export function renderRosterList(roster, options) {
    const filtered = options ? filterAndSortRoster(roster, options) : roster;
    if (filtered.length === 0) {
        if (roster.length > 0) {
            return '<div class="roster-empty">No familiars match your filters.</div>';
        }
        return '<div class="roster-empty">No familiars in collection. Add one below or use the scanner.</div>';
    }
    return filtered.map(renderRosterItem).join('');
}
/**
 * Render wave filter tabs
 */
export function renderWaveFilters(activeWave) {
    const waves = [null, 1, 2, 3];
    return waves
        .map((wave) => {
        const active = wave === activeWave ? 'active' : '';
        const label = wave === null ? 'All' : `Wave ${wave}`;
        return `<button class="wave-filter ${active}" data-wave="${wave ?? ''}">${label}</button>`;
    })
        .join('');
}
/**
 * Get current filter options from the UI
 */
export function getRosterFilterOptions() {
    return {
        search: document.getElementById('rosterSearchInput')?.value || '',
        rank: document.getElementById('rosterFilterRank')?.value || '',
        element: document.getElementById('rosterFilterElement')?.value || '',
        type: document.getElementById('rosterFilterType')?.value || '',
        wave: document.getElementById('rosterFilterWave')?.value || '',
        sortBy: document.getElementById('rosterSortBy')?.value || 'name',
    };
}
/**
 * Update roster list in the DOM
 */
export function updateRosterList(roster, options) {
    const filterOptions = options || getRosterFilterOptions();
    const filtered = filterAndSortRoster(roster, filterOptions);
    const container = document.getElementById('rosterList');
    if (container) {
        container.innerHTML = renderRosterList(roster, filterOptions);
    }
    // Update roster count (show filtered vs total)
    const countEl = document.getElementById('rosterCount');
    if (countEl) {
        const total = roster.length;
        const shown = filtered.length;
        if (shown === total) {
            countEl.textContent = `${total} familiar${total !== 1 ? 's' : ''} in collection`;
        }
        else {
            countEl.textContent = `Showing ${shown} of ${total} familiars`;
        }
    }
}
//# sourceMappingURL=roster-item.js.map