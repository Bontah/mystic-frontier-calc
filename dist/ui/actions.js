/**
 * UI Actions
 * Functions that handle user interactions and update state
 */
import { store, selectors } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { calculateScore, calculateRerollSuggestions, evaluateConditionalBonus, getGlobalDiceCap, getEffectiveDiceCap, findTopPassingCombinations } from '../core/index.js';
import { renderResultDisplay, updateActiveConditionals } from './components/result-display.js';
import { renderRerollSuggestions, renderPassingCombinations } from './components/reroll-display.js';
import { updateFamiliarsGrid } from './components/familiar-card.js';
import { updateRosterList } from './components/roster-item.js';
import { escapeHtml } from '../utils/html.js';
import { showToast } from './toast.js';
// ============================================================================
// Manually Disabled Conditionals
// ============================================================================
/**
 * Track manually disabled conditionals by key: "${familiarIndex}-${conditional.id}"
 * This resets when familiars change.
 */
let disabledConditionalKeys = new Set();
/**
 * Generate a unique key for a conditional
 */
function getConditionalKey(familiarIndex, conditionalId) {
    return `${familiarIndex}-${conditionalId || 'unknown'}`;
}
/**
 * Reset all manually disabled conditionals
 */
function resetDisabledConditionals() {
    disabledConditionalKeys.clear();
}
/**
 * Check if a conditional is manually disabled
 */
export function isConditionalDisabled(familiarIndex, conditionalId) {
    return disabledConditionalKeys.has(getConditionalKey(familiarIndex, conditionalId));
}
/**
 * Toggle the disabled state of a conditional and recalculate
 */
export function toggleConditionalDisabled(familiarIndex, conditionalId) {
    const key = getConditionalKey(familiarIndex, conditionalId);
    if (disabledConditionalKeys.has(key)) {
        disabledConditionalKeys.delete(key);
    }
    else {
        disabledConditionalKeys.add(key);
    }
    calculate();
}
// ============================================================================
/**
 * Get current dice values from the DOM
 */
function getDiceValues() {
    const dice = [];
    const state = store.getState();
    for (let i = 0; i < 3; i++) {
        const fam = state.calcFamiliars[i];
        if (fam && fam.rank) {
            const input = document.getElementById(`dice${i + 1}`);
            dice.push(parseInt(input?.value) || 1);
        }
    }
    return dice;
}
/**
 * Update dice dropdown options based on familiar ranks and conditional caps
 */
export function updateDiceDropdowns() {
    const state = store.getState();
    const familiars = state.calcFamiliars;
    // Get global cap from any "prevents dice rolling over X" conditionals
    const globalCap = getGlobalDiceCap(familiars);
    for (let i = 0; i < 3; i++) {
        const select = document.getElementById(`dice${i + 1}`);
        if (!select)
            continue;
        const fam = familiars[i];
        const maxValue = getEffectiveDiceCap(fam, globalCap);
        // Get current value before changing options
        const currentValue = parseInt(select.value) || 1;
        // Rebuild options
        select.innerHTML = '';
        for (let v = 1; v <= maxValue; v++) {
            const option = document.createElement('option');
            option.value = String(v);
            option.textContent = String(v);
            select.appendChild(option);
        }
        // Restore value if still valid, otherwise set to max
        select.value = String(Math.min(currentValue, maxValue));
    }
}
/**
 * Get current difficulty from the DOM
 */
function getDifficulty() {
    const input = document.getElementById('difficulty');
    return parseInt(input?.value) || 0;
}
/**
 * Update the disabled state of calculator sections
 */
