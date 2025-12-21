/**
 * Familiar types and interfaces
 */
export type Rank = 'Common' | 'Rare' | 'Epic' | 'Unique' | 'Legendary';
export type Element = 'None' | 'Fire' | 'Poison' | 'Lightning' | 'Ice' | 'Dark' | 'Holy';
export type FamiliarType = 'Human' | 'Beast' | 'Plant' | 'Aquatic' | 'Fairy' | 'Reptile' | 'Devil' | 'Undead' | 'Machine';
export type Wave = 1 | 2 | 3;
/**
 * Conditional bonus attached to a familiar
 */
export interface ConditionalBonus {
    id?: string;
    name: string;
    condition: string;
    flatBonus: number;
    multiplierBonus: number;
    rarity?: Rank;
    rank?: Rank;
    color?: string;
    prePatch?: boolean;
}
/**
 * Familiar in the roster (stored data)
 */
export interface Familiar {
    id: number;
    name: string;
    rank: Rank;
    element: Element;
    type: FamiliarType;
    conditional: ConditionalBonus | null;
    wave?: Wave | null;
    disabled?: boolean;
}
/**
 * Familiar in calculator slots (may not have id)
 */
export interface CalcFamiliar {
    id?: number;
    name: string;
    rank: Rank;
    element: Element;
    type: FamiliarType;
    conditional: ConditionalBonus | null;
}
/**
 * Minimal familiar data for condition evaluation
 */
export interface FamiliarContext {
    type: string;
    element: string;
    rank?: string;
}
//# sourceMappingURL=familiar.d.ts.map