/**
 * Icon matching for element and type detection
 */
import type { IconData, ElementResult, TypeResult, ReferenceImages, TuningParameters } from './types.js';
declare const COMPARE_SIZE = 32;
/**
 * Detect element from icon
 */
export declare function detectElement(iconData: IconData, referenceImages: ReferenceImages): ElementResult;
/**
 * Detect type from icon (using enhanced multi-method matching)
 */
export declare function detectType(iconData: IconData, referenceImages: ReferenceImages): TypeResult;
/**
 * Recalculate type detection with custom tuning parameters
 * Returns updated scores and details for live tuning UI
 */
export declare function recalculateTypeWithTuning(params: TuningParameters): {
    allScores: Record<string, number>;
    allDetails: Record<string, {
        mask: number;
        hu: number;
        edge: number;
        color: number;
    }>;
} | null;
/**
 * Get the last type detection details for debug display
 */
export declare function getLastTypeDetails(): Record<string, {
    mask: number;
    hu: number;
    edge: number;
    color: number;
}>;
/**
 * Get stored icon data for mask preview rendering
 */
export declare function getLastTypeIconData(): IconData | null;
/**
 * Generate mask preview data for debug display
 */
export declare function generateMaskPreviews(params: TuningParameters): {
    rawMask: Uint8Array;
    cleanedMask: Uint8Array;
    edges: Uint8Array;
} | null;
export { COMPARE_SIZE };
//# sourceMappingURL=icon-matcher.d.ts.map