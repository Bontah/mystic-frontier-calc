/**
 * Centralized state store
 * Replaces all global variables with a single reactive store
 */
import type { CalcFamiliar, ConditionalBonus, Character, Wave } from '../types/index.js';
import type { BonusItem, BonusItemsConfig, ConditionalBonusesConfig } from '../types/bonus.js';
/**
 * Application state interface
 */
export interface AppState {
    calcFamiliars: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null];
    currentWave: Wave | null;
    bonusItems: BonusItem[];
    conditionalBonuses: ConditionalBonus[];
    characters: Character[];
    currentCharacterId: number | null;
    editingFamiliarId: number | null;
    modalSelectedConditional: ConditionalBonus | null;
    modalSelectedTrigger: string | null;
    modalTriggerVariants: ConditionalBonus[];
    rosterSelectedConditional: ConditionalBonus | null;
    rosterSelectedTrigger: string | null;
    rosterTriggerVariants: ConditionalBonus[];
    configBonusItems: BonusItemsConfig;
    configConditionalBonuses: ConditionalBonusesConfig;
    optimizerRunning: boolean;
    optimizerProgress: number;
}
type Listener = (state: AppState) => void;
type Selector<T> = (state: AppState) => T;
/**
 * Simple reactive store implementation
 */
declare class Store {
    private state;
    private listeners;
    constructor(initialState: AppState);
    /**
     * Get current state (readonly)
     */
    getState(): Readonly<AppState>;
    /**
     * Update state with partial updates or updater function
     */
    setState(updater: Partial<AppState> | ((state: AppState) => Partial<AppState>)): void;
    /**
     * Select a piece of state
     */
    select<T>(selector: Selector<T>): T;
    /**
     * Subscribe to state changes
     * Returns unsubscribe function
     */
    subscribe(listener: Listener): () => void;
    /**
     * Notify all listeners of state change
     */
    private notify;
    /**
     * Reset state to initial values (preserving config)
     */
    reset(): void;
}
export declare const store: Store;
export declare const selectors: {
    getCurrentCharacter: (state: AppState) => Character | undefined;
    getCurrentRoster: (state: AppState) => import("../types/familiar.js").Familiar[];
    getActiveCalcFamiliars: (state: AppState) => CalcFamiliar[];
    getWaveFamiliars: (state: AppState, wave: Wave) => import("../types/familiar.js").Familiar[];
};
export {};
//# sourceMappingURL=store.d.ts.map