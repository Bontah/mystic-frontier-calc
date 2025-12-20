/**
 * State persistence layer
 * Handles localStorage save/load with migration support
 */
import { store } from './store.js';
const STORAGE_KEYS = {
    BONUS_ITEMS: 'bonusItems',
    CONDITIONAL_BONUSES: 'conditionalBonuses',
    CHARACTERS: 'characters',
    CURRENT_CHARACTER_ID: 'currentCharacterId',
    // Legacy key for migration
    FAMILIAR_ROSTER: 'familiarRoster',
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
 * Load persisted state from localStorage
 */
export function loadPersistedState() {
    const bonusItems = safeGetItem(STORAGE_KEYS.BONUS_ITEMS, []);
    const conditionalBonuses = safeGetItem(STORAGE_KEYS.CONDITIONAL_BONUSES, []);
    let characters = safeGetItem(STORAGE_KEYS.CHARACTERS, []);
    let currentCharacterId = safeGetItem(STORAGE_KEYS.CURRENT_CHARACTER_ID, null);
    // Run migrations
    characters = migrateOldRoster(characters);
    // Ensure default character
    const result = ensureDefaultCharacter(characters);
    characters = result.characters;
    // Ensure valid current character
    if (!currentCharacterId || !characters.find((c) => c.id === currentCharacterId)) {
        currentCharacterId = result.currentId;
    }
    return {
        bonusItems,
        conditionalBonuses,
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
    safeSetItem(STORAGE_KEYS.CONDITIONAL_BONUSES, state.conditionalBonuses);
    safeSetItem(STORAGE_KEYS.CHARACTERS, state.characters);
    safeSetItem(STORAGE_KEYS.CURRENT_CHARACTER_ID, state.currentCharacterId);
}
/**
 * Initialize store with persisted state
 */
export function initializePersistence() {
    const persistedState = loadPersistedState();
    store.setState(persistedState);
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
        conditionalBonuses: state.conditionalBonuses,
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
                conditionalBonuses: data.conditionalBonuses ?? [],
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