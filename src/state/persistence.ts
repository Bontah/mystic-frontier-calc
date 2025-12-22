/**
 * State persistence layer
 * Handles localStorage save/load with migration support
 */

import { store } from './store.js';
import type { AppState, SavedWaves } from './store.js';
import type { Character, Familiar } from '../types/index.js';
import type { BonusItem } from '../types/bonus.js';

const STORAGE_KEYS = {
  BONUS_ITEMS: 'bonusItems',
  CHARACTERS: 'characters',
  CURRENT_CHARACTER_ID: 'currentCharacterId',
  SAVED_WAVES: 'savedWaves',
  // Legacy keys for cleanup
  FAMILIAR_ROSTER: 'familiarRoster',
  CONDITIONAL_BONUSES_LEGACY: 'conditionalBonuses',
} as const;

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON from localStorage
 */
function safeGetItem<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;

  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage
 */
function safeSetItem(key: string, value: unknown): void {
  if (!isStorageAvailable()) return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or other error
    console.warn(`Failed to save ${key} to localStorage`);
  }
}

/**
 * Migrate old familiarRoster to character format
 */
function migrateOldRoster(characters: Character[]): Character[] {
  if (characters.length > 0) return characters;

  const oldRoster = safeGetItem<Familiar[]>(STORAGE_KEYS.FAMILIAR_ROSTER, []);
  if (oldRoster.length > 0) {
    // Remove old key after migration
    try {
      localStorage.removeItem(STORAGE_KEYS.FAMILIAR_ROSTER);
    } catch {
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
function ensureDefaultCharacter(characters: Character[]): {
  characters: Character[];
  currentId: number;
} {
  if (characters.length === 0) {
    const defaultChar: Character = {
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
const defaultSavedWaves: SavedWaves = {
  1: [null, null, null],
  2: [null, null, null],
  3: [null, null, null],
};

/**
 * Clean up legacy localStorage keys
 */
function cleanupLegacyKeys(): void {
  if (!isStorageAvailable()) return;

  try {
    localStorage.removeItem(STORAGE_KEYS.CONDITIONAL_BONUSES_LEGACY);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Load persisted state from localStorage
 */
export function loadPersistedState(): Partial<AppState> {
  // Clean up legacy keys on load
  cleanupLegacyKeys();

  const bonusItems = safeGetItem<BonusItem[]>(STORAGE_KEYS.BONUS_ITEMS, []);
  const savedWaves = safeGetItem<SavedWaves>(STORAGE_KEYS.SAVED_WAVES, defaultSavedWaves);

  let characters = safeGetItem<Character[]>(STORAGE_KEYS.CHARACTERS, []);
  let currentCharacterId = safeGetItem<number | null>(
    STORAGE_KEYS.CURRENT_CHARACTER_ID,
    null
  );

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
    savedWaves,
    characters,
    currentCharacterId,
  };
}

/**
 * Save current state to localStorage
 */
export function saveState(): void {
  const state = store.getState();

  safeSetItem(STORAGE_KEYS.BONUS_ITEMS, state.bonusItems);
  safeSetItem(STORAGE_KEYS.SAVED_WAVES, state.savedWaves);
  safeSetItem(STORAGE_KEYS.CHARACTERS, state.characters);
  safeSetItem(STORAGE_KEYS.CURRENT_CHARACTER_ID, state.currentCharacterId);
}

/**
 * Initialize store with persisted state
 */
export function initializePersistence(): void {
  const persistedState = loadPersistedState();
  store.setState(persistedState);
}

/**
 * Subscribe to state changes and auto-save
 * Returns unsubscribe function
 */
export function enableAutoSave(): () => void {
  return store.subscribe(() => {
    saveState();
  });
}

/**
 * Export all data as JSON string (for backup)
 */
export function exportData(): string {
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
export function importData(jsonString: string): boolean {
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
  } catch {
    return false;
  }
}
