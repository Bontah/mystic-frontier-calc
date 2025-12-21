/**
 * Event handlers setup
 * Uses event delegation for better performance
 */
import { store, selectors } from '../state/store.js';
import { setupNavigation } from './navigation.js';
import { calculate, setCalcFamiliar, deleteCalcFamiliar, emptyCalculator, resetAllFamiliars, loadWave, saveToWave, addFamiliarToRoster, deleteFamiliarFromRoster, toggleFamiliarDisabled, deleteBonusItem, searchBonusItems, applyBonusItemFromSearch, renderBonusItemsList, calculatePassingCombinations, } from './actions.js';
import { updateRosterList } from './components/roster-item.js';
import { createIconDropdown, RANK_OPTIONS, ELEMENT_OPTIONS, TYPE_OPTIONS } from './components/icon-dropdown.js';
import { saveState } from '../state/persistence.js';
import { createConditionalSelector } from './conditional-selector/index.js';
import { showToast } from './toast.js';
import { generateCombinations, findBestLineupFast, findBestLineupMedian, findBestLineupFloorGuarantee, findBestLineupBalanced, findBestLineupDiceIndependent, } from '../core/optimizer.js';
import { getMaxDiceForRank } from '../core/dice.js';
import { evaluateLineup } from '../core/calculator.js';
import { escapeHtml } from '../utils/html.js';
import { isBuggedConditional, formatBonusValues } from '../utils/format.js';
import { processImage, findTopMatches, getReferenceImages, isDebugEnabled, recalculateTypeWithTuning, getLastTypeDetails, getLastTypeIconData, generateMaskPreviews, } from '../scanner/index.js';
// Module-level conditional selector instances
let modalConditionalSelector = null;
let rosterConditionalSelector = null;
// Module-level icon dropdown instances
let modalRankDropdown = null;
let modalElementDropdown = null;
let modalTypeDropdown = null;
let rosterRankDropdown = null;
let rosterElementDropdown = null;
let rosterTypeDropdown = null;
/**
 * Setup all event handlers
 */
export function setupEventHandlers() {
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
    setupScannerEvents();
    // Initial render of bonus items list
    renderBonusItemsList();
}
/**
 * Setup icon dropdowns for element and type selection
 */
