/**
 * UI Actions
 * Functions that handle user interactions and update state
 */
import type { CalcFamiliar, Wave, Familiar } from '../types/index.js';
/**
 * Perform calculation and update display
 */
export declare function calculate(): void;
/**
 * Set a familiar in a calculator slot
 */
export declare function setCalcFamiliar(slot: number, familiar: CalcFamiliar | null): void;
/**
 * Delete a familiar from calculator slot
 */
export declare function deleteCalcFamiliar(slot: number): void;
/**
 * Reset all calculator familiars
 */
export declare function resetAllFamiliars(): void;
/**
 * Load a wave lineup into calculator
 */
export declare function loadWave(wave: Wave): void;
/**
 * Save current lineup to wave
 */
export declare function saveToCurrentWave(): void;
/**
 * Add familiar to roster
 */
export declare function addFamiliarToRoster(familiar: Omit<Familiar, 'id'>): void;
/**
 * Delete familiar from roster
 */
export declare function deleteFamiliarFromRoster(id: number): void;
/**
 * Toggle familiar disabled state
 */
export declare function toggleFamiliarDisabled(id: number): void;
/**
 * Switch to a different character
 */
export declare function switchCharacter(id: number): void;
//# sourceMappingURL=actions.d.ts.map