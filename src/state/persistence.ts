/**
 * State persistence layer
 * Handles localStorage save/load with migration support
 */

import { store } from './store.js';
import type { AppState } from './store.js';
import type { Character, ConditionalBonus, Familiar } from '../types/index.js';
import type { BonusItem } from '../types/bonus.js';

const STORAGE_KEYS = {
  BONUS_ITEMS: 'bonusItems',
  CONDITIONAL_BONUSES: 'conditionalBonuses',
  CHARACTERS: 'characters',
  CURRENT_CHARACTER_ID: 'currentCharacterId',
  // Legacy key for migration
  FAMILIAR_ROSTER: 'familiarRoster',
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
 * Load persisted state from localStorage
 */
export function loadPersistedState(): Partial<AppState> {
  const bonusItems = safeGetItem<BonusItem[]>(STORAGE_KEYS.BONUS_ITEMS, []);
  const conditionalBonuses = safeGetItem<ConditionalBonus[]>(
    STORAGE_KEYS.CONDITIONAL_BONUSES,
    []
  );

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
    conditionalBonuses,
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
  safeSetItem(STORAGE_KEYS.CONDITIONAL_BONUSES, state.conditionalBonuses);
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
    conditionalBonuses: state.conditionalBonuses,
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
        conditionalBonuses: data.conditionalBonuses ?? [],
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
