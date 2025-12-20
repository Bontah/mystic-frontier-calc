/**
 * Unified Conditional Selector
 * Reusable component for selecting conditionals in both modal and roster contexts
 */
import type { ConditionalBonus, Rank } from '../../types/index.js';
/**
 * Configuration for a conditional selector instance
 */
export interface ConditionalSelectorConfig {
    searchInputId: string;
    resultsContainerId: string;
    variantSectionId: string;
    variantPillsId: string;
    triggerNameId: string;
    displayId: string;
    rankSelectId?: string;
    prePatchCheckboxId?: string;
    onSelect?: (conditional: ConditionalBonus) => void;
    onClear?: () => void;
}
/**
 * Create a conditional selector instance
 */
export declare function createConditionalSelector(config: ConditionalSelectorConfig): {
    search: () => void;
    selectTrigger: (index: number) => void;
    selectVariant: (index: number) => void;
    clear: () => void;
    showRankBasedTriggers: (rank: Rank) => void;
    getSelected: () => ConditionalBonus | null;
    setSelected: (conditional: ConditionalBonus | null) => void;
    updateDisplay: () => void;
};
//# sourceMappingURL=index.d.ts.map