/**
 * HTML utility functions
 */
/**
 * Escape HTML special characters to prevent XSS
 */
export declare function escapeHtml(text: string): string;
/**
 * Create an element from HTML string
 */
export declare function createElementFromHtml(html: string): HTMLElement;
/**
 * Safely set innerHTML with escaped content
 */
export declare function setInnerHtml(element: HTMLElement, html: string): void;
/**
 * Get element by ID with type assertion
 */
export declare function getElementById<T extends HTMLElement>(id: string): T | null;
/**
 * Query selector with type assertion
 */
export declare function querySelector<T extends HTMLElement>(selector: string, parent?: ParentNode): T | null;
/**
 * Query selector all with type assertion
 */
export declare function querySelectorAll<T extends HTMLElement>(selector: string, parent?: ParentNode): NodeListOf<T>;
//# sourceMappingURL=html.d.ts.map