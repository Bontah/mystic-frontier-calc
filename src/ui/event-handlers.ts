/**
 * Event handlers setup
 * Uses event delegation for better performance
 */

import { store, selectors } from '../state/store.js';
import { showPage, setupNavigation } from './navigation.js';
import {
  calculate,
  setCalcFamiliar,
  deleteCalcFamiliar,
  resetAllFamiliars,
  loadWave,
  saveToWave,
  addFamiliarToRoster,
  deleteFamiliarFromRoster,
  toggleFamiliarDisabled,
  deleteBonusItem,
  searchBonusItems,
  applyBonusItemFromSearch,
  renderBonusItemsList,
  calculatePassingCombinations,
} from './actions.js';
import { updateRosterList } from './components/roster-item.js';
import { createIconDropdown, RANK_OPTIONS, ELEMENT_OPTIONS, TYPE_OPTIONS } from './components/icon-dropdown.js';
import { saveState } from '../state/persistence.js';
import { createConditionalSelector } from './conditional-selector/index.js';
import { showToast } from './toast.js';
import { generateCombinations, runAllStrategiesFast } from '../core/optimizer.js';
import { escapeHtml } from '../utils/html.js';
import type { Wave, Rank, CalcFamiliar, Familiar, OptimizedLineup } from '../types/index.js';

// Module-level conditional selector instances
let modalConditionalSelector: ReturnType<typeof createConditionalSelector> | null = null;
let rosterConditionalSelector: ReturnType<typeof createConditionalSelector> | null = null;

// Module-level icon dropdown instances
let modalRankDropdown: ReturnType<typeof createIconDropdown> | null = null;
let modalElementDropdown: ReturnType<typeof createIconDropdown> | null = null;
let modalTypeDropdown: ReturnType<typeof createIconDropdown> | null = null;
let rosterRankDropdown: ReturnType<typeof createIconDropdown> | null = null;
let rosterElementDropdown: ReturnType<typeof createIconDropdown> | null = null;
let rosterTypeDropdown: ReturnType<typeof createIconDropdown> | null = null;

/**
 * Setup all event handlers
 */
export function setupEventHandlers(): void {
  setupNavigation();
  setupCalculatorEvents();
  setupRosterEvents();
  setupDiceEvents();
  setupWaveEvents();
  setupKeyboardShortcuts();
  setupIconDropdowns();
  setupModalConditionalSelector();
  setupRosterConditionalSelector();
  setupFamiliarModalSave();
  setupRosterFormEvents();
  setupBonusItemEvents();
  setupPassingCombosButton();
  setupOptimizerEvents();

  // Initial render of bonus items list
  renderBonusItemsList();
}

/**
 * Setup icon dropdowns for element and type selection
 */
function setupIconDropdowns(): void {
  // Modal dropdowns
  modalRankDropdown = createIconDropdown({
    containerId: 'familiarEditRankContainer',
    options: RANK_OPTIONS,
    defaultValue: '',
    onChange: () => {
      // Trigger conditional search update when rank changes
      modalConditionalSelector?.search();
    },
  });

  modalElementDropdown = createIconDropdown({
    containerId: 'familiarEditElementContainer',
    options: ELEMENT_OPTIONS,
    defaultValue: 'None',
  });

  modalTypeDropdown = createIconDropdown({
    containerId: 'familiarEditTypeContainer',
    options: TYPE_OPTIONS,
    defaultValue: 'Human',
  });

  // Roster form dropdowns
  rosterRankDropdown = createIconDropdown({
    containerId: 'rosterRankContainer',
    options: RANK_OPTIONS,
    defaultValue: 'Common',
    onChange: () => {
      // Trigger conditional search update when rank changes
      rosterConditionalSelector?.search();
    },
  });

  rosterElementDropdown = createIconDropdown({
    containerId: 'rosterElementContainer',
    options: ELEMENT_OPTIONS,
    defaultValue: 'None',
  });

  rosterTypeDropdown = createIconDropdown({
    containerId: 'rosterTypeContainer',
    options: TYPE_OPTIONS,
    defaultValue: 'Human',
  });
}

/**
 * Setup calculator-related events
 */