function setupIconDropdowns() {
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
function setupCalculatorEvents() {
    // Familiars grid click delegation
    const familiarsGrid = document.getElementById('familiarsGrid');
    if (familiarsGrid) {
        familiarsGrid.addEventListener('click', (e) => {
            const target = e.target;
            const action = target.getAttribute('data-action');
            const slotAttr = target.getAttribute('data-slot');
            const slot = slotAttr !== null ? parseInt(slotAttr) : -1;
            if (action === 'add' || action === 'edit') {
                // Open familiar modal
                openFamiliarModal(slot);
            }
            else if (action === 'delete' && slot >= 0) {
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
    // Empty wave button - just clears calculator without affecting saved waves
    const emptyBtn = document.querySelector('[data-action="empty-wave"]');
    if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
            emptyCalculator();
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
function setupRosterEvents() {
    const rosterList = document.getElementById('rosterList');
    if (rosterList) {
        rosterList.addEventListener('click', (e) => {
            const target = e.target;
            const action = target.getAttribute('data-action');
            const idAttr = target.getAttribute('data-id');
            const id = idAttr !== null ? parseInt(idAttr) : -1;
            if (id < 0)
                return;
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
                const wave = parseInt(waveAttr);
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
function setupRosterFilters() {
    const refreshRoster = () => {
        const roster = selectors.getCurrentRoster(store.getState());
        updateRosterList(roster);
    };
    // Search input with debounce
    const searchInput = document.getElementById('rosterSearchInput');
    if (searchInput) {
        let debounceTimer;
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
function setupDiceEvents() {
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
function setupWaveEvents() {
    // Load wave buttons
    document.querySelectorAll('[data-action="load-wave"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const waveAttr = btn.getAttribute('data-wave');
            if (waveAttr) {
                const wave = parseInt(waveAttr);
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
                const wave = parseInt(waveAttr);
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
function setupKeyboardShortcuts() {
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
function openFamiliarModal(slot) {
    const modal = document.getElementById('familiarModal');
    const title = document.getElementById('familiarModalTitle');
    const slotInput = document.getElementById('familiarEditSlot');
    if (!modal || !slotInput)
        return;
    const state = store.getState();
    const fam = state.calcFamiliars[slot];
    slotInput.value = String(slot);
    if (title) {
        title.textContent = fam && fam.rank ? 'Edit Familiar' : 'Add Familiar';
    }
    // Populate form
    const nameInput = document.getElementById('familiarEditName');
    if (nameInput)
        nameInput.value = fam?.name || '';
    // Set dropdowns
    modalRankDropdown?.setValue(fam?.rank || '');
    modalElementDropdown?.setValue(fam?.element || 'None');
    modalTypeDropdown?.setValue(fam?.type || 'Human');
    // Set conditional if exists
    if (fam?.conditional && modalConditionalSelector) {
        modalConditionalSelector.setSelected(fam.conditional);
    }
    else {
        modalConditionalSelector?.clear();
    }
    modal.style.display = 'flex';
}
/**
 * Open roster edit (uses inline form, not modal)
 */
function openRosterEditModal(id) {
    const roster = selectors.getCurrentRoster(store.getState());
    const familiar = roster.find((f) => f.id === id);
    if (!familiar)
        return;
    store.setState({ editingFamiliarId: id });
    // Populate inline form with familiar data
    const nameInput = document.getElementById('rosterName');
    const cancelBtn = document.getElementById('rosterCancelBtn');
    const addBtn = document.getElementById('rosterAddBtn');
    if (nameInput)
        nameInput.value = familiar.name;
    // Set dropdowns
    rosterRankDropdown?.setValue(familiar.rank);
    rosterElementDropdown?.setValue(familiar.element);
    rosterTypeDropdown?.setValue(familiar.type);
    if (cancelBtn)
        cancelBtn.style.display = 'inline-block';
    if (addBtn)
        addBtn.textContent = 'Save Changes';
    // Set conditional if exists
    if (familiar.conditional && rosterConditionalSelector) {
        rosterConditionalSelector.setSelected(familiar.conditional);
    }
    else {
        rosterConditionalSelector?.clear();
    }
    // Scroll to form
    nameInput?.focus();
}
/**
 * Close all modals
 */
function closeAllModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.style.display = 'none';
    });
}
/**
 * Setup modal close buttons
 */
export function setupModalCloseButtons() {
    document.querySelectorAll('[data-action="close-modal"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}
/**
 * Setup modal conditional selector
 */
function setupModalConditionalSelector() {
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
            const target = e.target;
            const item = target.closest('.trigger-result-item');
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
            const target = e.target;
            const pill = target.closest('.bonus-pill');
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
            const target = e.target;
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
function setupRosterConditionalSelector() {
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
            const target = e.target;
            const item = target.closest('.trigger-result-item');
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
            const target = e.target;
            const pill = target.closest('.bonus-pill');
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
            const target = e.target;
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
function setupFamiliarModalSave() {
    const saveBtn = document.querySelector('[data-action="save-familiar"]');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveFamiliarFromModal);
    }
}
/**
 * Save familiar from modal
 */
function saveFamiliarFromModal() {
    const slotInput = document.getElementById('familiarEditSlot');
    const nameInput = document.getElementById('familiarEditName');
    if (!slotInput)
        return;
    const slot = parseInt(slotInput.value);
    const rank = (modalRankDropdown?.getValue() || '');
    if (!rank) {
        alert('Please select a rank');
        return;
    }
    const familiar = {
        name: nameInput?.value || `Familiar ${slot + 1}`,
        rank,
        element: (modalElementDropdown?.getValue() || 'None'),
        type: (modalTypeDropdown?.getValue() || 'Human'),
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
function setupRosterFormEvents() {
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
function addFamiliarFromRosterForm() {
    const nameInput = document.getElementById('rosterName');
    const name = nameInput?.value?.trim();
    if (!name) {
        alert('Please enter a familiar name');
        return;
    }
    const rank = (rosterRankDropdown?.getValue() || 'Common');
    const element = (rosterElementDropdown?.getValue() || 'None');
    const type = (rosterTypeDropdown?.getValue() || 'Human');
    const state = store.getState();
    const editingId = state.editingFamiliarId;
    if (editingId) {
        // Update existing familiar
        const charIdx = state.characters.findIndex(c => c.id === state.currentCharacterId);
        if (charIdx === -1)
            return;
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
    }
    else {
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
function cancelRosterEdit() {
    store.setState({ editingFamiliarId: null });
    clearRosterForm();
}
/**
 * Clear roster form
 */
function clearRosterForm() {
    const nameInput = document.getElementById('rosterName');
    const cancelBtn = document.getElementById('rosterCancelBtn');
    const addBtn = document.getElementById('rosterAddBtn');
    if (nameInput)
        nameInput.value = '';
    if (cancelBtn)
        cancelBtn.style.display = 'none';
    if (addBtn)
        addBtn.textContent = 'Add to Collection';
    // Reset dropdowns
    rosterRankDropdown?.setValue('Common');
    rosterElementDropdown?.setValue('None');
    rosterTypeDropdown?.setValue('Human');
    rosterConditionalSelector?.clear();
}
/**
 * Setup bonus item modal events
 */
function setupBonusItemEvents() {
    // Open modal button
    const openModalBtn = document.querySelector('[data-action="open-bonus-modal"]');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('bonusItemModal');
            if (modal) {
                modal.style.display = 'flex';
                // Focus the search input
                const searchInput = document.getElementById('bonusItemSearch');
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
            const query = e.target.value;
            searchBonusItems(query);
        });
    }
    // Search results click delegation
    const resultsContainer = document.getElementById('bonusItemSearchResults');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (e) => {
            const target = e.target;
            const resultItem = target.closest('.bonus-item-result');
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
            const target = e.target;
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
export function getModalConditionalSelector() {
    return modalConditionalSelector;
}
/**
 * Get the roster conditional selector instance
 */
export function getRosterConditionalSelector() {
    return rosterConditionalSelector;
}
/**
 * Setup passing combinations button
 */
function setupPassingCombosButton() {
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
function exportRoster() {
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
function importRoster() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file)
            return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
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
        }
        catch {
            showToast('Failed to import file');
        }
    });
    input.click();
}
/**
 * Free familiars from a specific wave
 */
function freeWave(wave) {
    const state = store.getState();
    const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
    if (charIdx < 0)
        return;
    const characters = [...state.characters];
    const roster = characters[charIdx].roster.map((f) => f.wave === wave ? { ...f, wave: null } : f);
    characters[charIdx] = { ...characters[charIdx], roster };
    store.setState({ characters });
    saveState();
    updateRosterList(roster);
    showToast(`Freed Wave ${wave} familiars`);
}
/**
 * Free all familiars from all waves
 */
function freeAllWaves() {
    const state = store.getState();
    const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
    if (charIdx < 0)
        return;
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
function deleteAllRoster() {
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
    if (charIdx < 0)
        return;
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
function getStrategyExplanation(strategy) {
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
        case 'diceIndependent':
            return {
                title: 'No Dice Dependency',
                content: `
          <p>This strategy finds lineups where <strong>all bonuses activate regardless of dice rolls</strong>.</p>
          <h4>How it works:</h4>
          <ul>
            <li>Only considers familiars with conditionals that don't depend on dice values</li>
            <li>Excludes conditions like "if dice sum ≥ X" or "if any die rolls 6"</li>
            <li>Includes conditions based on lineup composition (element/type matching)</li>
            <li>Prioritizes lineups with more guaranteed active bonuses</li>
          </ul>
          <h4>Valid conditional types:</h4>
          <ul>
            <li>"If a Fire familiar is in lineup" - activates based on element</li>
            <li>"If all familiars have same type" - activates based on composition</li>
            <li>Always-active bonuses with no conditions</li>
          </ul>
          <h4>Best for:</h4>
          <p>Consistent, reliable lineups where you know exactly what bonuses you'll get every time. No luck required!</p>
        `
            };
        default:
            return { title: 'Strategy', content: '<p>No information available.</p>' };
    }
}
/**
 * Show strategy explanation modal
 */
function showStrategyModal(strategy) {
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
            const target = e.target;
            if (target.classList.contains('strategy-modal-overlay') || target.classList.contains('strategy-modal-close')) {
                modal.remove();
            }
        });
    }
}
/**
 * Show scanner help modal
 */
function showScannerHelpModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('scannerHelpModal');
    if (existingModal) {
        existingModal.remove();
    }
    const modalHtml = `
    <div id="scannerHelpModal" class="strategy-modal-overlay">
      <div class="strategy-modal">
        <div class="strategy-modal-header">
          <h3>Scan Familiar Card</h3>
          <button class="strategy-modal-close">&times;</button>
        </div>
        <div class="strategy-modal-content">
          <p>The scanner automatically extracts familiar details from a screenshot of a familiar card.</p>

          <h4>How to Use</h4>
          <ul>
            <li><strong>Click</strong> the upload area to select an image file</li>
            <li><strong>Drag & drop</strong> an image onto the upload area</li>
            <li><strong>Paste (Ctrl+V)</strong> a screenshot from your clipboard while on this tab</li>
          </ul>

          <h4>What Gets Extracted</h4>
          <ul>
            <li><strong>Rank</strong> - Detected from the card border color</li>
            <li><strong>Element</strong> - Detected from the element icon</li>
            <li><strong>Type</strong> - Detected from the type icon</li>
            <li><strong>Name</strong> - Extracted using OCR (may need manual correction)</li>
            <li><strong>Conditional</strong> - Matched from extracted text</li>
          </ul>

          <h4>Tips</h4>
          <ul>
            <li>Use clear, uncropped screenshots for best results</li>
            <li>The conditional matcher prioritizes bonuses matching the detected rank</li>
            <li>Review and correct any fields before adding to your collection</li>
          </ul>
        </div>
      </div>
    </div>
  `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    // Close on overlay click or close button
    const modal = document.getElementById('scannerHelpModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('strategy-modal-overlay') || target.classList.contains('strategy-modal-close')) {
                modal.remove();
            }
        });
    }
}
/**
 * Setup optimizer event handlers
 */
function setupOptimizerEvents() {
    // Event delegation for dynamically created buttons
    document.addEventListener('click', (e) => {
        const target = e.target;
        // Strategy help buttons
        if (target.classList.contains('strategy-help-btn')) {
            const strategy = target.getAttribute('data-strategy');
            if (strategy) {
                showStrategyModal(strategy);
            }
        }
        // Section help buttons
        if (target.classList.contains('section-help-btn')) {
            const helpType = target.getAttribute('data-help');
            if (helpType === 'scanner') {
                showScannerHelpModal();
            }
        }
        // Strategy calculate buttons
        if (target.classList.contains('strategy-calculate-btn')) {
            const strategy = target.getAttribute('data-strategy');
            if (strategy) {
                calculateStrategy(strategy);
            }
        }
        // Assign lineup to wave buttons
        if (target.getAttribute('data-action') === 'assign-wave') {
            const lineupId = target.getAttribute('data-lineup-id');
            const waveAttr = target.getAttribute('data-wave');
            if (lineupId && waveAttr) {
                const wave = parseInt(waveAttr);
                assignLineupToWave(lineupId, wave);
            }
        }
    });
    // Optimizer filter change handlers
    const filterElement = document.getElementById('filterElement');
    const filterType = document.getElementById('filterType');
    const filterRequireMatch = document.getElementById('filterRequireMatch');
    if (filterElement) {
        filterElement.addEventListener('change', () => {
            invalidateCombinationsCache();
            showOptimizerStrategies();
        });
    }
    if (filterType) {
        filterType.addEventListener('change', () => {
            invalidateCombinationsCache();
            showOptimizerStrategies();
        });
    }
    if (filterRequireMatch) {
        filterRequireMatch.addEventListener('change', () => {
            invalidateCombinationsCache();
            showOptimizerStrategies();
        });
    }
    // Show strategy cards on initial load
    showOptimizerStrategies();
    // Custom dice finder
    const findCustomDiceBtn = document.getElementById('findCustomDiceLineups');
    if (findCustomDiceBtn) {
        findCustomDiceBtn.addEventListener('click', findLineupsForCustomDice);
    }
}
/**
 * Find best lineups for user-specified dice values
 */
function findLineupsForCustomDice() {
    const resultsContainer = document.getElementById('customDiceResults');
    if (!resultsContainer)
        return;
    // Get dice values from inputs
    const dice1Input = document.getElementById('customDice1');
    const dice2Input = document.getElementById('customDice2');
    const dice3Input = document.getElementById('customDice3');
    if (!dice1Input || !dice2Input || !dice3Input)
        return;
    const targetDice = [
        parseInt(dice1Input.value) || 1,
        parseInt(dice2Input.value) || 1,
        parseInt(dice3Input.value) || 1,
    ];
    // Validate dice values
    for (let i = 0; i < 3; i++) {
        if (targetDice[i] < 1 || targetDice[i] > 6) {
            resultsContainer.innerHTML = '<div class="no-results">Dice values must be between 1 and 6</div>';
            return;
        }
    }
    // Get available familiars
    const state = store.getState();
    const character = state.characters.find(c => c.id === state.currentCharacterId);
    if (!character) {
        resultsContainer.innerHTML = '<div class="no-results">No character selected</div>';
        return;
    }
    // Filter available familiars (not disabled, not assigned to waves, not bugged)
    const availableFamiliars = character.roster.filter(f => !f.disabled &&
        !f.wave &&
        !isBuggedConditional(f.conditional));
    if (availableFamiliars.length < 3) {
        resultsContainer.innerHTML = '<div class="no-results">Need at least 3 available familiars</div>';
        return;
    }
    // Convert to CalcFamiliar format
    const calcFamiliars = availableFamiliars.map(f => ({
        id: f.id,
        name: f.name,
        rank: f.rank,
        element: f.element,
        type: f.type,
        conditional: f.conditional || null,
    }));
    // Generate all 3-familiar combinations
    const combinations = generateCombinations(calcFamiliars, 3);
    // Filter out combinations with duplicate conditional names
    const filteredCombinations = combinations.filter((combo) => {
        const conditionalNames = combo
            .map((fam) => fam.conditional?.name)
            .filter((name) => !!name);
        return new Set(conditionalNames).size === conditionalNames.length;
    });
    const scoredLineups = [];
    for (const combo of filteredCombinations) {
        // Check if the dice values are achievable for this combination
        // We need to find an assignment of dice to familiars where each die <= familiar's max
        const maxDice = combo.map(f => getMaxDiceForRank(f.rank));
        // Try all permutations of dice assignment to find a valid one
        const dicePermutations = [
            [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
        ];
        let bestEval = null;
        let bestDiceAssignment = null;
        for (const perm of dicePermutations) {
            const assignedDice = [targetDice[perm[0]], targetDice[perm[1]], targetDice[perm[2]]];
            // Check if this assignment is valid
            let valid = true;
            for (let i = 0; i < 3; i++) {
                if (assignedDice[i] > maxDice[i]) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                // Score this combination with the assigned dice
                const evaluation = evaluateLineup(combo, [], assignedDice);
                if (!bestEval || evaluation.score > bestEval.score) {
                    bestEval = evaluation;
                    bestDiceAssignment = assignedDice;
                }
            }
        }
        if (bestEval && bestDiceAssignment) {
            scoredLineups.push({
                familiars: combo,
                evaluation: bestEval,
                diceAssignment: bestDiceAssignment,
            });
        }
    }
    // Sort by score descending
    scoredLineups.sort((a, b) => b.evaluation.score - a.evaluation.score);
    // Take top 2 with completely different familiars (no overlap)
    const topLineups = [];
    const usedFamiliarIds = new Set();
    for (const lineup of scoredLineups) {
        // Check if any familiar in this lineup was already used
        const familiarIds = lineup.familiars.map(f => f.id ?? f.name);
        const hasOverlap = familiarIds.some(id => usedFamiliarIds.has(id));
        if (!hasOverlap) {
            topLineups.push(lineup);
            // Mark all familiars in this lineup as used
            familiarIds.forEach(id => usedFamiliarIds.add(id));
            if (topLineups.length >= 2)
                break;
        }
    }
    if (topLineups.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No lineups can achieve these dice values. Try lower values or add higher-rank familiars.</div>';
        return;
    }
    // Render results
    const diceLabel = `[${targetDice.join(', ')}]`;
    resultsContainer.innerHTML = topLineups.map((lineup, idx) => {
        const optimizedLineup = {
            familiars: lineup.familiars,
            score: lineup.evaluation.score,
            diceSum: lineup.evaluation.diceSum,
            totalFlat: lineup.evaluation.totalFlat,
            totalMult: lineup.evaluation.totalMult,
            activeBonusNames: lineup.evaluation.activeBonusNames,
            familiarBreakdown: lineup.evaluation.familiarBreakdown,
            scoreLabel: diceLabel,
            testDice: lineup.diceAssignment,
        };
        return renderLineupCard('custom', `Result ${idx + 1}`, `Dice: ${diceLabel}`, optimizedLineup);
    }).join('');
}
/**
 * Assign a lineup's familiars to a wave in the roster
 */
function assignLineupToWave(lineupId, wave) {
    const familiars = lineupCache.get(lineupId);
    if (!familiars || familiars.length !== 3) {
        showToast('Lineup not found');
        return;
    }
    const state = store.getState();
    const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
    if (charIdx < 0)
        return;
    // Check if wave already has familiars assigned
    const existingWaveFams = state.characters[charIdx].roster.filter(f => f.wave === wave);
    if (existingWaveFams.length > 0) {
        if (!confirm(`Wave ${wave} already has ${existingWaveFams.length} familiar(s) assigned. Replace them?`)) {
            return;
        }
    }
    const characters = [...state.characters];
    let roster = [...characters[charIdx].roster];
    // Clear existing wave assignments first
    if (existingWaveFams.length > 0) {
        roster = roster.map(f => f.wave === wave ? { ...f, wave: null } : f);
    }
    // Find and assign each familiar by ID
    const assignedIndices = new Set();
    for (const fam of familiars) {
        // Find by ID if available, otherwise fall back to matching attributes
        const matchIdx = roster.findIndex((r, idx) => !assignedIndices.has(idx) &&
            !r.wave &&
            (fam.id ? r.id === fam.id : (r.name === fam.name &&
                r.rank === fam.rank &&
                r.element === fam.element &&
                r.type === fam.type)));
        if (matchIdx !== -1) {
            roster[matchIdx] = { ...roster[matchIdx], wave };
            assignedIndices.add(matchIdx);
        }
    }
    if (assignedIndices.size === 0) {
        showToast('Familiars not found in roster or already assigned');
        return;
    }
    characters[charIdx] = { ...characters[charIdx], roster };
    // Also update savedWaves so the calculator page can load them
    const savedWaves = {
        ...state.savedWaves,
        [wave]: [...familiars],
    };
    store.setState({ characters, savedWaves });
    saveState();
    // Refresh roster list to show wave badges
    updateRosterList(roster);
    // Refresh optimizer since available familiars changed
    showOptimizerStrategies();
    showToast(`Assigned ${assignedIndices.size} familiars to Wave ${wave}`);
    // Switch to calculator page and load the wave
    const calcNav = document.querySelector('[data-page="calculator"]');
    if (calcNav) {
        calcNav.click();
    }
    loadWave(wave);
}
// Cache for optimizer combinations
let cachedCombinations = null;
let cachedRosterHash = '';
let cachedFilterHash = '';
/**
 * Invalidate the combinations cache (called when filters change)
 */
function invalidateCombinationsCache() {
    cachedCombinations = null;
    cachedRosterHash = '';
    cachedFilterHash = '';
}
/**
 * Get current optimizer filter values
 */
function getOptimizerFilters() {
    const elementSelect = document.getElementById('filterElement');
    const typeSelect = document.getElementById('filterType');
    const requireMatchCheckbox = document.getElementById('filterRequireMatch');
    return {
        element: elementSelect?.value || '',
        type: typeSelect?.value || '',
        requireMatch: requireMatchCheckbox?.checked || false,
    };
}
// Cache for lineup results (to apply to calculator)
const lineupCache = new Map();
let lineupIdCounter = 0;
const STRATEGIES = [
    { key: 'overall', configKey: 'overall', title: 'Best Overall', subtitle: 'Expected average across all dice outcomes', renderType: 'overall' },
    { key: 'lowRolls', configKey: 'lowRolls', title: 'Best for Low Rolls', subtitle: 'Optimal when dice roll minimum values', renderType: 'low' },
    { key: 'highRolls', configKey: 'highRolls', title: 'Best for High Rolls', subtitle: 'Optimal when dice roll maximum values', renderType: 'high' },
    { key: 'diceIndependent', configKey: 'diceIndependent', title: 'No Dice Dependency', subtitle: 'Bonuses activate regardless of dice rolls', renderType: 'diceIndependent' },
    { key: 'median', configKey: 'median', title: 'Median Score', subtitle: '50th percentile of all outcomes', renderType: 'median' },
    { key: 'floorGuarantee', configKey: 'floorGuarantee', title: 'Floor Guarantee', subtitle: '80%+ of rolls meet minimum', renderType: 'floorGuarantee' },
    { key: 'balanced', configKey: 'balanced', title: 'Balanced', subtitle: 'Weighted 25% low + 50% avg + 25% high', renderType: 'balanced' },
];
/**
 * Generate a simple hash of roster for cache invalidation
 */
function getRosterHash(roster) {
    return roster
        .filter(f => !f.disabled && !f.wave && !isBuggedConditional(f.conditional))
        .map(f => `${f.id}-${f.name}-${f.conditional?.id || 'none'}`)
        .join('|');
}
/**
 * Get or generate combinations (lazy generation with cache)
 */
function getOrGenerateCombinations() {
    const state = store.getState();
    const roster = selectors.getCurrentRoster(state);
    const availableFamiliars = roster.filter((f) => !f.disabled && !f.wave && !isBuggedConditional(f.conditional));
    if (availableFamiliars.length < 3) {
        return null;
    }
    // Get filter values
    const filters = getOptimizerFilters();
    const filterHash = `${filters.element}|${filters.type}|${filters.requireMatch}`;
    // Check if cache is valid
    const currentHash = getRosterHash(roster);
    if (cachedCombinations && cachedRosterHash === currentHash && cachedFilterHash === filterHash) {
        return cachedCombinations;
    }
    // Generate new combinations
    const calcFamiliars = availableFamiliars.map((f) => ({
        id: f.id,
        name: f.name,
        rank: f.rank,
        element: f.element,
        type: f.type,
        conditional: f.conditional,
    }));
    let combinations = generateCombinations(calcFamiliars, 3);
    // Apply filters if "Require at least one matching familiar" is checked
    if (filters.requireMatch && (filters.element || filters.type)) {
        combinations = combinations.filter((combo) => {
            return combo.some((fam) => {
                const elementMatch = !filters.element || fam.element === filters.element;
                const typeMatch = !filters.type || fam.type === filters.type;
                // If both filters are set, require both to match on at least one familiar
                if (filters.element && filters.type) {
                    return elementMatch && typeMatch;
                }
                // If only one filter is set, require that one to match
                return (filters.element && elementMatch) || (filters.type && typeMatch);
            });
        });
    }
    // Filter out combinations with duplicate conditional names
    combinations = combinations.filter((combo) => {
        const conditionalNames = combo
            .map((fam) => fam.conditional?.name)
            .filter((name) => !!name);
        // Check for duplicates: if set size equals array length, no duplicates
        return new Set(conditionalNames).size === conditionalNames.length;
    });
    cachedCombinations = combinations;
    cachedRosterHash = currentHash;
    cachedFilterHash = filterHash;
    return cachedCombinations;
}
/**
 * Show optimizer strategy cards
 */
export function showOptimizerStrategies() {
    const resultsContainer = document.getElementById('optimizerResults');
    if (!resultsContainer)
        return;
    const state = store.getState();
    const roster = selectors.getCurrentRoster(state);
    const availableFamiliars = roster.filter((f) => !f.disabled && !f.wave && !isBuggedConditional(f.conditional));
    // Get optimizer config
    const optimizerConfig = state.configOptimizer;
    if (availableFamiliars.length < 3) {
        resultsContainer.innerHTML = '<div class="optimizer-empty">Need at least 3 available familiars to optimize (not disabled, assigned to a wave, or bugged).</div>';
        return;
    }
    // Get actual combination count (respecting filters)
    const combinations = getOrGenerateCombinations();
    const combinationCount = combinations?.length || 0;
    if (combinationCount === 0) {
        resultsContainer.innerHTML = '<div class="optimizer-empty">No lineups match the current filters. Try adjusting the element/type filters.</div>';
        return;
    }
    // Render strategy cards with Calculate buttons
    resultsContainer.innerHTML = renderStrategyCards(optimizerConfig, combinationCount);
}
/**
 * Render strategy cards with Calculate buttons
 */
function renderStrategyCards(config, combinationCount) {
    const enabledStrategies = STRATEGIES.filter(s => config.strategies[s.configKey]?.enabled !== false);
    if (enabledStrategies.length === 0) {
        return '<div class="optimizer-empty">No strategies enabled. Check config/optimizer-config.json</div>';
    }
    let html = `<div class="optimizer-info">Ready to analyze ${combinationCount.toLocaleString()} combinations</div>`;
    html += '<div class="optimizer-results-grid">';
    for (const strategy of enabledStrategies) {
        html += renderEmptyStrategyCard(strategy);
    }
    html += '</div>';
    return html;
}
/**
 * Render an empty strategy card with Calculate button
 */
function renderEmptyStrategyCard(strategy) {
    return `
    <div class="lineup-card strategy-card-empty" id="strategy-card-${strategy.key}">
      <div class="lineup-card-header">
        <div class="lineup-card-titles">
          <h3 class="lineup-card-title">${strategy.title}</h3>
          <span class="lineup-card-subtitle">${strategy.subtitle}</span>
        </div>
        <button class="strategy-help-btn" data-strategy="${strategy.renderType}" title="How is this calculated?">?</button>
      </div>
      <div class="strategy-card-action">
        <button class="strategy-calculate-btn" data-strategy="${strategy.key}">Calculate</button>
      </div>
    </div>
  `;
}
/**
 * Calculate a single strategy and update its card
 */
function calculateStrategy(strategyKey) {
    const card = document.getElementById(`strategy-card-${strategyKey}`);
    if (!card)
        return;
    // Get or generate combinations (lazy)
    const baseCombinations = getOrGenerateCombinations();
    if (!baseCombinations || baseCombinations.length === 0) {
        showToast('Need at least 3 enabled familiars to optimize.');
        return;
    }
    const btn = card.querySelector('.strategy-calculate-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Calculating...';
    }
    // Get config for ignored conditionals
    const config = store.getState().configOptimizer;
    const strategyConfig = config.strategies[strategyKey];
    const ignoredIds = strategyConfig?.ignoredConditionalIds ?? [];
    // Filter combinations for ignored conditionals
    const combinations = filterCombinationsForIgnored(baseCombinations, ignoredIds);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            let result = null;
            const strategy = STRATEGIES.find(s => s.key === strategyKey);
            if (!strategy)
                return;
            // Run the appropriate strategy
            switch (strategyKey) {
                case 'overall':
                    result = findBestLineupFast(combinations, [], 'overall');
                    break;
                case 'lowRolls':
                    result = findBestLineupFast(combinations, [], 'lowRolls');
                    break;
                case 'highRolls':
                    result = findBestLineupFast(combinations, [], 'highRolls');
                    break;
                case 'diceIndependent':
                    result = findBestLineupDiceIndependent(combinations, []);
                    break;
                case 'median':
                    result = findBestLineupMedian(combinations, []);
                    break;
                case 'floorGuarantee':
                    result = findBestLineupFloorGuarantee(combinations, []);
                    break;
                case 'balanced':
                    result = findBestLineupBalanced(combinations, []);
                    break;
            }
            // Update the card with results
            if (result) {
                if (strategyKey === 'balanced') {
                    card.outerHTML = renderLineupCardBalanced(result);
                }
                else {
                    card.outerHTML = renderLineupCard(strategy.renderType, strategy.title, strategy.subtitle, result);
                }
            }
            else {
                card.innerHTML = `
          <div class="lineup-card-header">
            <div class="lineup-card-titles">
              <h3 class="lineup-card-title">${strategy.title}</h3>
              <span class="lineup-card-subtitle">No valid lineup found</span>
            </div>
          </div>
        `;
            }
        }
        catch (error) {
            console.error(`Error calculating ${strategyKey}:`, error);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Retry';
            }
        }
    }, 10);
}
/**
 * Filter combinations to remove ignored conditional IDs
 */
function filterCombinationsForIgnored(combinations, ignoredIds) {
    if (ignoredIds.length === 0)
        return combinations;
    const ignoredSet = new Set(ignoredIds);
    return combinations.map((combo) => combo.map((fam) => {
        if (fam.conditional?.id && ignoredSet.has(fam.conditional.id)) {
            return { ...fam, conditional: null };
        }
        return fam;
    }));
}
/**
 * Get strategy icon SVG
 */
function getStrategyIcon(strategy) {
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
        case 'diceIndependent':
            // Lock/guarantee icon
            return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';
        default:
            return '';
    }
}
/**
 * Render a single lineup card
 */
function renderLineupCard(strategy, title, subtitle, lineup) {
    // Store lineup in cache for later use
    const lineupId = `lineup-${++lineupIdCounter}`;
    lineupCache.set(lineupId, lineup.familiars);
    const familiarsHtml = lineup.familiars.map((f) => {
        const rankClass = `rank-${f.rank.toLowerCase()}`;
        const elementClass = `element-${f.element.toLowerCase()}`;
        const dataConditionalId = f.conditional?.id !== undefined ? `data-conditional-id="${f.conditional.id}"` : '';
        let bonusValues = '';
        if (f.conditional) {
            const parts = [];
            if (f.conditional.flatBonus !== 0) {
                parts.push(f.conditional.flatBonus >= 0 ? `+${f.conditional.flatBonus}` : `${f.conditional.flatBonus}`);
            }
            if (f.conditional.multiplierBonus !== 0 && f.conditional.multiplierBonus !== 1) {
                parts.push(`x${f.conditional.multiplierBonus}`);
            }
            if (parts.length > 0) {
                bonusValues = `[${parts.join(', ')}]`;
            }
        }
        return `
      <div class="lineup-familiar ${rankClass} ${elementClass}" ${dataConditionalId}>
        <div class="lineup-familiar-name">${escapeHtml(f.name)}</div>
        <div class="lineup-familiar-meta">
          <span class="rank-text ${rankClass}">${f.rank}</span>
          <span class="element-text ${elementClass}">${f.element}</span>
          <span class="type-text">${f.type}</span>
        </div>
        ${f.conditional ? `<div class="lineup-familiar-bonus">${escapeHtml(f.conditional.name)}</div>${bonusValues ? `<div class="bonus-values">${bonusValues}</div>` : ''}` : ''}
      </div>
    `;
    }).join('');
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
      <div class="lineup-card-actions">
        <div class="lineup-wave-buttons">
          <span class="wave-label">Assign:</span>
          <button class="wave-btn" data-action="assign-wave" data-lineup-id="${lineupId}" data-wave="1">W1</button>
          <button class="wave-btn" data-action="assign-wave" data-lineup-id="${lineupId}" data-wave="2">W2</button>
          <button class="wave-btn" data-action="assign-wave" data-lineup-id="${lineupId}" data-wave="3">W3</button>
        </div>
      </div>
    </div>
  `;
}
/**
 * Render balanced strategy card with component breakdown
 */
function renderLineupCardBalanced(lineup) {
    // Store lineup in cache for later use
    const lineupId = `lineup-${++lineupIdCounter}`;
    lineupCache.set(lineupId, lineup.familiars);
    const familiarsHtml = lineup.familiars.map((f) => {
        const rankClass = `rank-${f.rank.toLowerCase()}`;
        const elementClass = `element-${f.element.toLowerCase()}`;
        const dataConditionalId = f.conditional?.id !== undefined ? `data-conditional-id="${f.conditional.id}"` : '';
        let bonusValues = '';
        if (f.conditional) {
            const parts = [];
            if (f.conditional.flatBonus !== 0) {
                parts.push(f.conditional.flatBonus >= 0 ? `+${f.conditional.flatBonus}` : `${f.conditional.flatBonus}`);
            }
            if (f.conditional.multiplierBonus !== 0 && f.conditional.multiplierBonus !== 1) {
                parts.push(`x${f.conditional.multiplierBonus}`);
            }
            if (parts.length > 0) {
                bonusValues = `[${parts.join(', ')}]`;
            }
        }
        return `
      <div class="lineup-familiar ${rankClass} ${elementClass}" ${dataConditionalId}>
        <div class="lineup-familiar-name">${escapeHtml(f.name)}</div>
        <div class="lineup-familiar-meta">
          <span class="rank-text ${rankClass}">${f.rank}</span>
          <span class="element-text ${elementClass}">${f.element}</span>
          <span class="type-text">${f.type}</span>
        </div>
        ${f.conditional ? `<div class="lineup-familiar-bonus">${escapeHtml(f.conditional.name)}</div>${bonusValues ? `<div class="bonus-values">${bonusValues}</div>` : ''}` : ''}
      </div>
    `;
    }).join('');
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
      <div class="lineup-card-actions">
        <div class="lineup-wave-buttons">
          <span class="wave-label">Assign:</span>
          <button class="wave-btn" data-action="assign-wave" data-lineup-id="${lineupId}" data-wave="1">W1</button>
          <button class="wave-btn" data-action="assign-wave" data-lineup-id="${lineupId}" data-wave="2">W2</button>
          <button class="wave-btn" data-action="assign-wave" data-lineup-id="${lineupId}" data-wave="3">W3</button>
        </div>
      </div>
    </div>
  `;
}
// ============================================================================
// SCANNER EVENT HANDLERS
// ============================================================================
// Store last scan result for modal actions
let lastScanResult = null;
/**
 * Setup scanner event handlers
 */
function setupScannerEvents() {
    const dropZone = document.getElementById('scannerDropZone');
    const fileInput = document.getElementById('cardImageInput');
    if (!dropZone || !fileInput)
        return;
    // Click to select file
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    // File input change
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file) {
            handleScanFile(file);
            fileInput.value = ''; // Reset for re-upload
        }
    });
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer?.files[0];
        if (file && file.type.startsWith('image/')) {
            handleScanFile(file);
        }
    });
    // Paste handler (Ctrl+V) - only when on roster page
    document.addEventListener('paste', (e) => {
        // Only handle paste when on roster page
        const rosterPage = document.getElementById('page-roster');
        if (!rosterPage || !rosterPage.classList.contains('active'))
            return;
        // Don't intercept paste in input fields
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
            return;
        const items = e.clipboardData?.items;
        if (!items)
            return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    handleScanFile(file);
                }
                break;
            }
        }
    });
    // Extraction modal action buttons
    setupExtractionModalActions();
    // Tuning panel event handlers (sliders for live adjustment)
    setupTuningPanelEvents();
}
/**
 * Handle file for scanning
 */
