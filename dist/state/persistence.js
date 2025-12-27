/**
 * State persistence layer
 * Handles localStorage save/load with migration support
 */
import { store } from './store.js';
const STORAGE_KEYS = {
    BONUS_ITEMS: 'bonusItems',
    CHARACTERS: 'characters',
    CURRENT_CHARACTER_ID: 'currentCharacterId',
    SAVED_WAVES: 'savedWaves',
    // Legacy keys for cleanup
    FAMILIAR_ROSTER: 'familiarRoster',
    CONDITIONAL_BONUSES_LEGACY: 'conditionalBonuses',
};
/**
 * Check if localStorage is available
 */
function isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Safely parse JSON from localStorage
 */
function safeGetItem(key, defaultValue) {
    if (!isStorageAvailable())
        return defaultValue;
    try {
        const item = localStorage.getItem(key);
        if (item === null)
            return defaultValue;
        return JSON.parse(item);
    }
    catch {
        return defaultValue;
    }
}
/**
 * Safely set item in localStorage
 */
function safeSetItem(key, value) {
    if (!isStorageAvailable())
        return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch {
        // Storage quota exceeded or other error
        console.warn(`Failed to save ${key} to localStorage`);
    }
}
/**
 * Migrate old familiarRoster to character format
 */
function migrateOldRoster(characters) {
    if (characters.length > 0)
        return characters;
    const oldRoster = safeGetItem(STORAGE_KEYS.FAMILIAR_ROSTER, []);
    if (oldRoster.length > 0) {
        // Remove old key after migration
        try {
            localStorage.removeItem(STORAGE_KEYS.FAMILIAR_ROSTER);
        }
        catch {
            // Ignore
        }
        return [
            {
                id: Date.now(),
                name: 'Main',
                roster: oldRoster,
            },
        ];
    }
    return characters;
}
/**
 * Ensure default character exists
 */
function ensureDefaultCharacter(characters) {
    if (characters.length === 0) {
        const defaultChar = {
            id: Date.now(),
            name: 'Main',
            roster: [],
        };
        return {
            characters: [defaultChar],
            currentId: defaultChar.id,
        };
    }
    return {
        characters,
        currentId: characters[0].id,
    };
}
/**
 * Default empty waves
 */
const defaultSavedWaves = {
    1: [null, null, null],
    2: [null, null, null],
    3: [null, null, null],
};
/**
 * Clean up legacy localStorage keys
 */
function cleanupLegacyKeys() {
    if (!isStorageAvailable())
        return;
    try {
        localStorage.removeItem(STORAGE_KEYS.CONDITIONAL_BONUSES_LEGACY);
    }
    catch {
        // Ignore cleanup errors
    }
}
/**
 * Load persisted state from localStorage
 */
export function loadPersistedState() {
    const isDev = new URLSearchParams(window.location.search).has('is_dev');
    // Clean up legacy keys on load
    cleanupLegacyKeys();
    if (isDev) {
        console.group('[persistence] Loading from localStorage');
        console.log('Raw savedWaves from localStorage:', localStorage.getItem(STORAGE_KEYS.SAVED_WAVES));
        console.log('Raw characters from localStorage:', localStorage.getItem(STORAGE_KEYS.CHARACTERS));
    }
    const bonusItems = safeGetItem(STORAGE_KEYS.BONUS_ITEMS, []);
    const savedWaves = safeGetItem(STORAGE_KEYS.SAVED_WAVES, defaultSavedWaves);
    if (isDev) {
        console.log('Parsed savedWaves:', savedWaves);
    }
    let characters = safeGetItem(STORAGE_KEYS.CHARACTERS, []);
    let currentCharacterId = safeGetItem(STORAGE_KEYS.CURRENT_CHARACTER_ID, null);
    if (isDev) {
        console.log('Parsed characters:', characters);
    }
    // Run migrations
    characters = migrateOldRoster(characters);
    // Ensure default character
    const result = ensureDefaultCharacter(characters);
    characters = result.characters;
    // Ensure valid current character
    if (!currentCharacterId || !characters.find((c) => c.id === currentCharacterId)) {
        currentCharacterId = result.currentId;
    }
    if (isDev) {
        console.log('Final loaded state:', { bonusItems, savedWaves, characters, currentCharacterId });
        console.groupEnd();
    }
    return {
        bonusItems,
        savedWaves,
        characters,
        currentCharacterId,
    };
}
/**
 * Save current state to localStorage
 */
export function saveState() {
    const state = store.getState();
    safeSetItem(STORAGE_KEYS.BONUS_ITEMS, state.bonusItems);
    safeSetItem(STORAGE_KEYS.SAVED_WAVES, state.savedWaves);
    safeSetItem(STORAGE_KEYS.CHARACTERS, state.characters);
    safeSetItem(STORAGE_KEYS.CURRENT_CHARACTER_ID, state.currentCharacterId);
}
/**
 * Initialize store with persisted state
 */
export function initializePersistence() {
    const isDev = new URLSearchParams(window.location.search).has('is_dev');
    const persistedState = loadPersistedState();
    if (isDev) {
        console.log('[persistence] Setting persisted state to store:', persistedState);
    }
    store.setState(persistedState);
    if (isDev) {
        console.log('[persistence] Store state after init:', store.getState());
    }
}
/**
 * Subscribe to state changes and auto-save
 * Returns unsubscribe function
 */
export function enableAutoSave() {
    return store.subscribe(() => {
        saveState();
    });
}
/**
 * Export all data as JSON string (for backup)
 */
export function exportData() {
    const state = store.getState();
    return JSON.stringify({
        bonusItems: state.bonusItems,
        characters: state.characters,
        currentCharacterId: state.currentCharacterId,
        exportedAt: new Date().toISOString(),
    });
}
/**
 * Import data from JSON string
 */
export function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.characters && Array.isArray(data.characters)) {
            store.setState({
                bonusItems: data.bonusItems ?? [],
                characters: data.characters,
                currentCharacterId: data.currentCharacterId ?? data.characters[0]?.id ?? null,
            });
            saveState();
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=persistence.js.map