function setupCalculatorEvents(): void {
  // Familiars grid click delegation
  const familiarsGrid = document.getElementById('familiarsGrid');
  if (familiarsGrid) {
    familiarsGrid.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      const slotAttr = target.getAttribute('data-slot');
      const slot = slotAttr !== null ? parseInt(slotAttr) : -1;

      if (action === 'add' || action === 'edit') {
        // Open familiar modal
        openFamiliarModal(slot);
      } else if (action === 'delete' && slot >= 0) {
        deleteCalcFamiliar(slot);
      }

      // Check parent elements for slot
      const card = target.closest('.familiar-card');
      if (card && !action) {
        const cardSlot = parseInt(card.getAttribute('data-slot') || '-1');
        if (cardSlot >= 0 && card.classList.contains('empty')) {
          openFamiliarModal(cardSlot);
        }
      }
    });
  }

  // Reset all button - show confirmation modal
  const resetBtn = document.querySelector('[data-action="reset-all"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const modal = document.getElementById('resetConfirmModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    });
  }

  // Confirm reset button
  const confirmResetBtn = document.querySelector('[data-action="confirm-reset"]');
  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', () => {
      resetAllFamiliars();
      const modal = document.getElementById('resetConfirmModal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  }

  // Difficulty change
  const difficultyInput = document.getElementById('difficulty');
  if (difficultyInput) {
    difficultyInput.addEventListener('change', calculate);
    difficultyInput.addEventListener('input', calculate);
  }
}

/**
 * Setup roster-related events
 */
function setupRosterEvents(): void {
  const rosterList = document.getElementById('rosterList');
  if (rosterList) {
    rosterList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      const idAttr = target.getAttribute('data-id');
      const id = idAttr !== null ? parseInt(idAttr) : -1;

      if (id < 0) return;

      switch (action) {
        case 'edit':
          openRosterEditModal(id);
          break;
        case 'delete':
          if (confirm('Delete this familiar?')) {
            deleteFamiliarFromRoster(id);
          }
          break;
        case 'toggle':
          toggleFamiliarDisabled(id);
          break;
      }
    });
  }

  // Export roster button
  const exportBtn = document.querySelector('[data-action="export-roster"]');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportRoster);
  }

  // Import roster button
  const importBtn = document.querySelector('[data-action="import-roster"]');
  if (importBtn) {
    importBtn.addEventListener('click', importRoster);
  }

  // Free wave buttons
  document.querySelectorAll('[data-action="free-wave"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const waveAttr = btn.getAttribute('data-wave');
      if (waveAttr) {
        const wave = parseInt(waveAttr) as Wave;
        if (wave >= 1 && wave <= 3) {
          freeWave(wave);
        }
      }
    });
  });

  // Free all waves button
  const freeAllBtn = document.querySelector('[data-action="free-all-waves"]');
  if (freeAllBtn) {
    freeAllBtn.addEventListener('click', freeAllWaves);
  }

  // Delete all roster button
  const deleteAllBtn = document.querySelector('[data-action="delete-all-roster"]');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', deleteAllRoster);
  }

  // Roster search and filter controls
  setupRosterFilters();
}

/**
 * Setup roster search and filter event handlers
 */
function setupRosterFilters(): void {
  const refreshRoster = () => {
    const roster = selectors.getCurrentRoster(store.getState());
    updateRosterList(roster);
  };

  // Search input with debounce
  const searchInput = document.getElementById('rosterSearchInput');
  if (searchInput) {
    let debounceTimer: number;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(refreshRoster, 200);
    });
  }

  // Filter and sort dropdowns
  const filterIds = [
    'rosterFilterRank',
    'rosterFilterElement',
    'rosterFilterType',
    'rosterFilterWave',
    'rosterSortBy',
  ];

  filterIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', refreshRoster);
    }
  });
}

/**
 * Setup dice input events
 */
function setupDiceEvents(): void {
  ['dice1', 'dice2', 'dice3'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('change', calculate);
    }
  });
}

/**
 * Setup wave-related events
 */