async function handleScanFile(file) {
    const preview = document.getElementById('scannerPreview');
    const status = document.getElementById('scannerStatus');
    if (!preview || !status)
        return;
    // Show preview area
    preview.style.display = 'block';
    status.textContent = 'Processing...';
    status.className = 'scanner-status processing';
    try {
        // Process the image
        const result = await processImage(file, (statusText) => {
            status.textContent = statusText;
        });
        lastScanResult = result;
        status.textContent = 'Scan complete!';
        status.className = 'scanner-status success';
        // Show extraction modal with results
        showExtractionModal(result);
    }
    catch (error) {
        console.error('Scan failed:', error);
        status.textContent = error instanceof Error ? error.message : 'Scan failed';
        status.className = 'scanner-status error';
        lastScanResult = null;
    }
}
/**
 * Show extraction modal with scan results
 */
function showExtractionModal(result) {
    const modal = document.getElementById('extractionModal');
    if (!modal)
        return;
    // Set card preview image
    const previewImg = document.getElementById('extractedCardPreview');
    if (previewImg && result.croppedImage) {
        previewImg.src = result.croppedImage;
    }
    // Set name
    const nameInput = document.getElementById('extractedName');
    if (nameInput) {
        nameInput.value = result.name || '';
    }
    // Set rank
    const rankSelect = document.getElementById('extractedRank');
    const rankConfidence = document.getElementById('rankConfidence');
    if (rankSelect) {
        rankSelect.value = result.rank.rank;
    }
    if (rankConfidence) {
        if (isDebugEnabled()) {
            rankConfidence.textContent = `${Math.round(result.rank.confidence)}%`;
            rankConfidence.className = `confidence ${getConfidenceClass(result.rank.confidence / 100)}`;
        }
        else {
            rankConfidence.style.display = 'none';
        }
    }
    // Set element
    const elementSelect = document.getElementById('extractedElement');
    const elementConfidence = document.getElementById('elementConfidence');
    if (elementSelect) {
        elementSelect.value = result.element.element;
    }
    if (elementConfidence) {
        if (isDebugEnabled()) {
            elementConfidence.textContent = `${Math.round(result.element.confidence)}%`;
            elementConfidence.className = `confidence ${getConfidenceClass(result.element.confidence / 100)}`;
        }
        else {
            elementConfidence.style.display = 'none';
        }
    }
    // Set type
    const typeSelect = document.getElementById('extractedType');
    const typeConfidence = document.getElementById('typeConfidence');
    if (typeSelect) {
        typeSelect.value = result.type.type;
    }
    if (typeConfidence) {
        if (isDebugEnabled()) {
            typeConfidence.textContent = `${Math.round(result.type.confidence)}%`;
            typeConfidence.className = `confidence ${getConfidenceClass(result.type.confidence / 100)}`;
        }
        else {
            typeConfidence.style.display = 'none';
        }
    }
    // Set conditional text (raw OCR result)
    const conditionalText = document.getElementById('extractedConditionalText');
    if (conditionalText) {
        conditionalText.textContent = result.conditional.rawText || '(No text detected)';
    }
    // Populate conditional match dropdown with top matches
    const conditionalSelect = document.getElementById('extractedConditionalMatch');
    const conditionalConfidence = document.getElementById('conditionalConfidence');
    if (conditionalSelect) {
        // Clear existing options
        conditionalSelect.innerHTML = '<option value="">-- No conditional --</option>';
        // Get top matches for the raw text
        const topMatches = findTopMatches(result.conditional.rawText, 10);
        const detectedRank = result.rank.rank;
        // Sort matches: prioritize same rank as detected familiar
        const sortedMatches = [...topMatches].sort((a, b) => {
            const aRank = a.rarity || a.rank;
            const bRank = b.rarity || b.rank;
            const aMatchesRank = aRank === detectedRank ? 1 : 0;
            const bMatchesRank = bRank === detectedRank ? 1 : 0;
            // If same rank priority, keep original order (by match score)
            if (aMatchesRank === bMatchesRank)
                return 0;
            return bMatchesRank - aMatchesRank;
        });
        for (const match of sortedMatches) {
            if (!match.id)
                continue; // Skip matches without ID
            const option = document.createElement('option');
            option.value = match.id;
            const bonusText = formatBonusValues(match);
            const rank = match.rarity || match.rank;
            const rankText = rank ? `[${rank}] ` : '';
            const confidenceText = isDebugEnabled() ? ` (${match.matchScore}%)` : '';
            option.textContent = `${rankText}${match.name} [${bonusText}]${confidenceText}`;
            // Apply rank color
            if (rank) {
                option.style.color = getRankColor(rank);
            }
            conditionalSelect.appendChild(option);
        }
        // Select the best match - prefer one with matching rank
        if (result.conditional.confidence > 35) {
            // First try to find a match with the same rank
            const matchWithSameRank = sortedMatches.find(m => m.id && (m.rarity || m.rank) === detectedRank);
            if (matchWithSameRank?.id) {
                conditionalSelect.value = matchWithSameRank.id;
            }
            else if (result.conditional.matched?.id) {
                conditionalSelect.value = result.conditional.matched.id;
            }
        }
    }
    if (conditionalConfidence) {
        if (isDebugEnabled() && result.conditional.matched) {
            conditionalConfidence.textContent = `${Math.round(result.conditional.confidence)}%`;
            conditionalConfidence.className = `confidence ${getConfidenceClass(result.conditional.confidence / 100)}`;
        }
        else {
            conditionalConfidence.style.display = 'none';
        }
    }
    // Update bonus values display
    updateBonusValuesDisplay();
    // Populate debug section
    populateDebugSection(result);
    // Show modal
    modal.style.display = 'flex';
}
/**
 * Update bonus values display based on selected conditional
 */
