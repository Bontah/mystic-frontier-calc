/**
 * Unified Conditional Selector
 * Reusable component for selecting conditionals in both modal and roster contexts
 */

import type { ConditionalBonus, Rank } from '../../types/index.js';
import type { TriggerGroup } from '../../types/bonus.js';
import { store } from '../../state/store.js';
import { escapeHtml } from '../../utils/html.js';
import { formatBonusValues } from '../../utils/format.js';

/**
 * Configuration for a conditional selector instance
 */
export interface ConditionalSelectorConfig {
  searchInputId: string;
  resultsContainerId: string;
  variantSectionId: string;
  variantPillsId: string;
  triggerNameId: string;
  displayId: string;
  getRank?: () => string | null;
  prePatchCheckboxId?: string;
  onSelect?: (conditional: ConditionalBonus) => void;
  onClear?: () => void;
}

/**
 * State for a conditional selector instance
 */
interface SelectorState {
  selectedConditional: ConditionalBonus | null;
  selectedTrigger: string | null;
  triggerVariants: ConditionalBonus[];
  triggerMatches: TriggerGroup[];
}

/**
 * Group conditionals by trigger name
 */
function groupConditionsByTrigger(bonuses: ConditionalBonus[]): TriggerGroup[] {
  const grouped = new Map<string, ConditionalBonus[]>();

  for (const bonus of bonuses) {
    const key = bonus.name;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(bonus);
  }

  return Array.from(grouped.entries()).map(([name, variants]) => ({
    name,
    variants,
    variantCount: variants.length,
  }));
}

/**
 * Check if a conditional is bugged (pre-patch)
 */
function isBuggedConditional(bonus: ConditionalBonus): boolean {
  return bonus.prePatch === true;
}

/**
 * Create a conditional selector instance
 */
