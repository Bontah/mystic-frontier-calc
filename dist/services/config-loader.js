/**
 * Configuration loader service
 * Loads JSON configuration files for bonus items and conditionals
 */
import { store } from '../state/store.js';
const CONFIG_PATHS = {
    BONUS_ITEMS: 'config/bonus-items.json',
    CONDITIONAL_BONUSES: 'config/conditional-bonuses.json',
};
/**
 * Load a JSON file
 */
async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return response.json();
}
/**
 * Load bonus items configuration
 */
export async function loadBonusItemsConfig() {
    try {
        const config = await loadJson(CONFIG_PATHS.BONUS_ITEMS);
        return config;
    }
    catch (error) {
        console.error('Failed to load bonus items config:', error);
        return { version: '1.0', description: '', items: [] };
    }
}
/**
 * Load conditional bonuses configuration
 * Flattens the categorized structure into a single bonuses array
 */
export async function loadConditionalBonusesConfig() {
    try {
        const rawConfig = await loadJson(CONFIG_PATHS.CONDITIONAL_BONUSES);
        // Flatten categories into a single bonuses array with rarity attached
        const bonuses = [];
        for (const [rarity, category] of Object.entries(rawConfig.categories || {})) {
            for (const bonus of category.bonuses || []) {
                bonuses.push({
                    ...bonus,
                    rarity: rarity,
                    color: category.color,
                });
            }
        }
        return { version: rawConfig.version, bonuses };
    }
    catch (error) {
        console.error('Failed to load conditional bonuses config:', error);
        return { bonuses: [] };
    }
}
/**
 * Load all configurations and update store
 */
export async function loadAllConfigs() {
    const [bonusItems, conditionalBonuses] = await Promise.all([
        loadBonusItemsConfig(),
        loadConditionalBonusesConfig(),
    ]);
    store.setState({
        configBonusItems: bonusItems,
        configConditionalBonuses: conditionalBonuses,
    });
}
/**
 * Get bonus item by ID from config
 */
export function getBonusItemById(id) {
    const state = store.getState();
    return state.configBonusItems.items.find((item) => item.id === id);
}
/**
 * Search bonus items by name
 */
export function searchBonusItems(query) {
    const state = store.getState();
    const lowerQuery = query.toLowerCase();
    return state.configBonusItems.items.filter((item) => item.name.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery));
}
/**
 * Search conditional bonuses by name or condition
 */
export function searchConditionalBonuses(query, options) {
    const state = store.getState();
    const lowerQuery = query.toLowerCase();
    return state.configConditionalBonuses.bonuses.filter((bonus) => {
        // Filter by rank if specified (unless prePatch)
        if (!options?.prePatch && options?.rank && bonus.rarity !== options.rank) {
            return false;
        }
        // Search in name and condition
        return (bonus.name.toLowerCase().includes(lowerQuery) ||
            bonus.condition.toLowerCase().includes(lowerQuery));
    });
}
//# sourceMappingURL=config-loader.js.map