function updateBonusValuesDisplay() {
    const conditionalSelect = document.getElementById('extractedConditionalMatch');
    const bonusValuesSpan = document.getElementById('extractedBonusValues');
    if (!conditionalSelect || !bonusValuesSpan)
        return;
    const selectedId = conditionalSelect.value;
    if (!selectedId) {
        bonusValuesSpan.textContent = '--';
        return;
    }
    // Find the selected conditional in config
    const state = store.getState();
    const conditional = state.configConditionalBonuses.bonuses.find((b) => b.id === selectedId);
    if (conditional) {
        bonusValuesSpan.textContent = formatBonusValues(conditional);
    }
    else {
        bonusValuesSpan.textContent = '--';
    }
}
/**
 * Get confidence class for styling
 */
function getConfidenceClass(confidence) {
    if (confidence >= 0.8)
        return 'high';
    if (confidence >= 0.5)
        return 'medium';
    return 'low';
}
/**
 * Get color for a rank
 */
function getRankColor(rank) {
    switch (rank.toLowerCase()) {
        case 'common': return '#9d9d9d';
        case 'rare': return '#0070dd';
        case 'epic': return '#a335ee';
        case 'unique': return '#ff8000';
        case 'legendary': return '#1eff00';
        default: return '#ffffff';
    }
}
/**
 * Setup extraction modal action buttons
 */
