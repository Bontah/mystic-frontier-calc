/**
 * State persistence layer
 * Handles localStorage save/load with migration support
 */
import type { AppState } from './store.js';
/**
 * Safely parse JSON from localStorage
 */
declare function safeGetItem<T>(key: string, defaultValue: T): T;
/**
 * Safely set item in localStorage
 */
declare function safeSetItem(key: string, value: unknown): void;
/**
 * Load persisted state from localStorage
 */
export declare function loadPersistedState(): Partial<AppState>;
/**
 * Save current state to localStorage
 */
export declare function saveState(): void;
/**
 * Initialize store with persisted state
 */
export declare function initializePersistence(): void;
/**
 * Subscribe to state changes and auto-save
 * Returns unsubscribe function
 */
export declare function enableAutoSave(): () => void;
/**
 * Export all data as JSON string (for backup)
 */
export declare function exportData(): string;
/**
 * Import data from JSON string
 */
export declare function importData(jsonString: string): boolean;
export { safeGetItem, safeSetItem };
//# sourceMappingURL=persistence.d.ts.map