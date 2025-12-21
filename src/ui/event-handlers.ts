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
import type { Wave, Rank, CalcFamiliar, Familiar, OptimizedLineup, ExtendedOptimizedLineup, OptimizerConfig } from '../types/index.js';

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
 * Get strategy explanation content for modal
 */
function getStrategyExplanation(strategy: string): { title: string; content: string } {
  switch (strategy) {
    case 'overall':
      return {
        title: 'Best Overall (Expected Value)',
        content: `
          <p>This strategy finds the lineup with the <strong>highest average score</strong> across all possible dice combinations.</p>
          <h4>How it works:</h4>
          <ul>
            <li>For each lineup, we evaluate the score using the average dice values based on familiar ranks</li>
            <li>Common = d3 (avg 2), Rare = d4 (avg 2.5), Epic = d5 (avg 3), Unique/Legendary = d6 (avg 3.5)</li>
          </ul>
          <h4>Example:</h4>
          <p>A lineup with 3 Legendary familiars would be evaluated with dice [3.5, 3.5, 3.5], giving an expected dice sum of 10.5.</p>
          <h4>Best for:</h4>
          <p>General use - gives the most reliable performance estimate over many runs.</p>
        `
      };
    case 'low':
      return {
        title: 'Best for Low Rolls',
        content: `
          <p>This strategy finds the lineup that performs <strong>best in the worst-case scenario</strong> - when all dice roll 1.</p>
          <h4>How it works:</h4>
          <ul>
            <li>Every lineup is evaluated with dice values [1, 1, 1]</li>
            <li>The lineup with the highest score under these conditions wins</li>
          </ul>
          <h4>Example:</h4>
          <p>With dice [1, 1, 1], dice sum = 3. A lineup with strong flat bonuses (+10 flat) would score: (3 + 10) = 13.</p>
          <h4>Best for:</h4>
          <p>Risk-averse players who want to minimize bad outcomes. Prioritizes lineups with unconditional bonuses or bonuses that trigger on low rolls.</p>
        `
      };
    case 'high':
      return {
        title: 'Best for High Rolls',
        content: `
          <p>This strategy finds the lineup that performs <strong>best when you roll maximum</strong> on all dice.</p>
          <h4>How it works:</h4>
          <ul>
            <li>Each familiar's max dice is based on rank: Common=3, Rare=4, Epic=5, Unique/Legendary=6</li>
            <li>The lineup is evaluated with these maximum values</li>
          </ul>
          <h4>Example:</h4>
          <p>3 Legendary familiars would be evaluated with [6, 6, 6], giving dice sum = 18. With a 1.5x multiplier, score = 18 × 1.5 = 27.</p>
          <h4>Best for:</h4>
          <p>Maximizing peak potential. Good for lineups with multiplier bonuses that scale with high dice values.</p>
        `
      };
    case 'median':
      return {
        title: 'Median Score',
        content: `
          <p>This strategy finds the lineup with the <strong>highest 50th percentile score</strong> - the score you'll exceed half the time.</p>
          <h4>How it works:</h4>
          <ul>
            <li>For each lineup, we calculate scores for ALL possible dice combinations</li>
            <li>We sort all scores and pick the middle value (median)</li>
            <li>The lineup with the highest median wins</li>
          </ul>
          <h4>Example:</h4>
          <p>If a lineup has 216 possible outcomes (6×6×6), the median is the average of the 108th and 109th highest scores.</p>
          <h4>Best for:</h4>
          <p>Understanding "typical" performance. More representative than average when there are extreme outliers.</p>
        `
      };
    case 'floorGuarantee':
      return {
        title: 'Floor Guarantee',
        content: `
          <p>This strategy finds the lineup where <strong>80% or more of outcomes meet a minimum threshold</strong>.</p>
          <h4>How it works:</h4>
          <ul>
            <li>For each lineup, calculate all possible scores</li>
            <li>The floor is set at 80% of the average score</li>
            <li>Count what percentage of outcomes meet or exceed this floor</li>
            <li>Among lineups where 80%+ meet the floor, pick the one with the highest floor value</li>
          </ul>
          <h4>Example:</h4>
          <p>If average score is 50, the floor is 40. If 85% of dice combinations score ≥40, this lineup qualifies. The display shows "85% above 40".</p>
          <h4>Best for:</h4>
          <p>Consistency-focused players who want predictable minimum performance.</p>
        `
      };
    case 'balanced':
      return {
        title: 'Balanced (Weighted Average)',
        content: `
          <p>This strategy uses a <strong>weighted combination</strong> of low, average, and high roll scores.</p>
          <h4>How it works:</h4>
          <ul>
            <li>Calculate score with low rolls [1,1,1] → weight 25%</li>
            <li>Calculate score with average dice → weight 50%</li>
            <li>Calculate score with max dice → weight 25%</li>
            <li>Final score = (0.25 × low) + (0.50 × avg) + (0.25 × high)</li>
          </ul>
          <h4>Example:</h4>
          <p>Low=10, Avg=25, High=40 → Balanced = (0.25×10) + (0.50×25) + (0.25×40) = 2.5 + 12.5 + 10 = 25</p>
          <h4>Best for:</h4>
          <p>All-around performance. Balances worst-case protection with upside potential.</p>
        `
      };
    default:
      return { title: 'Strategy', content: '<p>No information available.</p>' };
  }
}