function setupExtractionModalActions() {
    // Update bonus values when conditional selection changes
    const conditionalSelect = document.getElementById('extractedConditionalMatch');
    if (conditionalSelect) {
        conditionalSelect.addEventListener('change', updateBonusValuesDisplay);
    }
    // Add to Collection button
    const addBtn = document.querySelector('[data-action="add-from-scan"]');
    if (addBtn) {
        addBtn.addEventListener('click', addFamiliarFromScan);
    }
    // Fill Form button
    const fillBtn = document.querySelector('[data-action="fill-form"]');
    if (fillBtn) {
        fillBtn.addEventListener('click', fillFormFromScan);
    }
}
/**
 * Add familiar directly from scan results
 */
function addFamiliarFromScan() {
    const nameInput = document.getElementById('extractedName');
    const rankSelect = document.getElementById('extractedRank');
    const elementSelect = document.getElementById('extractedElement');
    const typeSelect = document.getElementById('extractedType');
    const conditionalSelect = document.getElementById('extractedConditionalMatch');
    const name = nameInput?.value?.trim();
    if (!name) {
        showToast('Please enter a familiar name');
        return;
    }
    // Get conditional if selected
    let conditional = null;
    if (conditionalSelect?.value) {
        const state = store.getState();
        conditional = state.configConditionalBonuses.bonuses.find((b) => b.id === conditionalSelect.value) || null;
    }
    // Add to roster
    addFamiliarToRoster({
        name,
        rank: (rankSelect?.value || 'Common'),
        element: (elementSelect?.value || 'None'),
        type: (typeSelect?.value || 'Human'),
        conditional,
        wave: null,
        disabled: false,
    });
    // Close modal
    const modal = document.getElementById('extractionModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Hide preview
    const preview = document.getElementById('scannerPreview');
    if (preview) {
        preview.style.display = 'none';
    }
    showToast(`Added ${name} to collection`);
    lastScanResult = null;
}
/**
 * Fill roster form with scan results
 */
function fillFormFromScan() {
    const nameInput = document.getElementById('extractedName');
    const rankSelect = document.getElementById('extractedRank');
    const elementSelect = document.getElementById('extractedElement');
    const typeSelect = document.getElementById('extractedType');
    const conditionalSelect = document.getElementById('extractedConditionalMatch');
    // Fill roster form
    const rosterNameInput = document.getElementById('rosterName');
    if (rosterNameInput && nameInput) {
        rosterNameInput.value = nameInput.value;
    }
    // Set rank dropdown
    if (rankSelect && rosterRankDropdown) {
        rosterRankDropdown.setValue(rankSelect.value);
    }
    // Set element dropdown
    if (elementSelect && rosterElementDropdown) {
        rosterElementDropdown.setValue(elementSelect.value);
    }
    // Set type dropdown
    if (typeSelect && rosterTypeDropdown) {
        rosterTypeDropdown.setValue(typeSelect.value);
    }
    // Set conditional if selected
    if (conditionalSelect?.value && rosterConditionalSelector) {
        const state = store.getState();
        const conditional = state.configConditionalBonuses.bonuses.find((b) => b.id === conditionalSelect.value);
        if (conditional) {
            rosterConditionalSelector.setSelected(conditional);
        }
    }
    // Close modal
    const modal = document.getElementById('extractionModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Hide preview
    const preview = document.getElementById('scannerPreview');
    if (preview) {
        preview.style.display = 'none';
    }
    // Focus name input
    if (rosterNameInput) {
        rosterNameInput.focus();
    }
    showToast('Form filled with scan data');
    lastScanResult = null;
}
/**
 * Populate debug section with element/type detection details
 */
function populateDebugSection(result) {
    const debugSection = document.getElementById('scannerDebugSection');
    if (!debugSection)
        return;
    // Hide debug section when debug is off
    if (!isDebugEnabled()) {
        debugSection.style.display = 'none';
        return;
    }
    debugSection.style.display = '';
    const referenceImages = getReferenceImages();
    // Draw extracted element icon
    const elemCanvas = document.getElementById('debugElementExtracted');
    if (elemCanvas && result.element.iconData) {
        const ctx = elemCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, 64, 64);
            ctx.drawImage(result.element.iconData.canvas, 0, 0, 64, 64);
        }
    }
    // Draw extracted type icon
    const typeCanvas = document.getElementById('debugTypeExtracted');
    if (typeCanvas && result.type.iconData) {
        const ctx = typeCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, 64, 64);
            ctx.drawImage(result.type.iconData.canvas, 0, 0, 64, 64);
        }
    }
    // Populate element references with scores
    const elemRefsContainer = document.getElementById('debugElementReferences');
    if (elemRefsContainer && result.element.allScores) {
        elemRefsContainer.innerHTML = '';
        const sortedElements = Object.entries(result.element.allScores)
            .sort((a, b) => b[1] - a[1]);
        for (const [name, score] of sortedElements) {
            const refImg = referenceImages.elements[name];
            if (!refImg)
                continue;
            const item = document.createElement('div');
            item.className = 'debug-ref-item' + (name === result.element.element ? ' best-match' : '');
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(refImg, 0, 0, 48, 48);
            }
            const nameSpan = document.createElement('span');
            nameSpan.className = 'ref-name';
            nameSpan.textContent = name;
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'ref-score ' + getScoreClass(score);
            scoreSpan.textContent = `${Math.round(score)}%`;
            item.appendChild(canvas);
            item.appendChild(nameSpan);
            item.appendChild(scoreSpan);
            elemRefsContainer.appendChild(item);
        }
    }
    // Populate type references with scores (using the detailed method from tuning handlers)
    updateDebugTypeReferences(result.type.allScores, result.type.type, referenceImages);
    // Show initial mask previews with default parameters
    const defaultParams = collectTuningParams();
    updateMaskPreviews(defaultParams);
}
/**
 * Get CSS class for score display
 */
