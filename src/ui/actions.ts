/**
 * UI Actions
 * Functions that handle user interactions and update state
 */

import { store, selectors } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { calculateScore, calculateRerollSuggestions, evaluateConditionalBonus } from '../core/index.js';
import type { CalcFamiliar, Wave, Familiar, ConditionalBonus } from '../types/index.js';
import type { BonusItem } from '../types/bonus.js';
import { renderResultDisplay, updateActiveConditionals, type ConditionalDisplayData } from './components/result-display.js';
import { renderRerollSuggestions } from './components/reroll-display.js';
import { updateFamiliarsGrid } from './components/familiar-card.js';
import { updateRosterList } from './components/roster-item.js';
import { escapeHtml } from '../utils/html.js';

/**
 * Get current dice values from the DOM
 */
function getDiceValues(): number[] {
  const dice: number[] = [];
  const state = store.getState();

  for (let i = 0; i < 3; i++) {
    const fam = state.calcFamiliars[i];
    if (fam && fam.rank) {
      const input = document.getElementById(`dice${i + 1}`) as HTMLSelectElement;
      dice.push(parseInt(input?.value) || 1);
    }
  }

  return dice;
}

/**
 * Get current difficulty from the DOM
 */
function getDifficulty(): number {
  const input = document.getElementById('difficulty') as HTMLInputElement;
  return parseInt(input?.value) || 0;
}

/**
 * Update the disabled state of calculator sections
 */
function updateCalculatorDisabledState(disabled: boolean): void {
  const calcRow = document.querySelector('.calc-row') as HTMLElement;
  const results = document.querySelector('.results') as HTMLElement;

  if (calcRow) {
    calcRow.classList.toggle('calculator-disabled', disabled);
  }
  if (results) {
    results.classList.toggle('calculator-disabled', disabled);
  }
}

/**
 * Perform calculation and update display
 */
export function calculate(): void {
  const state = store.getState();
  const familiars = state.calcFamiliars.filter(
    (f): f is CalcFamiliar => f !== null && f.rank !== undefined
  );

  // Update disabled state for calculator sections
  updateCalculatorDisabledState(familiars.length === 0);

  if (familiars.length === 0) {
    // Clear the conditionals display when no familiars
    updateActiveConditionals([]);
    return;
  }

  const dice = getDiceValues();
  const difficulty = getDifficulty();

  // Get familiar contexts for calculation
  const familiarContexts = familiars.map((f) => ({
    type: f.type,
    element: f.element,
    rank: f.rank,
  }));

  // Collect all conditionals (from familiars + user-added)
  const allConditionals: ConditionalBonus[] = [
    ...familiars.filter((f) => f.conditional).map((f) => f.conditional!),
    ...state.conditionalBonuses,
  ];

  // Calculate score
  const result = calculateScore(
    dice,
    familiarContexts,
    state.bonusItems,
    allConditionals
  );

  // Add pass/fail info
  const passed = result.finalResult >= difficulty;
  const difference = result.finalResult - difficulty;

  // Build conditionals display data with active status
  const conditionalsDisplayData: ConditionalDisplayData[] = [];

  // Add familiar conditionals with their familiar names
  for (const fam of familiars) {
    if (fam.conditional) {
      const evalResult = evaluateConditionalBonus(fam.conditional, dice, familiarContexts);
      conditionalsDisplayData.push({
        conditional: fam.conditional,
        isActive: evalResult.isActive,
        familiarName: fam.name,
      });
    }
  }

  // Add user-added conditionals (no familiar name)
  for (const cond of state.conditionalBonuses) {
    const evalResult = evaluateConditionalBonus(cond, dice, familiarContexts);
    conditionalsDisplayData.push({
      conditional: cond,
      isActive: evalResult.isActive,
    });
  }

  // Update display
  renderResultDisplay({ ...result, passed, difference });
  updateActiveConditionals(conditionalsDisplayData);

  // Update active bonus items display
  const activeBonusesEl = document.getElementById('activeBonusesDisplay');
  if (activeBonusesEl) {
    if (state.bonusItems.length > 0) {
      const itemsHtml = state.bonusItems.map(item => {
        const flatStr = item.flatBonus !== 0 ? `+${item.flatBonus}` : '';
        const multStr = item.multiplierBonus && item.multiplierBonus !== 0 && item.multiplierBonus !== 1
          ? `×${item.multiplierBonus}` : '';
        return `<span class="active-item">${escapeHtml(item.name)} (${flatStr}${flatStr && multStr ? ', ' : ''}${multStr})</span>`;
      }).join(', ');
      activeBonusesEl.innerHTML = `<strong>Active Items:</strong> ${itemsHtml}`;
    } else {
      activeBonusesEl.innerHTML = '';
    }
  }

  // Calculate reroll suggestions
  const familiarsWithRank = familiars.map((f) => ({
    type: f.type,
    element: f.element,
    rank: f.rank,
  }));

  const rerollSuggestions = calculateRerollSuggestions(
    dice,
    familiarsWithRank,
    state.bonusItems,
    allConditionals,
    difficulty
  );

  renderRerollSuggestions(rerollSuggestions, passed);
}

