/**
 * Configuration loader service
 * Loads JSON configuration files for bonus items and conditionals
 */
import type { BonusItemsConfig, ConditionalBonusesConfig } from '../types/bonus.js';
import type { OptimizerConfig } from '../types/index.js';
import { store } from '../state/store.js';
/**
 * Load bonus items configuration
 */
export declare function loadBonusItemsConfig(): Promise<BonusItemsConfig>;
/**
 * Load conditional bonuses configuration
 * Flattens the categorized structure into a single bonuses array
 */
export declare function loadConditionalBonusesConfig(): Promise<ConditionalBonusesConfig>;
/**
 * Load optimizer configuration
 */
export declare function loadOptimizerConfig(): Promise<OptimizerConfig>;
/**
 * Load all configurations and update store
 */
export declare function loadAllConfigs(): Promise<void>;
/**
 * Get bonus item by ID from config
 */
export declare function getBonusItemById(id: string): ReturnType<typeof store.getState>['configBonusItems']['items'][0] | undefined;
/**
 * Search bonus items by name
 */
export declare function searchBonusItems(query: string): ReturnType<typeof store.getState>['configBonusItems']['items'];
/**
 * Search conditional bonuses by name or condition
 */
export declare function searchConditionalBonuses(query: string, options?: {
    rank?: string;
    prePatch?: boolean;
}): ReturnType<typeof store.getState>['configConditionalBonuses']['bonuses'];
//# sourceMappingURL=config-loader.d.ts.map