function updateCalculatorDisabledState(disabled) {
    const calcRow = document.querySelector('.calc-row');
    const results = document.querySelector('.results');
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
export function calculate() {
    const state = store.getState();
    // Track original indices for conditionals
    const familiarsWithIndex = [];
    state.calcFamiliars.forEach((f, idx) => {
        if (f !== null && f.rank !== undefined) {
            familiarsWithIndex.push({ fam: f, originalIndex: idx });
        }
    });
    const familiars = familiarsWithIndex.map((item) => item.fam);
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
    // Collect all conditionals from familiars, filtering out manually disabled ones
    const activeConditionals = [];
    for (const { fam, originalIndex } of familiarsWithIndex) {
        if (fam.conditional && !isConditionalDisabled(originalIndex, fam.conditional.id)) {
            activeConditionals.push(fam.conditional);
        }
    }
    // Calculate score (only with non-disabled conditionals)
    const result = calculateScore(dice, familiarContexts, state.bonusItems, activeConditionals);
    // Add pass/fail info
    const passed = result.finalResult >= difficulty;
    const difference = result.finalResult - difficulty;
    // Build conditionals display data with active status
    const conditionalsDisplayData = [];
    // Add familiar conditionals with their familiar names and disabled state
    for (const { fam, originalIndex } of familiarsWithIndex) {
        if (fam.conditional) {
            const isDisabled = isConditionalDisabled(originalIndex, fam.conditional.id);
            // Only evaluate if not manually disabled
            const evalResult = isDisabled
                ? { isActive: false, flatBonus: 0, multiplierBonus: 0 }
                : evaluateConditionalBonus(fam.conditional, dice, familiarContexts);
            conditionalsDisplayData.push({
                conditional: fam.conditional,
                isActive: evalResult.isActive,
                familiarName: fam.name,
                familiarIndex: originalIndex,
                isManuallyDisabled: isDisabled,
            });
        }
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
        }
        else {
            activeBonusesEl.innerHTML = '';
        }
    }
    // Calculate reroll suggestions (using only active conditionals)
    const familiarsWithRank = familiars.map((f) => ({
        type: f.type,
        element: f.element,
        rank: f.rank,
    }));
    const rerollSuggestions = calculateRerollSuggestions(dice, familiarsWithRank, state.bonusItems, activeConditionals, difficulty);
    renderRerollSuggestions(rerollSuggestions, passed);
}
/**
 * Set a familiar in a calculator slot
 */
export function setCalcFamiliar(slot, familiar) {
    resetDisabledConditionals();
    store.setState((state) => {
        const calcFamiliars = [...state.calcFamiliars];
        calcFamiliars[slot] = familiar;
        return { calcFamiliars };
    });
    updateFamiliarsGrid(store.getState().calcFamiliars);
    updateDiceDropdowns();
    calculate();
}
/**
 * Delete a familiar from calculator slot
 */
export function deleteCalcFamiliar(slot) {
    setCalcFamiliar(slot, null);
}
/**
 * Empty calculator slots (without clearing saved waves)
 */
export function emptyCalculator() {
    resetDisabledConditionals();
    store.setState({
        calcFamiliars: [null, null, null],
        currentWave: null,
    });
    updateFamiliarsGrid(store.getState().calcFamiliars);
    updateDiceDropdowns();
    calculate();
    // Clear wave selection UI
    document.querySelectorAll('.load-wave-btn').forEach((btn) => {
        btn.classList.remove('active');
    });
    const label = document.getElementById('currentWaveLabel');
    if (label)
        label.textContent = '';
}
/**
 * Reset all calculator familiars and saved waves
 */
export function resetAllFamiliars() {
    resetDisabledConditionals();
    store.setState({
        calcFamiliars: [null, null, null],
        currentWave: null,
        savedWaves: {
            1: [null, null, null],
            2: [null, null, null],
            3: [null, null, null],
        },
    });
    saveState();
    updateFamiliarsGrid(store.getState().calcFamiliars);
    updateDiceDropdowns();
    calculate();
    // Clear wave selection UI
    document.querySelectorAll('.load-wave-btn').forEach((btn) => {
        btn.classList.remove('active');
    });
    const label = document.getElementById('currentWaveLabel');
    if (label)
        label.textContent = '';
}
/**
 * Save current lineup to a specific wave
 */
export function saveToWave(wave) {
    const state = store.getState();
    // Copy current calculator familiars to the wave slot
    const savedWaves = {
        ...state.savedWaves,
        [wave]: [...state.calcFamiliars],
    };
    store.setState({ savedWaves, currentWave: wave });
    saveState();
    // Update wave label
    const label = document.getElementById('currentWaveLabel');
    if (label)
        label.textContent = `(Wave ${wave})`;
    // Show toast notification
    showToast(`Saved to Wave ${wave}`);
}
/**
 * Load a wave lineup into calculator
 */