export function createConditionalSelector(
  config: ConditionalSelectorConfig
): {
  search: () => void;
  selectTrigger: (index: number) => void;
  selectVariant: (index: number) => void;
  clear: () => void;
  showRankBasedTriggers: (rank: Rank) => void;
  getSelected: () => ConditionalBonus | null;
  setSelected: (conditional: ConditionalBonus | null) => void;
  updateDisplay: () => void;
} {
  const state: SelectorState = {
    selectedConditional: null,
    selectedTrigger: null,
    triggerVariants: [],
    triggerMatches: [],
  };

  function getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  function search(): void {
    const searchInput = getElement<HTMLInputElement>(config.searchInputId);
    const resultsContainer = getElement<HTMLElement>(config.resultsContainerId);
    const variantSection = getElement<HTMLElement>(config.variantSectionId);

    if (!searchInput || !resultsContainer) return;

    const query = searchInput.value.toLowerCase().trim();
    const selectedRank = config.getRank?.() || null;
    const prePatch = config.prePatchCheckboxId
      ? getElement<HTMLInputElement>(config.prePatchCheckboxId)?.checked
      : false;

    // Hide variant section when searching
    if (variantSection) {
      variantSection.style.display = 'none';
    }

    if (!query) {
      resultsContainer.style.display = 'none';
      return;
    }

    const allBonuses = store.getState().configConditionalBonuses.bonuses || [];
    const matches = allBonuses.filter((b) => {
      if (!prePatch && selectedRank && b.rarity !== selectedRank) return false;
      return (
        b.name.toLowerCase().includes(query) ||
        b.condition.toLowerCase().includes(query)
      );
    });

    const triggers = groupConditionsByTrigger(matches);
    state.triggerMatches = triggers;

    if (triggers.length === 0) {
      resultsContainer.innerHTML =
        '<div style="padding: 10px; color: #666;">No conditions found</div>';
    } else {
      resultsContainer.innerHTML = triggers
        .slice(0, 15)
        .map(
          (trigger, idx) => `
          <div class="trigger-result-item" data-trigger-index="${idx}">
            <span class="trigger-name">${escapeHtml(trigger.name)}</span>
            <span class="trigger-variants">${trigger.variantCount} variant${trigger.variantCount > 1 ? 's' : ''}</span>
          </div>
        `
        )
        .join('');
    }

    resultsContainer.style.display = 'block';
  }

  function selectTrigger(index: number): void {
    const trigger = state.triggerMatches[index];
    if (!trigger) return;

    const resultsContainer = getElement<HTMLElement>(config.resultsContainerId);
    const variantSection = getElement<HTMLElement>(config.variantSectionId);
    const triggerName = getElement<HTMLElement>(config.triggerNameId);
    const variantPills = getElement<HTMLElement>(config.variantPillsId);

    state.selectedTrigger = trigger.name;
    state.triggerVariants = trigger.variants;

    if (resultsContainer) resultsContainer.style.display = 'none';
    if (triggerName) triggerName.textContent = trigger.name;

    renderVariantPills(variantPills);

    if (variantSection) variantSection.style.display = 'block';
  }

  function renderVariantPills(container: HTMLElement | null): void {
    if (!container) return;

    container.innerHTML = state.triggerVariants
      .map((v, idx) => {
        const stats = formatBonusValues(v);
        const rarity = (v.rarity || v.rank || 'Common').toLowerCase();
        const isBugged = isBuggedConditional(v);
        const isSelected =
          state.selectedConditional && state.selectedConditional.id === v.id;

        return `
          <div class="bonus-pill ${rarity} ${isBugged ? 'bugged' : ''} ${isSelected ? 'selected' : ''}"
               data-variant-index="${idx}">
            <span class="pill-stats">${stats}</span>
            ${isBugged ? '<span class="pill-bugged">BUGGED</span>' : ''}
          </div>
        `;
      })
      .join('');
  }

  function selectVariant(index: number): void {
    const variant = state.triggerVariants[index];
    if (!variant) return;

    state.selectedConditional = variant;
    updateDisplay();
    renderVariantPills(getElement(config.variantPillsId));
    config.onSelect?.(variant);
  }

  function clear(): void {
    const searchInput = getElement<HTMLInputElement>(config.searchInputId);
    const resultsContainer = getElement<HTMLElement>(config.resultsContainerId);
    const variantSection = getElement<HTMLElement>(config.variantSectionId);

    state.selectedConditional = null;
    state.selectedTrigger = null;
    state.triggerVariants = [];
    state.triggerMatches = [];

    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (variantSection) variantSection.style.display = 'none';

    updateDisplay();
    config.onClear?.();
  }

  function updateDisplay(): void {
    const display = getElement<HTMLElement>(config.displayId);
    if (!display) return;

    if (state.selectedConditional) {
      const stats = formatBonusValues(state.selectedConditional);
      display.innerHTML = `
        <div class="cond-info">
          <div class="cond-name">${escapeHtml(state.selectedConditional.name)}</div>
          <div class="cond-stats">${stats}</div>
        </div>
        <button class="remove-cond" data-action="remove-conditional">×</button>
      `;
      display.style.display = 'flex';
    } else {
      display.style.display = 'none';
    }
  }

  function showRankBasedTriggers(rank: Rank): void {
    const allBonuses = store.getState().configConditionalBonuses.bonuses || [];
    const matches = allBonuses.filter((b) => b.rarity === rank);
    const triggers = groupConditionsByTrigger(matches);

    state.triggerMatches = triggers;

    const resultsContainer = getElement<HTMLElement>(config.resultsContainerId);
    if (!resultsContainer) return;

    if (triggers.length === 0) {
      resultsContainer.style.display = 'none';
      return;
    }

    resultsContainer.innerHTML = triggers
      .slice(0, 10)
      .map(
        (trigger, idx) => `
        <div class="trigger-result-item" data-trigger-index="${idx}">
          <span class="trigger-name">${escapeHtml(trigger.name)}</span>
          <span class="trigger-variants">${trigger.variantCount} variant${trigger.variantCount > 1 ? 's' : ''}</span>
        </div>
      `
      )
      .join('');

    resultsContainer.style.display = 'block';
  }

  return {
    search,
    selectTrigger,
    selectVariant,
    clear,
    showRankBasedTriggers,
    getSelected: () => state.selectedConditional,
    setSelected: (conditional: ConditionalBonus | null) => {
      state.selectedConditional = conditional;
      updateDisplay();
    },
    updateDisplay,
  };
}
