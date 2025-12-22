/**
 * Mystic Frontier Calculator
 * Main entry point
 */

import { store, selectors } from './state/store.js';
import { initializePersistence, enableAutoSave } from './state/persistence.js';
import { loadAllConfigs } from './services/config-loader.js';
import { initScanner } from './scanner/index.js';
import {
  setupEventHandlers,
  setupModalCloseButtons,
  calculate,
  updateDiceDropdowns,
  switchCharacter,
} from './ui/index.js';
import { updateFamiliarsGrid } from './ui/components/familiar-card.js';
import { updateRosterList } from './ui/components/roster-item.js';
import type { Character, ConditionalBonus } from './types/index.js';

/**
 * Migrate conditional strings in stored familiars to match current config
 * This ensures any fixes to condition logic are applied to existing data
 */
function migrateConditionalStrings(): void {
  const state = store.getState();
  const configBonuses = state.configConditionalBonuses?.bonuses || [];

  if (configBonuses.length === 0) return;

  // Build lookup map by ID
  const bonusById = new Map<string, ConditionalBonus>();
  for (const bonus of configBonuses) {
    if (bonus.id) {
      bonusById.set(bonus.id, bonus);
    }
  }

  // Helper to migrate a conditional
  const migrateConditional = (cond: ConditionalBonus | null): ConditionalBonus | null => {
    if (!cond?.id) return cond;
    const configBonus = bonusById.get(cond.id);
    if (configBonus && configBonus.condition !== cond.condition) {
      return { ...cond, condition: configBonus.condition };
    }
    return cond;
  };

  let updated = false;

  // Migrate characters' rosters
  const migratedCharacters: Character[] = state.characters.map((char) => {
    const migratedRoster = char.roster.map((fam) => {
      const migratedCond = migrateConditional(fam.conditional);
      if (migratedCond !== fam.conditional) {
        updated = true;
        return { ...fam, conditional: migratedCond };
      }
      return fam;
    });
    return { ...char, roster: migratedRoster };
  });

  // Migrate saved waves
  const migratedWaves = { ...state.savedWaves };
  for (const waveKey of [1, 2, 3] as const) {
    const wave = migratedWaves[waveKey];
    migratedWaves[waveKey] = wave.map((fam) => {
      if (!fam) return fam;
      const migratedCond = migrateConditional(fam.conditional);
      if (migratedCond !== fam.conditional) {
        updated = true;
        return { ...fam, conditional: migratedCond };
      }
      return fam;
    }) as [typeof wave[0], typeof wave[1], typeof wave[2]];
  }

  // Migrate calc familiars
  const migratedCalcFams = state.calcFamiliars.map((fam) => {
    if (!fam) return fam;
    const migratedCond = migrateConditional(fam.conditional);
    if (migratedCond !== fam.conditional) {
      updated = true;
      return { ...fam, conditional: migratedCond };
    }
    return fam;
  }) as typeof state.calcFamiliars;

  if (updated) {
    console.log('Migrated conditional strings to match current config');
    store.setState({
      characters: migratedCharacters,
      savedWaves: migratedWaves,
      calcFamiliars: migratedCalcFams,
    });
  }
}

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  console.log('Mystic Frontier Calculator v2.0.0 initializing...');

  try {
    // Load persisted state from localStorage
    initializePersistence();

    // Load configuration files
    await loadAllConfigs();

    // Migrate any outdated conditional strings
    migrateConditionalStrings();

    // Enable auto-save on state changes
    enableAutoSave();

    // Setup event handlers
    setupEventHandlers();
    setupModalCloseButtons();

    // Initialize scanner (async, non-blocking)
    initScanner().catch((err) => {
      console.warn('Scanner initialization failed:', err);
    });

    // Render initial UI
    renderInitialState();

    // Run initial calculation
    calculate();

    console.log('Mystic Frontier Calculator ready!');
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

/**
 * Render initial UI state
 */
function renderInitialState(): void {
  const state = store.getState();

  // Render calculator familiars
  updateFamiliarsGrid(state.calcFamiliars);

  // Render roster
  const roster = selectors.getCurrentRoster(state);
  updateRosterList(roster);

  // Render character selector
  renderCharacterSelector();

  // Set initial dice values
  initializeDiceDropdowns();
}

/**
 * Render character selector dropdown
 */
function renderCharacterSelector(): void {
  const container = document.getElementById('characterSelector');
  if (!container) return;

  const state = store.getState();
  const characters = state.characters;
  const currentId = state.currentCharacterId;

  const options = characters
    .map(
      (c) =>
        `<option value="${c.id}" ${c.id === currentId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    )
    .join('');

  container.innerHTML = `
    <select id="characterSelect">
      ${options}
    </select>
    <button class="char-btn" data-action="add-character">+</button>
    <button class="char-btn" data-action="rename-character">Rename</button>
    ${characters.length > 1 ? '<button class="char-btn delete" data-action="delete-character">Delete</button>' : ''}
  `;

  // Setup character button events
  setupCharacterButtons();
}

/**
 * Setup character management button events
 */
function setupCharacterButtons(): void {
  document.querySelector('[data-action="add-character"]')?.addEventListener('click', addCharacter);
  document.querySelector('[data-action="rename-character"]')?.addEventListener('click', renameCharacter);
  document.querySelector('[data-action="delete-character"]')?.addEventListener('click', deleteCharacter);

  // Character selector change event
  const charSelect = document.getElementById('characterSelect');
  if (charSelect) {
    charSelect.addEventListener('change', (e) => {
      const id = parseInt((e.target as HTMLSelectElement).value);
      if (!isNaN(id)) {
        switchCharacter(id);
      }
    });
  }
}

/**
 * Add a new character
 */
function addCharacter(): void {
  const name = prompt('Enter character name:');
  if (!name || !name.trim()) return;

  const state = store.getState();
  const newChar = {
    id: Date.now(),
    name: name.trim(),
    roster: [],
  };

  store.setState({
    characters: [...state.characters, newChar],
    currentCharacterId: newChar.id,
  });

  renderCharacterSelector();
  updateRosterList([]);
}

/**
 * Rename current character
 */
function renameCharacter(): void {
  const state = store.getState();
  const currentChar = state.characters.find((c) => c.id === state.currentCharacterId);
  if (!currentChar) return;

  const name = prompt('Enter new name:', currentChar.name);
  if (!name || !name.trim()) return;

  const characters = state.characters.map((c) =>
    c.id === state.currentCharacterId ? { ...c, name: name.trim() } : c
  );

  store.setState({ characters });
  renderCharacterSelector();
}

/**
 * Delete current character
 */
function deleteCharacter(): void {
  const state = store.getState();
  if (state.characters.length <= 1) {
    alert('Cannot delete the last character');
    return;
  }

  const currentChar = state.characters.find((c) => c.id === state.currentCharacterId);
  if (!currentChar) return;

  if (!confirm(`Delete character "${currentChar.name}" and all their familiars?`)) {
    return;
  }

  const characters = state.characters.filter((c) => c.id !== state.currentCharacterId);

  store.setState({
    characters,
    currentCharacterId: characters[0].id,
  });

  renderCharacterSelector();
  const roster = selectors.getCurrentRoster(store.getState());
  updateRosterList(roster);
}

/**
 * Initialize dice dropdowns based on familiar ranks and conditional caps
 */
function initializeDiceDropdowns(): void {
  // Update dropdowns to respect rank maximums and conditional caps
  updateDiceDropdowns();

  // Set all dice to 1 initially
  for (let i = 0; i < 3; i++) {
    const select = document.getElementById(`dice${i + 1}`) as HTMLSelectElement;
    if (select) {
      select.value = '1';
    }
  }
}

/**
 * Escape HTML for safe rendering
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
(window as unknown as { app: { store: typeof store } }).app = { store };
