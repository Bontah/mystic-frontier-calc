/**
 * State persistence layer
 * Handles localStorage save/load with migration support
 */
import type { AppState } from './store.js';
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
//# sourceMappingURL=persistence.d.ts.map