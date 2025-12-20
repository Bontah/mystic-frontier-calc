/**
 * Event handlers setup
 * Uses event delegation for better performance
 */
import { store, selectors } from '../state/store.js';
import { setupNavigation } from './navigation.js';
import { calculate, setCalcFamiliar, deleteCalcFamiliar, resetAllFamiliars, loadWave, saveToWave, addFamiliarToRoster, deleteFamiliarFromRoster, toggleFamiliarDisabled, switchCharacter, deleteBonusItem, searchBonusItems, applyBonusItemFromSearch, renderBonusItemsList, } from './actions.js';
import { updateRosterList } from './components/roster-item.js';
import { createIconDropdown, RANK_OPTIONS, ELEMENT_OPTIONS, TYPE_OPTIONS } from './components/icon-dropdown.js';
import { saveState } from '../state/persistence.js';
import { createConditionalSelector } from './conditional-selector/index.js';
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
    // Character selector
    const charSelect = document.getElementById('characterSelect');
    if (charSelect) {
        charSelect.addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            if (!isNaN(id)) {
                switchCharacter(id);
            }
        });
    }
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
        addBtn.textContent = 'Add to Roster';
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
//# sourceMappingURL=event-handlers.js.map