function getScoreClass(score) {
    if (score >= 70)
        return 'high';
    if (score >= 40)
        return 'medium';
    return 'low';
}
// ============================================================================
// TUNING PANEL EVENT HANDLERS
// ============================================================================
// Debounce timer for tuning sliders
let tuningDebounceTimer = null;
/**
 * Setup tuning panel event handlers
 */
function setupTuningPanelEvents() {
    // Background tolerance slider
    const bgTolSlider = document.getElementById('tuneBgTolerance');
    const bgTolValue = document.getElementById('tuneBgTolValue');
    if (bgTolSlider) {
        bgTolSlider.addEventListener('input', () => {
            if (bgTolValue)
                bgTolValue.textContent = bgTolSlider.value;
            debouncedRecalculate();
        });
    }
    // Morphology kernel slider
    const morphSlider = document.getElementById('tuneMorphology');
    const morphValue = document.getElementById('tuneMorphValue');
    if (morphSlider) {
        morphSlider.addEventListener('input', () => {
            if (morphValue)
                morphValue.textContent = morphSlider.value;
            debouncedRecalculate();
        });
    }
    // Adaptive background checkbox
    const adaptiveBgCheckbox = document.getElementById('tuneAdaptiveBg');
    if (adaptiveBgCheckbox) {
        adaptiveBgCheckbox.addEventListener('change', () => {
            debouncedRecalculate();
        });
    }
    // Weight sliders with total validation
    const weightSliders = ['tuneMaskWeight', 'tuneHuWeight', 'tuneEdgeWeight', 'tuneColorWeight'];
    const valueDisplays = ['tuneMaskValue', 'tuneHuValue', 'tuneEdgeValue', 'tuneColorValue'];
    weightSliders.forEach((sliderId, index) => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueDisplays[index]);
        if (slider) {
            slider.addEventListener('input', () => {
                if (valueDisplay)
                    valueDisplay.textContent = slider.value;
                updateWeightTotal();
                debouncedRecalculate();
            });
        }
    });
}
/**
 * Debounced recalculation (300ms delay)
 */
