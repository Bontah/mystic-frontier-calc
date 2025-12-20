/**
 * Page navigation
 */
type PageName = 'calculator' | 'roster' | 'info' | 'howtouse';
/**
 * Show a specific page
 */
export declare function showPage(pageName: PageName): void;
/**
 * Get current active page
 */
export declare function getCurrentPage(): PageName | null;
/**
 * Setup navigation event listeners
 */
export declare function setupNavigation(): void;
export {};
//# sourceMappingURL=navigation.d.ts.map