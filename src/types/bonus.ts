/**
 * Bonus item and config types
 */

/**
 * Bonus item that can be equipped
 */
export interface BonusItem {
  id: string;
  name: string;
  description: string;
  flatBonus: number;
  multiplierBonus: number;
}

/**
 * Bonus items configuration file structure
 */
export interface BonusItemsConfig {
  version: string;
  description: string;
  items: BonusItem[];
}

/**
 * Conditional bonuses configuration file structure
 */
export interface ConditionalBonusesConfig {
  version?: string;
  bonuses: import('./familiar.js').ConditionalBonus[];
}

/**
 * Grouped trigger for conditional selection UI
 */
export interface TriggerGroup {
  name: string;
  variants: import('./familiar.js').ConditionalBonus[];
  variantCount: number;
}