export function loadWave(wave) {
    resetDisabledConditionals();
    const state = store.getState();
    // Load from saved waves
    const calcFamiliars = [...state.savedWaves[wave]];
    store.setState({
        calcFamiliars,
        currentWave: wave,
    });
    updateFamiliarsGrid(calcFamiliars);
    updateDiceDropdowns();
    const label = document.getElementById('currentWaveLabel');
    if (label)
        label.textContent = `(Wave ${wave})`;
    // Update wave button active states
    document.querySelectorAll('.load-wave-btn').forEach((btn) => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-action="load-wave"][data-wave="${wave}"]`);
    if (activeBtn)
        activeBtn.classList.add('active');
    calculate();
}
/**
 * Add familiar to roster
 */
export function addFamiliarToRoster(familiar) {
    const state = store.getState();
    const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
    if (charIdx === -1)
        return;
    const newFamiliar = {
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
export function deleteFamiliarFromRoster(id) {
    const state = store.getState();
    const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
    if (charIdx === -1)
        return;
    const characters = [...state.characters];
    characters[charIdx].roster = characters[charIdx].roster.filter((f) => f.id !== id);
    store.setState({ characters });
    saveState();
    updateRosterList(characters[charIdx].roster);
}
/**
 * Toggle familiar disabled state
 */
export function toggleFamiliarDisabled(id) {
    const state = store.getState();
    const charIdx = state.characters.findIndex((c) => c.id === state.currentCharacterId);
    if (charIdx === -1)
        return;
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
export function switchCharacter(id) {
    store.setState({
        currentCharacterId: id,
        currentWave: null,
    });
    saveState();
    // Update roster display
    const roster = selectors.getCurrentRoster(store.getState());
    updateRosterList(roster);
    // Clear wave selection
    document.querySelectorAll('.load-wave-btn').forEach((btn) => {
        btn.classList.remove('active');
    });
    const label = document.getElementById('currentWaveLabel');
    if (label)
        label.textContent = '';
}
/**
 * Add a bonus item
 */
export function addBonusItem(item) {
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
export function deleteBonusItem(index) {
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
export function renderBonusItemsList() {
    const container = document.getElementById('bonusItemsList');
    if (!container)
        return;
    const { bonusItems } = store.getState();
    if (bonusItems.length === 0) {
        container.innerHTML = '<div class="no-items">No bonus items added. Click "+ Add Item" to add one.</div>';
        return;
    }
    container.innerHTML = bonusItems
        .map((item, index) => {
        const flatClass = item.flatBonus < 0 ? 'flat negative' : 'flat';
        const flatStr = item.flatBonus !== 0
            ? `<span class="${flatClass}">${item.flatBonus >= 0 ? '+' : ''}${item.flatBonus} flat</span>`
            : '';
        const multStr = item.multiplierBonus !== 1 && item.multiplierBonus !== 0
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
export function searchBonusItems(query) {
    const resultsContainer = document.getElementById('bonusItemSearchResults');
    if (!resultsContainer)
        return;
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
        const flatStr = item.flatBonus !== 0
            ? `<span class="flat${item.flatBonus < 0 ? ' negative' : ''}">${item.flatBonus >= 0 ? '+' : ''}${item.flatBonus}</span>`
            : '';
        const multStr = item.multiplierBonus && item.multiplierBonus !== 0
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
export function applyBonusItemFromSearch(itemIndex, query) {
    const state = store.getState();
    const items = state.configBonusItems.items || [];
    const lowerQuery = query.toLowerCase();
    const matches = items.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(lowerQuery);
        const descMatch = item.description?.toLowerCase().includes(lowerQuery);
        return nameMatch || descMatch;
    });
    const item = matches[itemIndex];
    if (!item)
        return;
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
    const searchInput = document.getElementById('bonusItemSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    searchBonusItems('');
}
/**
 * Calculate and display passing dice combinations
 */
export function calculatePassingCombinations() {
    const state = store.getState();
    const familiars = state.calcFamiliars;
    const difficulty = getDifficulty();
    // Collect all conditionals from familiars, filtering out manually disabled ones
    const activeConditionals = [];
    familiars.forEach((f, idx) => {
        if (f !== null && f.rank !== undefined && f.conditional) {
            if (!isConditionalDisabled(idx, f.conditional.id)) {
                activeConditionals.push(f.conditional);
            }
        }
    });
    // Find top passing combinations
    const combinations = findTopPassingCombinations(familiars, state.bonusItems, activeConditionals, difficulty, 5);
    renderPassingCombinations(combinations);
}
//# sourceMappingURL=actions.js.map