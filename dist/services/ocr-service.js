/**
 * OCR Service
 * Wrapper for Tesseract.js OCR functionality
 */
let worker = null;
let initPromise = null;
/**
 * Initialize Tesseract worker
 */
export async function initOCR() {
    if (worker)
        return;
    if (initPromise) {
        await initPromise;
        return;
    }
    initPromise = (async () => {
        try {
            // Check if Tesseract is loaded
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js is not loaded');
            }
            worker = await Tesseract.createWorker('eng');
            console.log('OCR worker initialized');
        }
        catch (error) {
            console.error('Failed to initialize OCR:', error);
            throw error;
        }
    })();
    await initPromise;
}
/**
 * Recognize text from an image
 */
export async function recognizeText(image) {
    if (!worker) {
        await initOCR();
    }
    if (!worker) {
        throw new Error('OCR worker not available');
    }
    const result = await worker.recognize(image);
    return result.data.text.trim();
}
/**
 * Extract text from a canvas region
 */
export async function extractTextFromCanvas(canvas, region) {
    let imageSource = canvas;
    if (region) {
        // Create a new canvas with just the region
        const regionCanvas = document.createElement('canvas');
        regionCanvas.width = region.width;
        regionCanvas.height = region.height;
        const ctx = regionCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(canvas, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
            imageSource = regionCanvas;
        }
    }
    return recognizeText(imageSource);
}
/**
 * Cleanup OCR worker
 */
export async function terminateOCR() {
    if (worker) {
        await worker.terminate();
        worker = null;
        initPromise = null;
    }
}
/**
 * Check if OCR is available
 */
export function isOCRAvailable() {
    return typeof Tesseract !== 'undefined';
}
//# sourceMappingURL=ocr-service.js.map