function setupWaveEvents(): void {
  // Load wave buttons
  document.querySelectorAll('[data-action="load-wave"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const waveAttr = btn.getAttribute('data-wave');
      if (waveAttr) {
        const wave = parseInt(waveAttr) as Wave;
        if (wave >= 1 && wave <= 3) {
          loadWave(wave);
        }
      }
    });
  });

  // Save wave buttons
  document.querySelectorAll('[data-action="save-wave"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const waveAttr = btn.getAttribute('data-wave');
      if (waveAttr) {
        const wave = parseInt(waveAttr) as Wave;
        if (wave >= 1 && wave <= 3) {
          saveToWave(wave);
        }
      }
    });
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

/**
 * Open familiar modal for editing
 */
function openFamiliarModal(slot: number): void {
  const modal = document.getElementById('familiarModal');
  const title = document.getElementById('familiarModalTitle');
  const slotInput = document.getElementById('familiarEditSlot') as HTMLInputElement;

  if (!modal || !slotInput) return;

  const state = store.getState();
  const fam = state.calcFamiliars[slot];

  slotInput.value = String(slot);

  if (title) {
    title.textContent = fam && fam.rank ? 'Edit Familiar' : 'Add Familiar';
  }

  // Populate form
  const nameInput = document.getElementById('familiarEditName') as HTMLInputElement;

  if (nameInput) nameInput.value = fam?.name || '';

  // Set dropdowns
  modalRankDropdown?.setValue(fam?.rank || '');
  modalElementDropdown?.setValue(fam?.element || 'None');
  modalTypeDropdown?.setValue(fam?.type || 'Human');

  // Set conditional if exists
  if (fam?.conditional && modalConditionalSelector) {
    modalConditionalSelector.setSelected(fam.conditional);
  } else {
    modalConditionalSelector?.clear();
  }

  modal.style.display = 'flex';
}

/**
 * Open roster edit (uses inline form, not modal)
 */
function openRosterEditModal(id: number): void {
  const roster = selectors.getCurrentRoster(store.getState());
  const familiar = roster.find((f) => f.id === id);

  if (!familiar) return;

  store.setState({ editingFamiliarId: id });

  // Populate inline form with familiar data
  const nameInput = document.getElementById('rosterName') as HTMLInputElement;
  const cancelBtn = document.getElementById('rosterCancelBtn') as HTMLElement;
  const addBtn = document.getElementById('rosterAddBtn') as HTMLElement;

  if (nameInput) nameInput.value = familiar.name;

  // Set dropdowns
  rosterRankDropdown?.setValue(familiar.rank);
  rosterElementDropdown?.setValue(familiar.element);
  rosterTypeDropdown?.setValue(familiar.type);

  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  if (addBtn) addBtn.textContent = 'Save Changes';

  // Set conditional if exists
  if (familiar.conditional && rosterConditionalSelector) {
    rosterConditionalSelector.setSelected(familiar.conditional);
  } else {
    rosterConditionalSelector?.clear();
  }

  // Scroll to form
  nameInput?.focus();
}

/**
 * Close all modals
 */
function closeAllModals(): void {
  document.querySelectorAll('.modal').forEach((modal) => {
    (modal as HTMLElement).style.display = 'none';
  });
}

/**
 * Setup modal close buttons
 */
export function setupModalCloseButtons(): void {
  document.querySelectorAll('[data-action="close-modal"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal') as HTMLElement;
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Click outside modal to close
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        (modal as HTMLElement).style.display = 'none';
      }
    });
  });
}

/**
 * Setup modal conditional selector
 */
