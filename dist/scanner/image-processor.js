/**
 * Image processing utilities for the scanner
 */
import { scannerConfig, BORDER_TOLERANCE } from './config.js';
/**
 * Calculate color distance between two RGB colors
 */
export function colorDistance(c1, c2) {
    return Math.sqrt(Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2));
}
/**
 * Load an image from a URL
 */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });
}
/**
 * Check if a pixel matches any known border color
 */
function matchesBorderColor(r, g, b) {
    const borderColors = scannerConfig.borderColors;
    for (const [rank, color] of Object.entries(borderColors)) {
        const dist = colorDistance({ r, g, b }, color);
        if (dist < BORDER_TOLERANCE) {
            return { match: true, rank, color };
        }
    }
    return { match: false };
}
/**
 * Detect and crop card by border color
 */
export function detectAndCropByBorder(canvas, ctx) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    let left = 0;
    let right = width;
    let top = 0;
    let bottom = height;
    let detectedColor = null;
    // Find left edge
    leftScan: for (let x = 0; x < width / 2; x++) {
        for (let y = Math.floor(height * 0.3); y < height * 0.7; y++) {
            const idx = (y * width + x) * 4;
            const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
            if (result.match) {
                left = x;
                detectedColor = result.color;
                break leftScan;
            }
        }
    }
    // Find right edge
    rightScan: for (let x = width - 1; x > width / 2; x--) {
        for (let y = Math.floor(height * 0.3); y < height * 0.7; y++) {
            const idx = (y * width + x) * 4;
            const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
            if (result.match) {
                right = x + 1;
                break rightScan;
            }
        }
    }
    // Find top edge
    topScan: for (let y = 0; y < height / 2; y++) {
        for (let x = Math.floor(width * 0.3); x < width * 0.7; x++) {
            const idx = (y * width + x) * 4;
            const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
            if (result.match) {
                top = y;
                break topScan;
            }
        }
    }
    // Find bottom edge
    bottomScan: for (let y = height - 1; y > height / 2; y--) {
        for (let x = Math.floor(width * 0.3); x < width * 0.7; x++) {
            const idx = (y * width + x) * 4;
            const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
            if (result.match) {
                bottom = y + 1;
                break bottomScan;
            }
        }
    }
    const borderColor = detectedColor ?? { r: 128, g: 128, b: 128 };
    const bounds = { left, right, top, bottom };
    // Crop the image
    const cropWidth = bounds.right - bounds.left;
    const cropHeight = bounds.bottom - bounds.top;
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(canvas, bounds.left, bounds.top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return {
        borderColor,
        canvas: croppedCanvas,
        ctx: croppedCtx,
        width: cropWidth,
        height: cropHeight,
        croppedImageUrl: croppedCanvas.toDataURL('image/png'),
        bounds,
    };
}
/**
 * Extract a region from cropped image data
 */
export function extractIconRegion(croppedData, region) {
    const x = Math.floor(croppedData.width * region.x);
    const y = Math.floor(croppedData.height * region.y);
    const w = Math.floor(croppedData.width * region.w);
    const h = Math.floor(croppedData.height * region.h);
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = w;
    iconCanvas.height = h;
    const iconCtx = iconCanvas.getContext('2d');
    iconCtx.drawImage(croppedData.canvas, x, y, w, h, 0, 0, w, h);
    return { canvas: iconCanvas, ctx: iconCtx, width: w, height: h };
}
/**
 * Preprocess image for OCR (Otsu's thresholding)
 */
export function preprocessForOCR(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < pixels.length; i += 4) {
        const gray = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
        histogram[gray]++;
    }
    // Otsu's method for threshold
    const totalPixels = width * height;
    let sum = 0;
    for (let i = 0; i < 256; i++)
        sum += i * histogram[i];
    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 128;
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0)
            continue;
        const wF = totalPixels - wB;
        if (wF === 0)
            break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
        }
    }
    // Apply thresholding
    for (let i = 0; i < pixels.length; i += 4) {
        const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        // Invert if text is light on dark
        const value = threshold < 128
            ? gray > threshold
                ? 0
                : 255
            : gray > threshold
                ? 255
                : 0;
        pixels[i] = value;
        pixels[i + 1] = value;
        pixels[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);
}
//# sourceMappingURL=image-processor.js.map