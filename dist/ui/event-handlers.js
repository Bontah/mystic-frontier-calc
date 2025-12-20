/**
 * Event handlers setup
 * Uses event delegation for better performance
 */
import { store, selectors } from '../state/store.js';
import { setupNavigation } from './navigation.js';
import { calculate, setCalcFamiliar, deleteCalcFamiliar, resetAllFamiliars, loadWave, saveToCurrentWave, addFamiliarToRoster, deleteFamiliarFromRoster, toggleFamiliarDisabled, switchCharacter, } from './actions.js';
import { updateRosterList } from './components/roster-item.js';
import { saveState } from '../state/persistence.js';
import { createConditionalSelector } from './conditional-selector/index.js';
// Module-level conditional selector instances
let modalConditionalSelector = null;
let rosterConditionalSelector = null;
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
    setupModalConditionalSelector();
    setupRosterConditionalSelector();
    setupFamiliarModalSave();
    setupRosterFormEvents();
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
    // Reset all button
    const resetBtn = document.querySelector('[data-action="reset-all"]');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFamiliars);
    }
    // Difficulty change
    const difficultyInput = document.getElementById('difficulty');
    if (difficultyInput) {
        difficultyInput.addEventListener('change', calculate);
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
    // Wave tabs
    document.querySelectorAll('.wave-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const waveClass = Array.from(tab.classList).find((c) => c.startsWith('wave-'));
            if (waveClass) {
                const wave = parseInt(waveClass.replace('wave-', ''));
                if (wave >= 1 && wave <= 3) {
                    loadWave(wave);
                }
            }
        });
    });
    // Save to wave button
    const saveWaveBtn = document.querySelector('[data-action="save-wave"]');
    if (saveWaveBtn) {
        saveWaveBtn.addEventListener('click', saveToCurrentWave);
    }
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
    const rankSelect = document.getElementById('familiarEditRank');
    const elementSelect = document.getElementById('familiarEditElement');
    const typeSelect = document.getElementById('familiarEditType');
    if (nameInput)
        nameInput.value = fam?.name || '';
    if (rankSelect)
        rankSelect.value = fam?.rank || '';
    if (elementSelect)
        elementSelect.value = fam?.element || 'None';
    if (typeSelect)
        typeSelect.value = fam?.type || 'Human';
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
    const rankSelect = document.getElementById('rosterRank');
    const elementSelect = document.getElementById('rosterElement');
    const typeSelect = document.getElementById('rosterType');
    const cancelBtn = document.getElementById('rosterCancelBtn');
    const addBtn = document.getElementById('rosterAddBtn');
    if (nameInput)
        nameInput.value = familiar.name;
    if (rankSelect)
        rankSelect.value = familiar.rank;
    if (elementSelect)
        elementSelect.value = familiar.element;
    if (typeSelect)
        typeSelect.value = familiar.type;
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
        rankSelectId: 'familiarEditRank',
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
    // Rank select change - re-search when rank changes
    const rankSelect = document.getElementById('familiarEditRank');
    if (rankSelect) {
        rankSelect.addEventListener('change', () => {
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
        rankSelectId: 'rosterRank',
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
    // Rank select change - re-search when rank changes
    const rankSelect = document.getElementById('rosterRank');
    if (rankSelect) {
        rankSelect.addEventListener('change', () => {
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
    const rankSelect = document.getElementById('familiarEditRank');
    const elementSelect = document.getElementById('familiarEditElement');
    const typeSelect = document.getElementById('familiarEditType');
    if (!slotInput || !rankSelect)
        return;
    const slot = parseInt(slotInput.value);
    const rank = rankSelect.value;
    if (!rank) {
        alert('Please select a rank');
        return;
    }
    const familiar = {
        name: nameInput?.value || `Familiar ${slot + 1}`,
        rank,
        element: (elementSelect?.value || 'None'),
        type: (typeSelect?.value || 'Human'),
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
    const rankSelect = document.getElementById('rosterRank');
    const elementSelect = document.getElementById('rosterElement');
    const typeSelect = document.getElementById('rosterType');
    const name = nameInput?.value?.trim();
    if (!name) {
        alert('Please enter a familiar name');
        return;
    }
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
                rank: rankSelect.value,
                element: elementSelect.value,
                type: typeSelect.value,
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
            rank: rankSelect.value,
            element: elementSelect.value,
            type: typeSelect.value,
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
    const rankSelect = document.getElementById('rosterRank');
    const elementSelect = document.getElementById('rosterElement');
    const typeSelect = document.getElementById('rosterType');
    const cancelBtn = document.getElementById('rosterCancelBtn');
    const addBtn = document.getElementById('rosterAddBtn');
    if (nameInput)
        nameInput.value = '';
    if (rankSelect)
        rankSelect.value = 'Common';
    if (elementSelect)
        elementSelect.value = 'None';
    if (typeSelect)
        typeSelect.value = 'Human';
    if (cancelBtn)
        cancelBtn.style.display = 'none';
    if (addBtn)
        addBtn.textContent = 'Add to Roster';
    rosterConditionalSelector?.clear();
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