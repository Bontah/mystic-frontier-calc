/**
 * Image Scanner Module
 * Provides OCR and image recognition for familiar cards
 */
import type { ReferenceImages, ScanResult } from './types.js';
/**
 * Initialize the scanner
 */
export declare function initScanner(): Promise<void>;
/**
 * Process an image file and extract familiar data
 */
export declare function processImage(file: File, onProgress?: (status: string) => void): Promise<ScanResult>;
/**
 * Get the scanner canvas element
 */
export declare function getScannerCanvas(): HTMLCanvasElement | null;
/**
 * Get reference images for debug display
 */
export declare function getReferenceImages(): ReferenceImages;
/**
 * Check if debug mode is enabled
 */
export declare function isDebugEnabled(): boolean;
export type { ScanResult, ReferenceImages, TuningParameters } from './types.js';
export { matchConditionalText, findTopMatches } from './text-matcher.js';
export { detectRank } from './rank-detector.js';
export { scannerConfig } from './config.js';
export { recalculateTypeWithTuning, getLastTypeDetails, getLastTypeIconData, generateMaskPreviews, } from './icon-matcher.js';
//# sourceMappingURL=index.d.ts.map