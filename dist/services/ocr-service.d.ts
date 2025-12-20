/**
 * OCR Service
 * Wrapper for Tesseract.js OCR functionality
 */
type ImageSource = HTMLImageElement | HTMLCanvasElement | Blob | string;
/**
 * Initialize Tesseract worker
 */
export declare function initOCR(): Promise<void>;
/**
 * Recognize text from an image
 */
export declare function recognizeText(image: ImageSource): Promise<string>;
/**
 * Extract text from a canvas region
 */
export declare function extractTextFromCanvas(canvas: HTMLCanvasElement, region?: {
    x: number;
    y: number;
    width: number;
    height: number;
}): Promise<string>;
/**
 * Cleanup OCR worker
 */
export declare function terminateOCR(): Promise<void>;
/**
 * Check if OCR is available
 */
export declare function isOCRAvailable(): boolean;
export {};
//# sourceMappingURL=ocr-service.d.ts.map