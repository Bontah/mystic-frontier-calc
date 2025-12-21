/**
 * Event handlers setup
 * Uses event delegation for better performance
 */
import { createConditionalSelector } from './conditional-selector/index.js';
/**
 * Setup all event handlers
 */
export declare function setupEventHandlers(): void;
/**
 * Setup modal close buttons
 */
export declare function setupModalCloseButtons(): void;
/**
 * Get the modal conditional selector instance
 */
export declare function getModalConditionalSelector(): ReturnType<typeof createConditionalSelector> | null;
/**
 * Get the roster conditional selector instance
 */
export declare function getRosterConditionalSelector(): ReturnType<typeof createConditionalSelector> | null;
/**
 * Show optimizer strategy cards
 */
export declare function showOptimizerStrategies(): void;
//# sourceMappingURL=event-handlers.d.ts.map