function debouncedRecalculate() {
    if (tuningDebounceTimer !== null) {
        window.clearTimeout(tuningDebounceTimer);
    }
    tuningDebounceTimer = window.setTimeout(() => {
        tuningDebounceTimer = null;
        recalculateWithCurrentParams();
    }, 300);
}
/**
 * Collect current tuning parameters from sliders
 */
function collectTuningParams() {
    const bgTolSlider = document.getElementById('tuneBgTolerance');
    const morphSlider = document.getElementById('tuneMorphology');
    const adaptiveBgCheckbox = document.getElementById('tuneAdaptiveBg');
    const maskSlider = document.getElementById('tuneMaskWeight');
    const huSlider = document.getElementById('tuneHuWeight');
    const edgeSlider = document.getElementById('tuneEdgeWeight');
    const colorSlider = document.getElementById('tuneColorWeight');
    return {
        backgroundTolerance: parseInt(bgTolSlider?.value || '45', 10),
        morphologyKernel: parseInt(morphSlider?.value || '1', 10),
        useAdaptiveBackground: adaptiveBgCheckbox?.checked ?? true,
        maskWeight: parseInt(maskSlider?.value || '40', 10) / 100,
        huWeight: parseInt(huSlider?.value || '25', 10) / 100,
        edgeWeight: parseInt(edgeSlider?.value || '20', 10) / 100,
        colorWeight: parseInt(colorSlider?.value || '15', 10) / 100,
    };
}
/**
 * Update weight total display and show warning if not 100%
 */
