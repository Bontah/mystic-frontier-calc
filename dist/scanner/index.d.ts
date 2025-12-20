/**
 * Image Scanner Module
 * Provides OCR and image recognition for familiar cards
 */
import type { ScanResult } from './types.js';
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
export type { ScanResult, ReferenceImages } from './types.js';
export { matchConditionalText, findTopMatches } from './text-matcher.js';
export { detectRank } from './rank-detector.js';
export { scannerConfig } from './config.js';
//# sourceMappingURL=index.d.ts.map