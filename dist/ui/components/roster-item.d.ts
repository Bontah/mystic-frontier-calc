/**
 * Roster item component
 */
import type { Familiar, Wave } from '../../types/index.js';
/**
 * Render a roster item
 */
export declare function renderRosterItem(fam: Familiar): string;
/**
 * Render the full roster list
 */
export declare function renderRosterList(roster: Familiar[]): string;
/**
 * Render wave filter tabs
 */
export declare function renderWaveFilters(activeWave: Wave | null): string;
/**
 * Update roster list in the DOM
 */
export declare function updateRosterList(roster: Familiar[]): void;
//# sourceMappingURL=roster-item.d.ts.map