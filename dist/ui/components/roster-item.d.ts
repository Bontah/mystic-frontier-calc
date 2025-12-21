/**
 * Roster item component
 */
import type { Familiar, Wave } from '../../types/index.js';
/**
 * Render a roster item
 */
export declare function renderRosterItem(fam: Familiar): string;
export interface RosterFilterOptions {
    search: string;
    rank: string;
    element: string;
    type: string;
    wave: string;
    sortBy: string;
}
/**
 * Filter and sort roster based on options
 */
export declare function filterAndSortRoster(roster: Familiar[], options: RosterFilterOptions): Familiar[];
/**
 * Render the full roster list
 */
export declare function renderRosterList(roster: Familiar[], options?: RosterFilterOptions): string;
/**
 * Render wave filter tabs
 */
export declare function renderWaveFilters(activeWave: Wave | null): string;
/**
 * Get current filter options from the UI
 */
export declare function getRosterFilterOptions(): RosterFilterOptions;
/**
 * Update roster list in the DOM
 */
export declare function updateRosterList(roster: Familiar[], options?: RosterFilterOptions): void;
//# sourceMappingURL=roster-item.d.ts.map