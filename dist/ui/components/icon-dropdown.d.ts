/**
 * Custom dropdown component with icon support
 */
export interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
    color?: string;
}
export interface IconDropdownConfig {
    containerId: string;
    options: DropdownOption[];
    defaultValue?: string;
    placeholder?: string;
    onChange?: (value: string) => void;
}
/**
 * Rank options with colors
 */
export declare const RANK_OPTIONS: DropdownOption[];
/**
 * Element options with icons
 */
export declare const ELEMENT_OPTIONS: DropdownOption[];
/**
 * Type options with icons
 */
export declare const TYPE_OPTIONS: DropdownOption[];
/**
 * Create an icon dropdown instance
 */
export declare function createIconDropdown(config: IconDropdownConfig): {
    getValue: () => string;
    setValue: (value: string) => void;
    destroy: () => void;
};
//# sourceMappingURL=icon-dropdown.d.ts.map