/**
 * Show strategy explanation modal
 */
function showStrategyModal(strategy: string): void {
  const { title, content } = getStrategyExplanation(strategy);

  // Remove existing modal if any
  const existingModal = document.getElementById('strategyHelpModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modalHtml = `
    <div id="strategyHelpModal" class="strategy-modal-overlay">
      <div class="strategy-modal">
        <div class="strategy-modal-header">
          <h3>${title}</h3>
          <button class="strategy-modal-close">&times;</button>
        </div>
        <div class="strategy-modal-content">
          ${content}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Close on overlay click or close button
  const modal = document.getElementById('strategyHelpModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('strategy-modal-overlay') || target.classList.contains('strategy-modal-close')) {
        modal.remove();
      }
    });
  }
}

/**
 * Setup optimizer event handlers
 */
function setupOptimizerEvents(): void {
  const runBtn = document.querySelector('[data-action="run-optimizer"]');
  if (runBtn) {
    runBtn.addEventListener('click', runOptimizer);
  }

  // Event delegation for strategy help buttons (they're dynamically created)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('strategy-help-btn')) {
      const strategy = target.getAttribute('data-strategy');
      if (strategy) {
        showStrategyModal(strategy);
      }
    }
  });
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

      // Get optimizer config
      const optimizerConfig = store.getState().configOptimizer;

      // Run all strategies (no additional bonuses - familiars already have their conditionals)
      const results = runAllStrategiesFast(combinations, [], optimizerConfig);

      // Render results
      resultsContainer.innerHTML = renderOptimizerResults(results, optimizerConfig);
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
 * Strategy type for rendering
 */
type StrategyType = 'overall' | 'low' | 'high' | 'median' | 'minVariance' | 'floorGuarantee' | 'balanced';

/**
 * Render optimizer results
 */
