/**
 * Centralized state store
 * Replaces all global variables with a single reactive store
 */

import type {
  CalcFamiliar,
  ConditionalBonus,
  Character,
  Wave,
  OptimizerConfig,
} from '../types/index.js';
import type { BonusItem, BonusItemsConfig, ConditionalBonusesConfig } from '../types/bonus.js';

/**
 * Saved wave lineup type
 */
export type SavedWaves = {
  [K in Wave]: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null];
};

/**
 * Application state interface
 */
export interface AppState {
  // Calculator state
  calcFamiliars: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null];
  currentWave: Wave | null;

  // Saved wave lineups (independent of roster)
  savedWaves: SavedWaves;

  // Active bonus items (user-selected)
  bonusItems: BonusItem[];

  // Active conditional bonuses (user-added)
  conditionalBonuses: ConditionalBonus[];

  // Character/Roster state
  characters: Character[];
  currentCharacterId: number | null;

  // Roster editing state
  editingFamiliarId: number | null;

  // Modal conditional selection state
  modalSelectedConditional: ConditionalBonus | null;
  modalSelectedTrigger: string | null;
  modalTriggerVariants: ConditionalBonus[];

  // Roster conditional selection state
  rosterSelectedConditional: ConditionalBonus | null;
  rosterSelectedTrigger: string | null;
  rosterTriggerVariants: ConditionalBonus[];

  // Config data (loaded from JSON)
  configBonusItems: BonusItemsConfig;
  configConditionalBonuses: ConditionalBonusesConfig;
  configOptimizer: OptimizerConfig;

  // Optimizer state
  optimizerRunning: boolean;
  optimizerProgress: number;
}

type Listener = (state: AppState) => void;
type Selector<T> = (state: AppState) => T;

/**
 * Create the initial state
 */
function createInitialState(): AppState {
  return {
    calcFamiliars: [null, null, null],
    currentWave: null,
    savedWaves: {
      1: [null, null, null],
      2: [null, null, null],
      3: [null, null, null],
    },
    bonusItems: [],
    conditionalBonuses: [],
    characters: [],
    currentCharacterId: null,
    editingFamiliarId: null,
    modalSelectedConditional: null,
    modalSelectedTrigger: null,
    modalTriggerVariants: [],
    rosterSelectedConditional: null,
    rosterSelectedTrigger: null,
    rosterTriggerVariants: [],
    configBonusItems: { version: '1.0', description: '', items: [] },
    configConditionalBonuses: { bonuses: [] },
    configOptimizer: {
      version: '1.0',
      strategies: {
        overall: { enabled: true, ignoredConditionalIds: [] },
        lowRolls: { enabled: true, ignoredConditionalIds: [] },
        highRolls: { enabled: true, ignoredConditionalIds: [] },
        median: { enabled: true, ignoredConditionalIds: [] },
        floorGuarantee: { enabled: true, ignoredConditionalIds: [] },
        balanced: { enabled: true, ignoredConditionalIds: [] },
      },
    },
    optimizerRunning: false,
    optimizerProgress: 0,
  };
}

/**
 * Simple reactive store implementation
 */
class Store {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<AppState> {
    return this.state;
  }

  /**
   * Update state with partial updates or updater function
   */
  setState(updater: Partial<AppState> | ((state: AppState) => Partial<AppState>)): void {
    const updates = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  /**
   * Select a piece of state
   */
  select<T>(selector: Selector<T>): T {
    return selector(this.state);
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Reset state to initial values (preserving config)
   */
  reset(): void {
    const config = {
      configBonusItems: this.state.configBonusItems,
      configConditionalBonuses: this.state.configConditionalBonuses,
      configOptimizer: this.state.configOptimizer,
    };
    this.state = { ...createInitialState(), ...config };
    this.notify();
  }
}

// Singleton store instance
export const store = new Store(createInitialState());

// Convenience selectors
export const selectors = {
  getCurrentCharacter: (state: AppState): Character | undefined =>
    state.characters.find((c) => c.id === state.currentCharacterId),

  getCurrentRoster: (state: AppState) => {
    const char = state.characters.find((c) => c.id === state.currentCharacterId);
    return char?.roster ?? [];
  },

  getActiveCalcFamiliars: (state: AppState): CalcFamiliar[] =>
    state.calcFamiliars.filter((f): f is CalcFamiliar => f !== null),

  getWaveFamiliars: (state: AppState, wave: Wave) => {
    const roster = selectors.getCurrentRoster(state);
    return roster.filter((f) => f.wave === wave && !f.disabled);
  },
};