function updateWeightTotal() {
    const maskSlider = document.getElementById('tuneMaskWeight');
    const huSlider = document.getElementById('tuneHuWeight');
    const edgeSlider = document.getElementById('tuneEdgeWeight');
    const colorSlider = document.getElementById('tuneColorWeight');
    const totalDisplay = document.getElementById('tuneWeightTotal');
    if (!totalDisplay)
        return;
    const total = parseInt(maskSlider?.value || '40', 10) +
        parseInt(huSlider?.value || '25', 10) +
        parseInt(edgeSlider?.value || '20', 10) +
        parseInt(colorSlider?.value || '15', 10);
    totalDisplay.textContent = `${total}%`;
    // Add warning class if not 100%
    if (total !== 100) {
        totalDisplay.classList.add('warning');
    }
    else {
        totalDisplay.classList.remove('warning');
    }
}
/**
 * Recalculate type detection with current parameters
 */
function recalculateWithCurrentParams() {
    const iconData = getLastTypeIconData();
    if (!iconData) {
        console.log('No icon data to recalculate');
        return;
    }
    const referenceImages = getReferenceImages();
    if (!referenceImages || Object.keys(referenceImages.types).length === 0) {
        console.log('No reference images');
        return;
    }
    const params = collectTuningParams();
    console.log('Recalculating with params:', params);
    // Recalculate type detection (only takes params, uses stored data)
    const newResult = recalculateTypeWithTuning(params);
    if (!newResult) {
        console.log('Recalculation returned null');
        return;
    }
    // Find best type from scores
    const sortedScores = Object.entries(newResult.allScores).sort((a, b) => b[1] - a[1]);
    const bestType = sortedScores[0]?.[0] || '';
    const bestScore = sortedScores[0]?.[1] || 0;
    // Update the type result display
    const typeSelect = document.getElementById('extractedType');
    const typeConfidence = document.getElementById('typeConfidence');
    if (typeSelect) {
        typeSelect.value = bestType;
    }
    if (typeConfidence) {
        typeConfidence.textContent = `${Math.round(bestScore)}%`;
        typeConfidence.className = `confidence ${getConfidenceClass(bestScore / 100)}`;
    }
    // Update debug type references with new scores
    updateDebugTypeReferences(newResult.allScores, bestType, referenceImages);
    // Update mask previews
    updateMaskPreviews(params);
}
/**
 * Update the debug type references with new scores
 */
function updateDebugTypeReferences(allScores, bestType, referenceImages) {
    const typeRefsContainer = document.getElementById('debugTypeReferences');
    if (!typeRefsContainer)
        return;
    typeRefsContainer.innerHTML = '';
    const sortedTypes = Object.entries(allScores).sort((a, b) => b[1] - a[1]);
    for (const [name, score] of sortedTypes) {
        const refImg = referenceImages.types[name];
        if (!refImg)
            continue;
        const item = document.createElement('div');
        item.className = 'debug-ref-item' + (name === bestType ? ' best-match' : '');
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(refImg, 0, 0, 48, 48);
        }
        const nameSpan = document.createElement('span');
        nameSpan.className = 'ref-name';
        nameSpan.textContent = name;
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'ref-score ' + getScoreClass(score);
        scoreSpan.textContent = `${Math.round(score)}%`;
        // Show detailed breakdown on hover
        const details = getLastTypeDetails()[name];
        if (details) {
            const detailSpan = document.createElement('span');
            detailSpan.className = 'ref-details';
            detailSpan.textContent = `M:${Math.round(details.mask * 100)} H:${Math.round(details.hu * 100)} E:${Math.round(details.edge * 100)} C:${Math.round(details.color * 100)}`;
            item.appendChild(canvas);
            item.appendChild(nameSpan);
            item.appendChild(scoreSpan);
            item.appendChild(detailSpan);
        }
        else {
            item.appendChild(canvas);
            item.appendChild(nameSpan);
            item.appendChild(scoreSpan);
        }
        typeRefsContainer.appendChild(item);
    }
}
/**
 * Update mask preview canvases
 */
function updateMaskPreviews(params) {
    const previews = generateMaskPreviews(params);
    if (!previews)
        return;
    // The masks are Uint8Arrays of size 32x32 = 1024 bytes
    const COMPARE_SIZE = 32;
    // Raw mask
    const rawCanvas = document.getElementById('debugTypeMaskRaw');
    if (rawCanvas) {
        drawMaskToCanvas(rawCanvas, previews.rawMask, COMPARE_SIZE);
    }
    // Cleaned mask
    const cleanedCanvas = document.getElementById('debugTypeMaskCleaned');
    if (cleanedCanvas) {
        drawMaskToCanvas(cleanedCanvas, previews.cleanedMask, COMPARE_SIZE);
    }
    // Edge mask
    const edgesCanvas = document.getElementById('debugTypeEdges');
    if (edgesCanvas) {
        drawMaskToCanvas(edgesCanvas, previews.edges, COMPARE_SIZE);
    }
}
/**
 * Draw a binary mask Uint8Array to a canvas
 * Mask values can be 0/1 (binary) or 0-255 (grayscale)
 */
function drawMaskToCanvas(canvas, mask, size) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    // Check if mask is binary (0/1) or already 0-255
    // If max value is 1, scale to 255
    let maxVal = 0;
    for (let i = 0; i < mask.length; i++) {
        if (mask[i] > maxVal)
            maxVal = mask[i];
    }
    const scale = maxVal <= 1 ? 255 : 1;
    // Create ImageData at the mask's native size
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < mask.length; i++) {
        const val = mask[i] * scale;
        const pixelIdx = i * 4;
        imageData.data[pixelIdx] = val; // R
        imageData.data[pixelIdx + 1] = val; // G
        imageData.data[pixelIdx + 2] = val; // B
        imageData.data[pixelIdx + 3] = 255; // A
    }
    // Draw at native size, then scale up to canvas size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    // Clear and draw scaled
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
}
//# sourceMappingURL=event-handlers.js.map