function setupModalConditionalSelector(): void {
  modalConditionalSelector = createConditionalSelector({
    searchInputId: 'modalCondSearch',
    resultsContainerId: 'modalCondResults',
    variantSectionId: 'bonusVariantSection',
    variantPillsId: 'bonusVariantPills',
    triggerNameId: 'selectedTriggerName',
    displayId: 'selectedCondDisplay',
    getRank: () => modalRankDropdown?.getValue() || null,
    prePatchCheckboxId: 'modalPrePatch',
  });

  // Search input event
  const searchInput = document.getElementById('modalCondSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      modalConditionalSelector?.search();
    });
  }

  // Results container click delegation
  const resultsContainer = document.getElementById('modalCondResults');
  if (resultsContainer) {
    resultsContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.trigger-result-item') as HTMLElement;
      if (item) {
        const index = parseInt(item.getAttribute('data-trigger-index') || '-1');
        if (index >= 0) {
          modalConditionalSelector?.selectTrigger(index);
        }
      }
    });
  }

  // Variant pills click delegation
  const variantPills = document.getElementById('bonusVariantPills');
  if (variantPills) {
    variantPills.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const pill = target.closest('.bonus-pill') as HTMLElement;
      if (pill) {
        const index = parseInt(pill.getAttribute('data-variant-index') || '-1');
        if (index >= 0) {
          modalConditionalSelector?.selectVariant(index);
        }
      }
    });
  }

  // Clear trigger button
  const clearTriggerBtn = document.querySelector('[data-action="clear-trigger"]');
  if (clearTriggerBtn) {
    clearTriggerBtn.addEventListener('click', () => {
      modalConditionalSelector?.clear();
    });
  }

  // Remove conditional button (in display)
  const condDisplay = document.getElementById('selectedCondDisplay');
  if (condDisplay) {
    condDisplay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('data-action') === 'remove-conditional') {
        modalConditionalSelector?.clear();
      }
    });
  }

  // Pre-patch checkbox change
  const prePatchCheckbox = document.getElementById('modalPrePatch');
  if (prePatchCheckbox) {
    prePatchCheckbox.addEventListener('change', () => {
      modalConditionalSelector?.search();
    });
  }
}

/**
 * Setup roster conditional selector
 */
function setupRosterConditionalSelector(): void {
  rosterConditionalSelector = createConditionalSelector({
    searchInputId: 'rosterConditionalSearch',
    resultsContainerId: 'rosterConditionalResults',
    variantSectionId: 'rosterBonusVariantSection',
    variantPillsId: 'rosterBonusVariantPills',
    triggerNameId: 'rosterSelectedTriggerName',
    displayId: 'selectedConditionalDisplay',
    getRank: () => rosterRankDropdown?.getValue() || null,
    prePatchCheckboxId: 'prePatchFam',
  });

  // Search input event
  const searchInput = document.getElementById('rosterConditionalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      rosterConditionalSelector?.search();
    });
  }

  // Results container click delegation
  const resultsContainer = document.getElementById('rosterConditionalResults');
  if (resultsContainer) {
    resultsContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.trigger-result-item') as HTMLElement;
      if (item) {
        const index = parseInt(item.getAttribute('data-trigger-index') || '-1');
        if (index >= 0) {
          rosterConditionalSelector?.selectTrigger(index);
        }
      }
    });
  }

  // Variant pills click delegation
  const variantPills = document.getElementById('rosterBonusVariantPills');
  if (variantPills) {
    variantPills.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const pill = target.closest('.bonus-pill') as HTMLElement;
      if (pill) {
        const index = parseInt(pill.getAttribute('data-variant-index') || '-1');
        if (index >= 0) {
          rosterConditionalSelector?.selectVariant(index);
        }
      }
    });
  }

  // Clear trigger button
  const clearTriggerBtn = document.querySelector('[data-action="clear-roster-trigger"]');
  if (clearTriggerBtn) {
    clearTriggerBtn.addEventListener('click', () => {
      rosterConditionalSelector?.clear();
    });
  }

  // Remove conditional button (in display)
  const condDisplay = document.getElementById('selectedConditionalDisplay');
  if (condDisplay) {
    condDisplay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('data-action') === 'remove-conditional') {
        rosterConditionalSelector?.clear();
      }
    });
  }

  // Pre-patch checkbox change
  const prePatchCheckbox = document.getElementById('prePatchFam');
  if (prePatchCheckbox) {
    prePatchCheckbox.addEventListener('change', () => {
      rosterConditionalSelector?.search();
    });
  }
}

/**
 * Setup familiar modal save button
 */
function setupFamiliarModalSave(): void {
  const saveBtn = document.querySelector('[data-action="save-familiar"]');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveFamiliarFromModal);
  }
}

/**
 * Save familiar from modal
 */
