/**
 * Page navigation
 */
type PageName = 'calculator' | 'roster' | 'info' | 'howtouse';
type HiddenPageName = 'famfinder';
type AllPageName = PageName | HiddenPageName;
/**
 * Show a specific page
 */
export declare function showPage(pageName: AllPageName): void;
/**
 * Get current active page
 */
export declare function getCurrentPage(): AllPageName | null;
/**
 * Check URL for hidden page parameter and navigate if found
 * Returns true if a hidden page was found and navigated to
 */
export declare function checkUrlForHiddenPage(): boolean;
/**
 * Setup navigation event listeners
 */
export declare function setupNavigation(): void;
export {};
//# sourceMappingURL=navigation.d.ts.map