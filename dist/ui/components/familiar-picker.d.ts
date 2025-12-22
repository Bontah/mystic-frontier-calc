/**
 * Familiar picker component for selecting from collection
 */
import type { Familiar } from '../../types/index.js';
export interface FamiliarPickerConfig {
    searchInputId: string;
    resultsContainerId: string;
    filterRankId: string;
    filterElementId: string;
    filterTypeId: string;
    onSelect: (familiar: Familiar) => void;
}
/**
 * Render a single picker result item
 */
export declare function renderPickerItem(familiar: Familiar): string;
export interface FamiliarPicker {
    refresh: () => void;
    clear: () => void;
    destroy: () => void;
}
/**
 * Create a familiar picker component
 */
export declare function createFamiliarPicker(config: FamiliarPickerConfig): FamiliarPicker;
//# sourceMappingURL=familiar-picker.d.ts.map