function saveFamiliarFromModal(): void {
  const slotInput = document.getElementById('familiarEditSlot') as HTMLInputElement;
  const nameInput = document.getElementById('familiarEditName') as HTMLInputElement;

  if (!slotInput) return;

  const slot = parseInt(slotInput.value);
  const rank = (modalRankDropdown?.getValue() || '') as Rank;

  if (!rank) {
    alert('Please select a rank');
    return;
  }

  const familiar: CalcFamiliar = {
    name: nameInput?.value || `Familiar ${slot + 1}`,
    rank,
    element: (modalElementDropdown?.getValue() || 'None') as CalcFamiliar['element'],
    type: (modalTypeDropdown?.getValue() || 'Human') as CalcFamiliar['type'],
    conditional: modalConditionalSelector?.getSelected() ?? null,
  };

  setCalcFamiliar(slot, familiar);

  // Close modal and reset conditional selector
  const modal = document.getElementById('familiarModal');
  if (modal) {
    modal.style.display = 'none';
  }
  modalConditionalSelector?.clear();
}

/**
 * Setup roster form events
 */
function setupRosterFormEvents(): void {
  // Add to roster button
  const addBtn = document.getElementById('rosterAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addFamiliarFromRosterForm);
  }

  // Cancel edit button
  const cancelBtn = document.getElementById('rosterCancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelRosterEdit);
  }
}

/**
 * Add familiar from roster form
 */
function addFamiliarFromRosterForm(): void {
  const nameInput = document.getElementById('rosterName') as HTMLInputElement;

  const name = nameInput?.value?.trim();
  if (!name) {
    alert('Please enter a familiar name');
    return;
  }

  const rank = (rosterRankDropdown?.getValue() || 'Common') as Rank;
  const element = (rosterElementDropdown?.getValue() || 'None') as CalcFamiliar['element'];
  const type = (rosterTypeDropdown?.getValue() || 'Human') as CalcFamiliar['type'];

  const state = store.getState();
  const editingId = state.editingFamiliarId;

  if (editingId) {
    // Update existing familiar
    const charIdx = state.characters.findIndex(c => c.id === state.currentCharacterId);
    if (charIdx === -1) return;

    const characters = [...state.characters];
    const roster = [...characters[charIdx].roster];
    const famIdx = roster.findIndex(f => f.id === editingId);

    if (famIdx !== -1) {
      roster[famIdx] = {
        ...roster[famIdx],
        name,
        rank,
        element,
        type,
        conditional: rosterConditionalSelector?.getSelected() ?? null,
      };
      characters[charIdx].roster = roster;
      store.setState({ characters, editingFamiliarId: null });
      saveState();
      updateRosterList(roster);
    }
  } else {
    // Add new familiar
    addFamiliarToRoster({
      name,
      rank,
      element,
      type,
      conditional: rosterConditionalSelector?.getSelected() ?? null,
    });
  }

  // Reset form
  clearRosterForm();
}

/**
 * Cancel roster edit
 */
function cancelRosterEdit(): void {
  store.setState({ editingFamiliarId: null });
  clearRosterForm();
}

/**
 * Clear roster form
 */
function clearRosterForm(): void {
  const nameInput = document.getElementById('rosterName') as HTMLInputElement;
  const cancelBtn = document.getElementById('rosterCancelBtn') as HTMLElement;
  const addBtn = document.getElementById('rosterAddBtn') as HTMLElement;

  if (nameInput) nameInput.value = '';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (addBtn) addBtn.textContent = 'Add to Collection';

  // Reset dropdowns
  rosterRankDropdown?.setValue('Common');
  rosterElementDropdown?.setValue('None');
  rosterTypeDropdown?.setValue('Human');

  rosterConditionalSelector?.clear();
}

/**
 * Setup bonus item modal events
 */
function setupBonusItemEvents(): void {
  // Open modal button
  const openModalBtn = document.querySelector('[data-action="open-bonus-modal"]');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      const modal = document.getElementById('bonusItemModal');
      if (modal) {
        modal.style.display = 'flex';
        // Focus the search input
        const searchInput = document.getElementById('bonusItemSearch') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchBonusItems('');
        }
      }
    });
  }

  // Search input
  const searchInput = document.getElementById('bonusItemSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      searchBonusItems(query);
    });
  }

  // Search results click delegation
  const resultsContainer = document.getElementById('bonusItemSearchResults');
  if (resultsContainer) {
    resultsContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const resultItem = target.closest('.bonus-item-result') as HTMLElement;
      if (resultItem) {
        const itemIndex = parseInt(resultItem.getAttribute('data-item-index') || '-1');
        const query = resultItem.getAttribute('data-query') || '';
        if (itemIndex >= 0) {
          applyBonusItemFromSearch(itemIndex, query);
        }
      }
    });
  }

  // Bonus items list delete delegation
  const bonusItemsList = document.getElementById('bonusItemsList');
  if (bonusItemsList) {
    bonusItemsList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('data-action') === 'delete-bonus-item') {
        const index = parseInt(target.getAttribute('data-index') || '-1');
        if (index >= 0) {
          deleteBonusItem(index);
        }
      }
    });
  }
}

