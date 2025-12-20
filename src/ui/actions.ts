/**
 * UI Actions
 * Functions that handle user interactions and update state
 */

import { store, selectors } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { calculateScore, calculateRerollSuggestions } from '../core/index.js';
import type { CalcFamiliar, Wave, Familiar, ConditionalBonus } from '../types/index.js';
import { renderResultDisplay, updateActiveConditionals } from './components/result-display.js';
import { renderRerollSuggestions } from './components/reroll-display.js';
import { updateFamiliarsGrid } from './components/familiar-card.js';
import { updateRosterList } from './components/roster-item.js';

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
 * Perform calculation and update display
 */
export function calculate(): void {
  const state = store.getState();
  const familiars = state.calcFamiliars.filter(
    (f): f is CalcFamiliar => f !== null && f.rank !== undefined
  );

  if (familiars.length === 0) {
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

  // Update display
  renderResultDisplay({ ...result, passed, difference });
  updateActiveConditionals(result.activeConditionalNames);

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
