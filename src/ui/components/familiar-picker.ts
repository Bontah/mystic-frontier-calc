/**
 * Familiar picker component for selecting from collection
 */

import type { Familiar } from '../../types/index.js';
import { escapeHtml } from '../../utils/html.js';
import { formatBonusValues } from '../../utils/format.js';
import { store, selectors } from '../../state/store.js';
import { filterAndSortRoster, type RosterFilterOptions } from './roster-item.js';

export interface FamiliarPickerConfig {
  searchInputId: string;
  resultsContainerId: string;
  filterRankId: string;
  filterElementId: string;
  filterTypeId: string;
  onSelect: (familiar: Familiar) => void;
}

/**
 * Render a single picker result item
 */
export function renderPickerItem(familiar: Familiar): string {
  const rankClass = `rank-${familiar.rank.toLowerCase()}`;
  const bonusHtml = familiar.conditional
    ? `<span class="picker-item-bonus">${formatBonusValues(familiar.conditional)}</span>`
    : '';
  const conditionHtml = familiar.conditional
    ? `<div class="picker-item-condition">${escapeHtml(familiar.conditional.name)}</div>`
    : '';

  return `
    <div class="picker-result-item" data-action="select-picker-familiar" data-familiar-id="${familiar.id}">
      <div class="picker-item-row">
        <span class="picker-item-name">${escapeHtml(familiar.name)}</span>
        <span class="picker-item-stats">
          <span class="${rankClass}">${familiar.rank}</span> · ${familiar.element} · ${familiar.type}
        </span>
        ${bonusHtml}
      </div>
      ${conditionHtml}
    </div>
  `;
}

export interface FamiliarPicker {
  refresh: () => void;
  clear: () => void;
  destroy: () => void;
}

/**
 * Create a familiar picker component
 */
export function createFamiliarPicker(config: FamiliarPickerConfig): FamiliarPicker {
  let debounceTimer: number | null = null;

  function getFilterOptions(): RosterFilterOptions {
    return {
      search: (document.getElementById(config.searchInputId) as HTMLInputElement)?.value || '',
      rank: (document.getElementById(config.filterRankId) as HTMLSelectElement)?.value || '',
      element: (document.getElementById(config.filterElementId) as HTMLSelectElement)?.value || '',
      type: (document.getElementById(config.filterTypeId) as HTMLSelectElement)?.value || '',
      wave: '', // Don't filter by wave in picker
      sortBy: 'name',
    };
  }

  function refresh(): void {
    const resultsContainer = document.getElementById(config.resultsContainerId);
    if (!resultsContainer) return;

    const roster = selectors.getCurrentRoster(store.getState());
    // Filter out disabled familiars
    const enabledRoster = roster.filter((f) => !f.disabled);
    const filterOptions = getFilterOptions();
    const filtered = filterAndSortRoster(enabledRoster, filterOptions);

    if (filtered.length === 0) {
      if (enabledRoster.length === 0) {
        resultsContainer.innerHTML = '<div class="picker-empty">No familiars in collection.</div>';
      } else {
        resultsContainer.innerHTML = '<div class="picker-empty">No familiars match filters.</div>';
      }
      return;
    }

    // Limit to 10 visible results
    const displayed = filtered.slice(0, 10);
    const remaining = filtered.length - 10;

    let html = displayed.map(renderPickerItem).join('');
    if (remaining > 0) {
      html += `<div class="picker-more">+${remaining} more. Refine search.</div>`;
    }

    resultsContainer.innerHTML = html;
  }

  function clear(): void {
    const searchInput = document.getElementById(config.searchInputId) as HTMLInputElement;
    const rankSelect = document.getElementById(config.filterRankId) as HTMLSelectElement;
    const elementSelect = document.getElementById(config.filterElementId) as HTMLSelectElement;
    const typeSelect = document.getElementById(config.filterTypeId) as HTMLSelectElement;

    if (searchInput) searchInput.value = '';
    if (rankSelect) rankSelect.value = '';
    if (elementSelect) elementSelect.value = '';
    if (typeSelect) typeSelect.value = '';

    refresh();
  }

  function debouncedRefresh(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      refresh();
      debounceTimer = null;
    }, 200);
  }

  // Set up event listeners
  const searchInput = document.getElementById(config.searchInputId);
  const rankSelect = document.getElementById(config.filterRankId);
  const elementSelect = document.getElementById(config.filterElementId);
  const typeSelect = document.getElementById(config.filterTypeId);
  const resultsContainer = document.getElementById(config.resultsContainerId);

  const handleSearchInput = () => debouncedRefresh();
  const handleFilterChange = () => refresh();
  const handleResultClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const item = target.closest('[data-action="select-picker-familiar"]');
    if (item) {
      const familiarId = parseInt(item.getAttribute('data-familiar-id') || '0', 10);
      const roster = selectors.getCurrentRoster(store.getState());
      const familiar = roster.find((f) => f.id === familiarId);
      if (familiar) {
        config.onSelect(familiar);
      }
    }
  };

  searchInput?.addEventListener('input', handleSearchInput);
  rankSelect?.addEventListener('change', handleFilterChange);
  elementSelect?.addEventListener('change', handleFilterChange);
  typeSelect?.addEventListener('change', handleFilterChange);
  resultsContainer?.addEventListener('click', handleResultClick);

  function destroy(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    searchInput?.removeEventListener('input', handleSearchInput);
    rankSelect?.removeEventListener('change', handleFilterChange);
    elementSelect?.removeEventListener('change', handleFilterChange);
    typeSelect?.removeEventListener('change', handleFilterChange);
    resultsContainer?.removeEventListener('click', handleResultClick);
  }

  return {
    refresh,
    clear,
    destroy,
  };
}
