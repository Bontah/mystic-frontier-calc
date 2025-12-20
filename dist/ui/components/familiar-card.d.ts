/**
 * Familiar card component
 */
import type { CalcFamiliar } from '../../types/index.js';
/**
 * Render an empty familiar slot
 */
export declare function renderEmptySlot(index: number): string;
/**
 * Render a familiar card
 */
export declare function renderFamiliarCard(fam: CalcFamiliar, index: number): string;
/**
 * Render all familiar cards in the calculator
 */
export declare function renderFamiliarCards(familiars: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null]): string;
/**
 * Update the familiars grid in the DOM
 */
export declare function updateFamiliarsGrid(familiars: [CalcFamiliar | null, CalcFamiliar | null, CalcFamiliar | null]): void;
//# sourceMappingURL=familiar-card.d.ts.map