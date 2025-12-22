/**
 * Centralized state store
 * Replaces all global variables with a single reactive store
 */
/**
 * Create the initial state
 */
function createInitialState() {
    return {
        calcFamiliars: [null, null, null],
        currentWave: null,
        savedWaves: {
            1: [null, null, null],
            2: [null, null, null],
            3: [null, null, null],
        },
        bonusItems: [],
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
                diceIndependent: { enabled: true, ignoredConditionalIds: [] },
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
    state;
    listeners = new Set();
    constructor(initialState) {
        this.state = initialState;
    }
    /**
     * Get current state (readonly)
     */
    getState() {
        return this.state;
    }
    /**
     * Update state with partial updates or updater function
     */
    setState(updater) {
        const updates = typeof updater === 'function' ? updater(this.state) : updater;
        this.state = { ...this.state, ...updates };
        this.notify();
    }
    /**
     * Select a piece of state
     */
    select(selector) {
        return selector(this.state);
    }
    /**
     * Subscribe to state changes
     * Returns unsubscribe function
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    /**
     * Notify all listeners of state change
     */
    notify() {
        this.listeners.forEach((listener) => listener(this.state));
    }
    /**
     * Reset state to initial values (preserving config)
     */
    reset() {
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
    getCurrentCharacter: (state) => state.characters.find((c) => c.id === state.currentCharacterId),
    getCurrentRoster: (state) => {
        const char = state.characters.find((c) => c.id === state.currentCharacterId);
        return char?.roster ?? [];
    },
    getActiveCalcFamiliars: (state) => state.calcFamiliars.filter((f) => f !== null),
    getWaveFamiliars: (state, wave) => {
        const roster = selectors.getCurrentRoster(state);
        return roster.filter((f) => f.wave === wave && !f.disabled);
    },
};
//# sourceMappingURL=store.js.map