/**
 * Get the modal conditional selector instance
 */
export function getModalConditionalSelector(): ReturnType<typeof createConditionalSelector> | null {
  return modalConditionalSelector;
}

/**
 * Get the roster conditional selector instance
 */
export function getRosterConditionalSelector(): ReturnType<typeof createConditionalSelector> | null {
  return rosterConditionalSelector;
}

/**
 * Setup passing combinations button
 */
function setupPassingCombosButton(): void {
  const btn = document.querySelector('[data-action="calculate-passing-combos"]');
  if (btn) {
    btn.addEventListener('click', () => {
      calculatePassingCombinations();
    });
  }

  // Setup reroll help toggle
  const helpIcon = document.querySelector('[data-action="toggle-reroll-help"]');
  if (helpIcon) {
    helpIcon.addEventListener('click', () => {
      const content = document.getElementById('rerollHelpContent');
      if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
      }
    });
  }
}

/**
 * Export current character's roster to JSON file
 */
function exportRoster(): void {
  const roster = selectors.getCurrentRoster(store.getState());
  if (roster.length === 0) {
    showToast('No familiars to export');
    return;
  }

  // Create export data (exclude ids as they'll be regenerated on import)
  const exportData = roster.map(({ id, ...rest }) => rest);
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'familiar-collection.json';
  a.click();

  URL.revokeObjectURL(url);
  showToast(`Exported ${roster.length} familiars`);
}

/**
 * Import familiars from JSON file
 */
function importRoster(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as Omit<Familiar, 'id'>[];

      if (!Array.isArray(data)) {
        showToast('Invalid file format');
        return;
      }

      // Add each familiar to the roster
      let added = 0;
      for (const fam of data) {
        if (fam.name && fam.rank && fam.type) {
          addFamiliarToRoster({
            name: fam.name,
            rank: fam.rank,
            element: fam.element || 'None',
            type: fam.type,
            conditional: fam.conditional || null,
            wave: fam.wave || null,
            disabled: fam.disabled || false,
          });
          added++;
        }
      }

      showToast(`Imported ${added} familiars`);
    } catch {
      showToast('Failed to import file');
    }
  });

  input.click();
}

/**
 * Free familiars from a specific wave
 */
function freeWave(wave: Wave): void {
  const state = store.getState();
  const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
  if (charIdx < 0) return;

  const characters = [...state.characters];
  const roster = characters[charIdx].roster.map((f) =>
    f.wave === wave ? { ...f, wave: null } : f
  );

  characters[charIdx] = { ...characters[charIdx], roster };
  store.setState({ characters });
  saveState();

  updateRosterList(roster);
  showToast(`Freed Wave ${wave} familiars`);
}

/**
 * Free all familiars from all waves
 */
function freeAllWaves(): void {
  const state = store.getState();
  const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
  if (charIdx < 0) return;

  const characters = [...state.characters];
  const roster = characters[charIdx].roster.map((f) => ({ ...f, wave: null }));

  characters[charIdx] = { ...characters[charIdx], roster };
  store.setState({ characters });
  saveState();

  updateRosterList(roster);
  showToast('Freed all wave assignments');
}

/**
 * Delete all familiars from roster
 */
function deleteAllRoster(): void {
  const roster = selectors.getCurrentRoster(store.getState());
  if (roster.length === 0) {
    showToast('No familiars to delete');
    return;
  }

  if (!confirm(`Delete all ${roster.length} familiars? This cannot be undone.`)) {
    return;
  }

  const state = store.getState();
  const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
  if (charIdx < 0) return;

  const characters = [...state.characters];
  characters[charIdx] = { ...characters[charIdx], roster: [] };
  store.setState({ characters });
  saveState();

  updateRosterList([]);
  showToast('Deleted all familiars');
}