function renderOptimizerResults(results: {
  bestOverall: OptimizedLineup | null;
  bestLow: OptimizedLineup | null;
  bestHigh: OptimizedLineup | null;
  bestMedian: ExtendedOptimizedLineup | null;
  bestMinVariance: ExtendedOptimizedLineup | null;
  bestFloorGuarantee: ExtendedOptimizedLineup | null;
  bestBalanced: ExtendedOptimizedLineup | null;
}, _config?: OptimizerConfig): string {
  const { bestOverall, bestLow, bestHigh, bestMedian, bestMinVariance, bestFloorGuarantee, bestBalanced } = results;

  const hasAny = bestOverall || bestLow || bestHigh || bestMedian || bestMinVariance || bestFloorGuarantee || bestBalanced;

  if (!hasAny) {
    return '<div class="optimizer-empty">No valid lineups found.</div>';
  }

  let html = '<div class="optimizer-results-grid">';

  // Basic strategies
  if (bestOverall) {
    html += renderLineupCard('overall', 'Best Overall', 'Expected average across all dice outcomes', bestOverall);
  }
  if (bestLow) {
    html += renderLineupCard('low', 'Best for Low Rolls', 'Optimal when dice roll minimum values', bestLow);
  }
  if (bestHigh) {
    html += renderLineupCard('high', 'Best for High Rolls', 'Optimal when dice roll maximum values', bestHigh);
  }

  // Advanced strategies
  if (bestMedian) {
    html += renderLineupCard('median', 'Median Score', '50th percentile of all outcomes', bestMedian);
  }
  if (bestFloorGuarantee) {
    html += renderLineupCard('floorGuarantee', 'Floor Guarantee', '80%+ of rolls meet minimum', bestFloorGuarantee);
  }
  if (bestBalanced) {
    html += renderLineupCardBalanced(bestBalanced);
  }

  html += '</div>';
  return html;
}

/**
 * Get strategy icon SVG
 */
function getStrategyIcon(strategy: StrategyType): string {
  switch (strategy) {
    case 'overall':
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>';
    case 'low':
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    case 'high':
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16c0 3.87 3.13 7 7 7s7-3.13 7-7v-4H5v4zM16.12 4.37l2.1-2.1-.82-.83-2.3 2.31C14.16 3.28 13.12 3 12 3s-2.16.28-3.09.75L6.6 1.44l-.82.83 2.1 2.1C6.14 5.64 5 7.68 5 10v1h14v-1c0-2.32-1.14-4.36-2.88-5.63zM9 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>';
    case 'median':
      // Bar chart icon
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-4h2v18h-2V3zm4 4h2v14h-2V7zm4 6h2v8h-2v-8z"/></svg>';
    case 'minVariance':
      // Shield icon
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>';
    case 'floorGuarantee':
      // Floor/foundation icon
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/></svg>';
    case 'balanced':
      // Balance scale icon
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-1.27 0-2.4.8-2.82 2H3v2h1.95L2 14c-.47 2 1 3 3.5 3s4.06-1 3.5-3L6.05 7h3.12c.33.85.98 1.5 1.83 1.83V20H7v2h10v-2h-4V8.82c.85-.32 1.5-.97 1.83-1.82h3.12L15 14c-.47 2 1 3 3.5 3s4.06-1 3.5-3L19.05 7H21V5h-6.18C14.4 3.8 13.27 3 12 3zm0 2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM5.5 11l1.5 3h-3l1.5-3zm13 0l1.5 3h-3l1.5-3z"/></svg>';
    default:
      return '';
  }
}

/**
 * Render a single lineup card
 */