/**
 * Set a familiar in a calculator slot
 */
export function setCalcFamiliar(slot: number, familiar: CalcFamiliar | null): void {
  store.setState((state) => {
    const calcFamiliars = [...state.calcFamiliars] as typeof state.calcFamiliars;
    calcFamiliars[slot] = familiar;
    return { calcFamiliars };
  });

  updateFamiliarsGrid(store.getState().calcFamiliars);
  calculate();
}

/**
 * Delete a familiar from calculator slot
 */
export function deleteCalcFamiliar(slot: number): void {
  setCalcFamiliar(slot, null);
}

/**
 * Reset all calculator familiars
 */
export function resetAllFamiliars(): void {
  store.setState({
    calcFamiliars: [null, null, null],
    currentWave: null,
  });

  updateFamiliarsGrid(store.getState().calcFamiliars);
  calculate();

  // Clear wave selection UI
  document.querySelectorAll('.wave-tab').forEach((tab) => {
    tab.classList.remove('active');
  });

  const label = document.getElementById('currentWaveLabel');
  if (label) label.textContent = '';
}

/**
 * Load a wave lineup into calculator
 */
export function loadWave(wave: Wave): void {
  const state = store.getState();
  const roster = selectors.getCurrentRoster(state);
  const waveFamiliars = roster.filter(
    (f) => f.wave === wave && !f.disabled
  );

  // Take first 3 familiars from wave
  const calcFamiliars: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null] = [null, null, null];

  waveFamiliars.slice(0, 3).forEach((fam, idx) => {
    calcFamiliars[idx] = {
      name: fam.name,
      rank: fam.rank,
      element: fam.element,
      type: fam.type,
      conditional: fam.conditional,
    };
  });

  store.setState({
    calcFamiliars,
    currentWave: wave,
  });

  updateFamiliarsGrid(calcFamiliars);

  // Update wave tabs
  document.querySelectorAll('.wave-tab').forEach((tab) => {
    tab.classList.remove('active');
    if (tab.classList.contains(`wave-${wave}`)) {
      tab.classList.add('active');
    }
  });

  const label = document.getElementById('currentWaveLabel');
  if (label) label.textContent = `(Wave ${wave})`;

  calculate();
}

/**
 * Save current lineup to wave
 */
export function saveToCurrentWave(): void {
  const state = store.getState();
  const wave = state.currentWave;

  if (!wave) {
    alert('Please select a wave first');
    return;
  }

  // Get current character
  const charIdx = state.characters.findIndex(
    (c) => c.id === state.currentCharacterId
  );
  if (charIdx === -1) return;

  // Update roster - assign current familiars to this wave
  const characters = [...state.characters];
  const roster = [...characters[charIdx].roster];

  // First, unassign all familiars from this wave
  roster.forEach((f) => {
    if (f.wave === wave) {
      f.wave = null;
    }
  });

  // Then assign new familiars (matching by name for simplicity)
  state.calcFamiliars.forEach((calcFam) => {
    if (calcFam) {
      const rosterFam = roster.find((f) => f.name === calcFam.name);
      if (rosterFam) {
        rosterFam.wave = wave;
      }
    }
  });

  characters[charIdx].roster = roster;
  store.setState({ characters });
  saveState();
}

/**
 * Add familiar to roster
 */
export function addFamiliarToRoster(familiar: Omit<Familiar, 'id'>): void {
  const state = store.getState();
  const charIdx = state.characters.findIndex(
    (c) => c.id === state.currentCharacterId
  );
  if (charIdx === -1) return;

  const newFamiliar: Familiar = {
    ...familiar,
    id: Date.now(),
  };

  const characters = [...state.characters];
  characters[charIdx].roster = [...characters[charIdx].roster, newFamiliar];

  store.setState({ characters });
  saveState();
  updateRosterList(characters[charIdx].roster);
}

/**
 * Delete familiar from roster
 */
export function deleteFamiliarFromRoster(id: number): void {
  const state = store.getState();
  const charIdx = state.characters.findIndex(
    (c) => c.id === state.currentCharacterId
  );
  if (charIdx === -1) return;

  const characters = [...state.characters];
  characters[charIdx].roster = characters[charIdx].roster.filter(
    (f) => f.id !== id
  );

  store.setState({ characters });
  saveState();
  updateRosterList(characters[charIdx].roster);
}

/**
 * Toggle familiar disabled state
 */
export function toggleFamiliarDisabled(id: number): void {
  const state = store.getState();
  const charIdx = state.characters.findIndex(
    (c) => c.id === state.currentCharacterId
  );
  if (charIdx === -1) return;

  const characters = [...state.characters];
  const roster = [...characters[charIdx].roster];
  const famIdx = roster.findIndex((f) => f.id === id);

  if (famIdx !== -1) {
    roster[famIdx] = { ...roster[famIdx], disabled: !roster[famIdx].disabled };
    characters[charIdx].roster = roster;

    store.setState({ characters });
    saveState();
    updateRosterList(roster);
  }
}

