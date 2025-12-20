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
} from './ui/index.js';
import { updateFamiliarsGrid } from './ui/components/familiar-card.js';
import { updateRosterList } from './ui/components/roster-item.js';

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