function renderLineupCard(strategy: StrategyType, title: string, subtitle: string, lineup: OptimizedLineup): string {
  const familiarsHtml = lineup.familiars.map((f) => {
    const rankClass = `rank-${f.rank.toLowerCase()}`;
    const elementClass = `element-${f.element.toLowerCase()}`;

    return `
      <div class="lineup-familiar ${rankClass} ${elementClass}">
        <div class="lineup-familiar-name">${escapeHtml(f.name)}</div>
        <div class="lineup-familiar-meta">
          <span class="rank-text ${rankClass}">${f.rank}</span>
          <span class="element-text ${elementClass}">${f.element}</span>
          <span class="type-text">${f.type}</span>
        </div>
        ${f.conditional ? `<div class="lineup-familiar-bonus">${escapeHtml(f.conditional.name)}</div>` : ''}
      </div>
    `;
  }).join('');

  // Collect active bonuses
  const activeBonuses = lineup.activeBonusNames && lineup.activeBonusNames.length > 0
    ? lineup.activeBonusNames
    : lineup.familiars.filter(f => f.conditional).map(f => f.conditional!.name);

  const bonusesHtml = activeBonuses.length > 0
    ? `<div class="lineup-active-bonuses">
        ${activeBonuses.map(b => `<span class="bonus-tag">${escapeHtml(b)}</span>`).join('')}
      </div>`
    : '';

  return `
    <div class="lineup-card">
      <div class="lineup-card-header">
        <div class="lineup-card-titles">
          <h3 class="lineup-card-title">${title}</h3>
          <span class="lineup-card-subtitle">${subtitle}</span>
        </div>
        <button class="strategy-help-btn" data-strategy="${strategy}" title="How is this calculated?">?</button>
      </div>
      <div class="lineup-score-display">
        <div class="score-main">
          <span class="score-number">${lineup.score.toLocaleString()}</span>
          <span class="score-label-text">Score</span>
        </div>
        <div class="score-details">
          <span class="score-dice">${lineup.scoreLabel}</span>
        </div>
      </div>
      <div class="lineup-familiars-grid">
        ${familiarsHtml}
      </div>
      ${bonusesHtml}
    </div>
  `;
}

/**
 * Render balanced strategy card with component breakdown
 */
function renderLineupCardBalanced(lineup: ExtendedOptimizedLineup): string {
  const familiarsHtml = lineup.familiars.map((f: CalcFamiliar) => {
    const rankClass = `rank-${f.rank.toLowerCase()}`;
    const elementClass = `element-${f.element.toLowerCase()}`;

    return `
      <div class="lineup-familiar ${rankClass} ${elementClass}">
        <div class="lineup-familiar-name">${escapeHtml(f.name)}</div>
        <div class="lineup-familiar-meta">
          <span class="rank-text ${rankClass}">${f.rank}</span>
          <span class="element-text ${elementClass}">${f.element}</span>
          <span class="type-text">${f.type}</span>
        </div>
        ${f.conditional ? `<div class="lineup-familiar-bonus">${escapeHtml(f.conditional.name)}</div>` : ''}
      </div>
    `;
  }).join('');

  // Collect active bonuses
  const activeBonuses = lineup.activeBonusNames && lineup.activeBonusNames.length > 0
    ? lineup.activeBonusNames
    : lineup.familiars.filter((f: CalcFamiliar) => f.conditional).map((f: CalcFamiliar) => f.conditional!.name);

  const bonusesHtml = activeBonuses.length > 0
    ? `<div class="lineup-active-bonuses">
        ${activeBonuses.map((b: string) => `<span class="bonus-tag">${escapeHtml(b)}</span>`).join('')}
      </div>`
    : '';

  // Breakdown of component scores
  const components = lineup.balancedComponents;
  const breakdownHtml = components
    ? `<div class="balanced-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">Low (25%)</span>
          <span class="breakdown-value">${components.lowRollScore}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Avg (50%)</span>
          <span class="breakdown-value">${components.avgScore}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">High (25%)</span>
          <span class="breakdown-value">${components.highRollScore}</span>
        </div>
      </div>`
    : '';

  return `
    <div class="lineup-card">
      <div class="lineup-card-header">
        <div class="lineup-card-titles">
          <h3 class="lineup-card-title">Balanced</h3>
          <span class="lineup-card-subtitle">Weighted 25% low + 50% avg + 25% high</span>
        </div>
        <button class="strategy-help-btn" data-strategy="balanced" title="How is this calculated?">?</button>
      </div>
      <div class="lineup-score-display">
        <div class="score-main">
          <span class="score-number">${lineup.score.toLocaleString()}</span>
          <span class="score-label-text">Score</span>
        </div>
        <div class="score-details">
          <span class="score-dice">${lineup.scoreLabel}</span>
        </div>
      </div>
      ${breakdownHtml}
      <div class="lineup-familiars-grid">
        ${familiarsHtml}
      </div>
      ${bonusesHtml}
    </div>
  `;
}
