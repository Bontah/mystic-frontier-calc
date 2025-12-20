/**
 * Image processing utilities for the scanner
 */
import type { RGB, CroppedImageData, IconData, Region } from './types.js';
/**
 * Calculate color distance between two RGB colors
 */
export declare function colorDistance(c1: RGB, c2: RGB): number;
/**
 * Load an image from a URL
 */
export declare function loadImage(src: string): Promise<HTMLImageElement>;
/**
 * Detect and crop card by border color
 */
export declare function detectAndCropByBorder(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): CroppedImageData;
/**
 * Extract a region from cropped image data
 */
export declare function extractIconRegion(croppedData: CroppedImageData, region: Region): IconData;
/**
 * Preprocess image for OCR (Otsu's thresholding)
 */
export declare function preprocessForOCR(ctx: CanvasRenderingContext2D, width: number, height: number): void;
//# sourceMappingURL=image-processor.d.ts.map