/**
 * Switch to a different character
 */
export function switchCharacter(id: number): void {
  store.setState({
    currentCharacterId: id,
    currentWave: null,
  });
  saveState();

  // Update roster display
  const roster = selectors.getCurrentRoster(store.getState());
  updateRosterList(roster);

  // Clear wave selection
  document.querySelectorAll('.wave-tab').forEach((tab) => {
    tab.classList.remove('active');
  });

  const label = document.getElementById('currentWaveLabel');
  if (label) label.textContent = '';
}

/**
 * Add a bonus item
 */
export function addBonusItem(item: BonusItem): void {
  store.setState((state) => ({
    bonusItems: [...state.bonusItems, item],
  }));
  saveState();
  renderBonusItemsList();
  calculate();
}

/**
 * Delete a bonus item by index
 */
export function deleteBonusItem(index: number): void {
  store.setState((state) => ({
    bonusItems: state.bonusItems.filter((_, i) => i !== index),
  }));
  saveState();
  renderBonusItemsList();
  calculate();
}

/**
 * Render the bonus items list
 */
export function renderBonusItemsList(): void {
  const container = document.getElementById('bonusItemsList');
  if (!container) return;

  const { bonusItems } = store.getState();

  if (bonusItems.length === 0) {
    container.innerHTML = '<div class="no-items">No bonus items added. Click "+ Add Item" to add one.</div>';
    return;
  }

  container.innerHTML = bonusItems
    .map((item, index) => {
      const flatClass = item.flatBonus < 0 ? 'flat negative' : 'flat';
      const flatStr =
        item.flatBonus !== 0
          ? `<span class="${flatClass}">${item.flatBonus >= 0 ? '+' : ''}${item.flatBonus} flat</span>`
          : '';
      const multStr =
        item.multiplierBonus !== 1 && item.multiplierBonus !== 0
          ? `<span class="mult">×${item.multiplierBonus}</span>`
          : '';
      const separator = flatStr && multStr ? ', ' : '';

      return `
        <div class="bonus-item">
          <span class="bonus-name">${escapeHtml(item.name)}</span>
          <span class="bonus-stats">${flatStr}${separator}${multStr}</span>
          <button class="delete-btn" data-action="delete-bonus-item" data-index="${index}">Delete</button>
        </div>
      `;
    })
    .join('');
}

/**
 * Search bonus items and render results
 */
export function searchBonusItems(query: string): void {
  const resultsContainer = document.getElementById('bonusItemSearchResults');
  if (!resultsContainer) return;

  const state = store.getState();
  const items = state.configBonusItems.items || [];

  if (!query.trim()) {
    resultsContainer.innerHTML = '<div class="search-prompt">Type to search for items...</div>';
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matches = items.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(lowerQuery);
    const descMatch = item.description?.toLowerCase().includes(lowerQuery);
    return nameMatch || descMatch;
  });

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No items found</div>';
    return;
  }

  resultsContainer.innerHTML = matches
    .map((item, index) => {
      const flatStr =
        item.flatBonus !== 0
          ? `<span class="flat${item.flatBonus < 0 ? ' negative' : ''}">${
              item.flatBonus >= 0 ? '+' : ''
            }${item.flatBonus}</span>`
          : '';
      const multStr =
        item.multiplierBonus && item.multiplierBonus !== 0
          ? `<span class="mult">×${item.multiplierBonus}</span>`
          : '';
      const descStr = item.description || '';

      return `
        <div class="bonus-item-result" data-action="apply-bonus-item" data-item-index="${index}" data-query="${escapeHtml(query)}">
          <div class="bonus-item-result-info">
            <div class="bonus-item-result-name">${escapeHtml(item.name)}</div>
            <div class="bonus-item-result-stats">${flatStr}${flatStr && multStr ? ' ' : ''}${multStr}</div>
            ${descStr ? `<div class="bonus-item-result-desc">${escapeHtml(descStr)}</div>` : ''}
          </div>
          <button class="apply-btn">Add</button>
        </div>
      `;
    })
    .join('');
}

/**
 * Apply a bonus item from search results
 */
export function applyBonusItemFromSearch(itemIndex: number, query: string): void {
  const state = store.getState();
  const items = state.configBonusItems.items || [];

  const lowerQuery = query.toLowerCase();
  const matches = items.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(lowerQuery);
    const descMatch = item.description?.toLowerCase().includes(lowerQuery);
    return nameMatch || descMatch;
  });

  const item = matches[itemIndex];
  if (!item) return;

  addBonusItem({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: item.name,
    description: item.description || '',
    flatBonus: item.flatBonus || 0,
    multiplierBonus: item.multiplierBonus || 0,
  });

  // Close the modal
  const modal = document.getElementById('bonusItemModal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Clear the search
  const searchInput = document.getElementById('bonusItemSearch') as HTMLInputElement;
  if (searchInput) {
    searchInput.value = '';
  }
  searchBonusItems('');
}