/**
 * Setup optimizer event handlers
 */
function setupOptimizerEvents(): void {
  const runBtn = document.querySelector('[data-action="run-optimizer"]');
  if (runBtn) {
    runBtn.addEventListener('click', runOptimizer);
  }

  // Toggle help
  const helpToggle = document.querySelector('[data-action="toggle-optimizer-help"]');
  if (helpToggle) {
    helpToggle.addEventListener('click', () => {
      const content = document.getElementById('optimizerHelpContent');
      if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
      }
    });
  }
}

/**
 * Run the lineup optimizer
 */
function runOptimizer(): void {
  const state = store.getState();
  const roster = selectors.getCurrentRoster(state);

  // Filter out disabled familiars
  const availableFamiliars = roster.filter((f) => !f.disabled);

  if (availableFamiliars.length < 3) {
    showToast('Need at least 3 enabled familiars to optimize');
    return;
  }

  const resultsContainer = document.getElementById('optimizerResults');
  const runBtn = document.querySelector('[data-action="run-optimizer"]') as HTMLButtonElement;

  if (!resultsContainer) return;

  // Disable button and show loading
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = 'Finding best lineups...';
  }

  // Calculate combination count for display
  const n = availableFamiliars.length;
  const combinationCount = (n * (n - 1) * (n - 2)) / 6;

  resultsContainer.innerHTML = `<div class="optimizer-loading">Analyzing ${combinationCount.toLocaleString()} combinations...</div>`;

  // Use setTimeout to allow UI to update before heavy computation
  setTimeout(() => {
    try {
      // Convert roster familiars to CalcFamiliars
      const calcFamiliars: CalcFamiliar[] = availableFamiliars.map((f) => ({
        name: f.name,
        rank: f.rank,
        element: f.element,
        type: f.type,
        conditional: f.conditional,
      }));

      // Generate all 3-familiar combinations
      const combinations = generateCombinations(calcFamiliars, 3);

      // Run all strategies (no additional bonuses - familiars already have their conditionals)
      const results = runAllStrategiesFast(combinations, []);

      // Render results
      resultsContainer.innerHTML = renderOptimizerResults(results);
    } catch (error) {
      console.error('Optimizer error:', error);
      resultsContainer.innerHTML = '<div class="optimizer-error">An error occurred during optimization.</div>';
    } finally {
      // Re-enable button
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = 'Find Best Lineups';
      }
    }
  }, 10);
}

/**
 * Render optimizer results
 */
function renderOptimizerResults(results: {
  bestOverall: OptimizedLineup | null;
  bestLow: OptimizedLineup | null;
  bestHigh: OptimizedLineup | null;
}): string {
  const { bestOverall, bestLow, bestHigh } = results;

  if (!bestOverall && !bestLow && !bestHigh) {
    return '<div class="optimizer-empty">No valid lineups found.</div>';
  }

  let html = '<div class="optimizer-results-grid">';

  if (bestOverall) {
    html += renderLineupCard('Best Overall', bestOverall);
  }
  if (bestLow) {
    html += renderLineupCard('Best for Low Rolls', bestLow);
  }
  if (bestHigh) {
    html += renderLineupCard('Best for High Rolls', bestHigh);
  }

  html += '</div>';
  return html;
}

/**
 * Render a single lineup card
 */
function renderLineupCard(title: string, lineup: OptimizedLineup): string {
  const familiarsHtml = lineup.familiars.map((f) => `
    <div class="lineup-familiar">
      <span class="familiar-name">${escapeHtml(f.name)}</span>
      <span class="familiar-details">${f.rank} · ${f.element !== 'None' ? f.element + ' · ' : ''}${f.type}</span>
      ${f.conditional ? `<span class="familiar-conditional">${escapeHtml(f.conditional.name)}</span>` : ''}
    </div>
  `).join('');

  return `
    <div class="lineup-card">
      <div class="lineup-header">
        <h3>${title}</h3>
      </div>
      <div class="lineup-score">
        <span class="score-value">${lineup.score}</span>
        <span class="score-label">${lineup.scoreLabel}</span>
      </div>
      <div class="lineup-familiars">
        ${familiarsHtml}
      </div>
    </div>
  `;
}
