/**
 * Icon matching for element and type detection
 */
import { CARD_BACKGROUND, BACKGROUND_TOLERANCE, ICON_MATCHER_CONFIG } from './config.js';
const COMPARE_SIZE = 32;
// Store last scan data for live recalculation
let lastTypeIconData = null;
let lastReferenceImages = null;
let lastTypeAllDetails = {};
/**
 * Check if a color is similar to the card background
 */
function isBackground(r, g, b) {
    const dist = Math.sqrt(Math.pow(r - CARD_BACKGROUND.r, 2) +
        Math.pow(g - CARD_BACKGROUND.g, 2) +
        Math.pow(b - CARD_BACKGROUND.b, 2));
    return dist < BACKGROUND_TOLERANCE;
}
/**
 * Calculate color histogram similarity (for element detection)
 */
function calculateColorHistogramSimilarity(sourceIcon, referenceImage) {
    // Resize both to standard size
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = COMPARE_SIZE;
    srcCanvas.height = COMPARE_SIZE;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(sourceIcon.canvas, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const srcData = srcCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const refCanvas = document.createElement('canvas');
    refCanvas.width = COMPARE_SIZE;
    refCanvas.height = COMPARE_SIZE;
    const refCtx = refCanvas.getContext('2d');
    refCtx.drawImage(referenceImage, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const refData = refCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);
    // Color histogram (8 bins per channel)
    const bins = 8;
    const binSize = 256 / bins;
    const srcHist = {
        r: new Array(bins).fill(0),
        g: new Array(bins).fill(0),
        b: new Array(bins).fill(0),
    };
    const refHist = {
        r: new Array(bins).fill(0),
        g: new Array(bins).fill(0),
        b: new Array(bins).fill(0),
    };
    let srcPixelCount = 0;
    let refPixelCount = 0;
    for (let i = 0; i < srcData.data.length; i += 4) {
        const srcR = srcData.data[i];
        const srcG = srcData.data[i + 1];
        const srcB = srcData.data[i + 2];
        const srcA = srcData.data[i + 3];
        const refR = refData.data[i];
        const refG = refData.data[i + 1];
        const refB = refData.data[i + 2];
        const refA = refData.data[i + 3];
        if (srcA < 128)
            continue;
        if (!isBackground(srcR, srcG, srcB)) {
            srcHist.r[Math.floor(srcR / binSize)]++;
            srcHist.g[Math.floor(srcG / binSize)]++;
            srcHist.b[Math.floor(srcB / binSize)]++;
            srcPixelCount++;
        }
        if (refA >= 128) {
            refHist.r[Math.floor(refR / binSize)]++;
            refHist.g[Math.floor(refG / binSize)]++;
            refHist.b[Math.floor(refB / binSize)]++;
            refPixelCount++;
        }
    }
    if (srcPixelCount === 0 || refPixelCount === 0)
        return 0;
    // Normalize and calculate intersection
    let intersection = 0;
    for (let i = 0; i < bins; i++) {
        srcHist.r[i] /= srcPixelCount;
        srcHist.g[i] /= srcPixelCount;
        srcHist.b[i] /= srcPixelCount;
        refHist.r[i] /= refPixelCount;
        refHist.g[i] /= refPixelCount;
        refHist.b[i] /= refPixelCount;
        intersection += Math.min(srcHist.r[i], refHist.r[i]);
        intersection += Math.min(srcHist.g[i], refHist.g[i]);
        intersection += Math.min(srcHist.b[i], refHist.b[i]);
    }
    return (intersection / 3) * 100;
}
/**
 * Create binary mask from image (legacy)
 */
function createBinaryMask(imageData, width, height) {
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        const a = imageData.data[idx + 3];
        const dist = Math.sqrt(Math.pow(r - CARD_BACKGROUND.r, 2) +
            Math.pow(g - CARD_BACKGROUND.g, 2) +
            Math.pow(b - CARD_BACKGROUND.b, 2));
        mask[i] = a > 128 && dist > BACKGROUND_TOLERANCE + 5 ? 1 : 0;
    }
    return mask;
}
// ============================================================================
// ENHANCED MASK CREATION
// ============================================================================
/**
 * Sample background color from icon corners (adaptive)
 */
function sampleIconBackground(imageData, width, height) {
    const cornerPixels = [];
    const margin = 2;
    // Sample corners (4 pixels from each corner)
    const positions = [
        // Top-left
        [0, 0], [1, 0], [0, 1], [1, 1],
        // Top-right
        [width - margin, 0], [width - 1, 0], [width - margin, 1], [width - 1, 1],
        // Bottom-left
        [0, height - margin], [1, height - margin], [0, height - 1], [1, height - 1],
        // Bottom-right
        [width - margin, height - margin], [width - 1, height - margin],
        [width - margin, height - 1], [width - 1, height - 1],
    ];
    for (const [x, y] of positions) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = (y * width + x) * 4;
            cornerPixels.push({
                r: imageData.data[idx],
                g: imageData.data[idx + 1],
                b: imageData.data[idx + 2],
            });
        }
    }
    if (cornerPixels.length === 0)
        return CARD_BACKGROUND;
    // Calculate average
    const avg = cornerPixels.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
    return {
        r: Math.round(avg.r / cornerPixels.length),
        g: Math.round(avg.g / cornerPixels.length),
        b: Math.round(avg.b / cornerPixels.length),
    };
}
/**
 * Calculate color distance
 */
function colorDistance(c1, c2) {
    return Math.sqrt(Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2));
}
/**
 * Morphological erosion (shrink foreground)
 */
function morphologicalErode(mask, width, height, kernelSize) {
    const result = new Uint8Array(width * height);
    const halfK = kernelSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let allForeground = true;
            for (let ky = -halfK; ky <= halfK && allForeground; ky++) {
                for (let kx = -halfK; kx <= halfK && allForeground; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height || mask[ny * width + nx] === 0) {
                        allForeground = false;
                    }
                }
            }
            result[y * width + x] = allForeground ? 1 : 0;
        }
    }
    return result;
}
/**
 * Morphological dilation (expand foreground)
 */
function morphologicalDilate(mask, width, height, kernelSize) {
    const result = new Uint8Array(width * height);
    const halfK = kernelSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let anyForeground = false;
            for (let ky = -halfK; ky <= halfK && !anyForeground; ky++) {
                for (let kx = -halfK; kx <= halfK && !anyForeground; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx] === 1) {
                        anyForeground = true;
                    }
                }
            }
            result[y * width + x] = anyForeground ? 1 : 0;
        }
    }
    return result;
}
/**
 * Create enhanced binary mask with adaptive background and morphology
 */
function createBinaryMaskEnhanced(imageData, width, height, options = {}) {
    const opts = {
        backgroundTolerance: options.backgroundTolerance ?? ICON_MATCHER_CONFIG.backgroundTolerance,
        useAdaptiveBackground: options.useAdaptiveBackground ?? ICON_MATCHER_CONFIG.useAdaptiveBackground,
        morphologyKernel: options.morphologyKernel ?? ICON_MATCHER_CONFIG.morphologyKernel,
        alphaThreshold: options.alphaThreshold ?? 128,
    };
    // Get background color (adaptive or fixed)
    const bgColor = opts.useAdaptiveBackground
        ? sampleIconBackground(imageData, width, height)
        : CARD_BACKGROUND;
    // Create initial mask
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        const a = imageData.data[idx + 3];
        const dist = colorDistance({ r, g, b }, bgColor);
        mask[i] = a > opts.alphaThreshold && dist > opts.backgroundTolerance ? 1 : 0;
    }
    // Apply morphological operations if enabled (erosion then dilation = opening)
    if (opts.morphologyKernel > 0) {
        const eroded = morphologicalErode(mask, width, height, opts.morphologyKernel);
        return morphologicalDilate(eroded, width, height, opts.morphologyKernel);
    }
    return mask;
}
// ============================================================================
// EDGE DETECTION
// ============================================================================
/**
 * Create edge mask using Sobel operator
 */
function createEdgeMask(imageData, width, height) {
    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = imageData.data[idx] * 0.299 + imageData.data[idx + 1] * 0.587 + imageData.data[idx + 2] * 0.114;
    }
    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const edges = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            let k = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixel = gray[(y + ky) * width + (x + kx)];
                    gx += pixel * sobelX[k];
                    gy += pixel * sobelY[k];
                    k++;
                }
            }
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edges[y * width + x] = magnitude > 50 ? 1 : 0; // Edge threshold
        }
    }
    return edges;
}
/**
 * Calculate edge similarity using Dice coefficient
 */
function calculateEdgeSimilarity(edges1, edges2) {
    let intersection = 0, sum1 = 0, sum2 = 0;
    for (let i = 0; i < edges1.length; i++) {
        if (edges1[i] && edges2[i])
            intersection++;
        sum1 += edges1[i];
        sum2 += edges2[i];
    }
    return sum1 + sum2 > 0 ? (2 * intersection) / (sum1 + sum2) * 100 : 0;
}
// ============================================================================
// COLOR ANALYSIS
// ============================================================================
/**
 * Convert RGB to HSL
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}
/**
 * Extract dominant color from foreground pixels
 */
function extractDominantColor(imageData, mask, width, height) {
    const pixels = [];
    for (let i = 0; i < width * height; i++) {
        if (mask[i] === 0)
            continue;
        const idx = i * 4;
        const hsl = rgbToHsl(imageData.data[idx], imageData.data[idx + 1], imageData.data[idx + 2]);
        pixels.push(hsl);
    }
    if (pixels.length === 0)
        return null;
    // Calculate average HSL
    const avgH = pixels.reduce((a, p) => a + p.h, 0) / pixels.length;
    const avgS = pixels.reduce((a, p) => a + p.s, 0) / pixels.length;
    const avgL = pixels.reduce((a, p) => a + p.l, 0) / pixels.length;
    return { h: avgH, s: avgS, l: avgL };
}
/**
 * Calculate color similarity between two HSL colors
 */
function calculateColorSimilarity(color1, color2) {
    if (!color1 || !color2)
        return 0;
    // Hue difference (circular, 0-180 max)
    let hueDiff = Math.abs(color1.h - color2.h);
    if (hueDiff > 180)
        hueDiff = 360 - hueDiff;
    hueDiff /= 180; // Normalize to 0-1
    const satDiff = Math.abs(color1.s - color2.s) / 100;
    const lumDiff = Math.abs(color1.l - color2.l) / 100;
    // Weighted combination
    const distance = hueDiff * 0.5 + satDiff * 0.3 + lumDiff * 0.2;
    return Math.max(0, (1 - distance) * 100);
}
// ============================================================================
// ENHANCED SHAPE SIMILARITY
// ============================================================================
/**
 * Calculate enhanced shape similarity with all methods
 */
function calculateShapeSimilarityEnhanced(sourceIcon, referenceImage, options = {}) {
    const weights = {
        mask: options.maskWeight ?? ICON_MATCHER_CONFIG.weights.mask,
        hu: options.huWeight ?? ICON_MATCHER_CONFIG.weights.hu,
        edge: options.edgeWeight ?? ICON_MATCHER_CONFIG.weights.edge,
        color: options.colorWeight ?? ICON_MATCHER_CONFIG.weights.color,
    };
    const maskOptions = options.maskOptions ?? {};
    // Resize both to standard size
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = COMPARE_SIZE;
    srcCanvas.height = COMPARE_SIZE;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(sourceIcon.canvas, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const srcData = srcCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const refCanvas = document.createElement('canvas');
    refCanvas.width = COMPARE_SIZE;
    refCanvas.height = COMPARE_SIZE;
    const refCtx = refCanvas.getContext('2d');
    refCtx.drawImage(referenceImage, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const refData = refCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);
    // Create enhanced masks
    const srcMask = createBinaryMaskEnhanced(srcData, COMPARE_SIZE, COMPARE_SIZE, maskOptions);
    const refMask = createBinaryMaskEnhanced(refData, COMPARE_SIZE, COMPARE_SIZE, maskOptions);
    // 1. Mask overlap (IoU + Dice)
    const iou = calculateIoU(srcMask, refMask);
    const dice = calculateDice(srcMask, refMask);
    const maskScore = (iou * 0.4 + dice * 0.6) * 100;
    // 2. Hu moments
    const srcHu = calculateHuMoments(srcMask, COMPARE_SIZE, COMPARE_SIZE);
    const refHu = calculateHuMoments(refMask, COMPARE_SIZE, COMPARE_SIZE);
    const huDistance = huMomentDistance(srcHu, refHu);
    const huScore = Math.max(0, 100 - huDistance * 20);
    // 3. Edge similarity
    const srcEdges = createEdgeMask(srcData, COMPARE_SIZE, COMPARE_SIZE);
    const refEdges = createEdgeMask(refData, COMPARE_SIZE, COMPARE_SIZE);
    const edgeScore = calculateEdgeSimilarity(srcEdges, refEdges);
    // 4. Color similarity
    const srcColor = extractDominantColor(srcData, srcMask, COMPARE_SIZE, COMPARE_SIZE);
    const refColor = extractDominantColor(refData, refMask, COMPARE_SIZE, COMPARE_SIZE);
    const colorScore = calculateColorSimilarity(srcColor, refColor);
    // Weighted combination
    const finalScore = maskScore * weights.mask +
        huScore * weights.hu +
        edgeScore * weights.edge +
        colorScore * weights.color;
    return {
        score: finalScore,
        details: {
            mask: Math.round(maskScore),
            hu: Math.round(huScore),
            edge: Math.round(edgeScore),
            color: Math.round(colorScore),
        },
    };
}
/**
 * Calculate Intersection over Union
 */
function calculateIoU(mask1, mask2) {
    let intersection = 0;
    let union = 0;
    for (let i = 0; i < mask1.length; i++) {
        if (mask1[i] && mask2[i])
            intersection++;
        if (mask1[i] || mask2[i])
            union++;
    }
    return union > 0 ? intersection / union : 0;
}
/**
 * Calculate Dice coefficient
 */
function calculateDice(mask1, mask2) {
    let intersection = 0;
    let sum1 = 0;
    let sum2 = 0;
    for (let i = 0; i < mask1.length; i++) {
        if (mask1[i] && mask2[i])
            intersection++;
        sum1 += mask1[i];
        sum2 += mask2[i];
    }
    return sum1 + sum2 > 0 ? (2 * intersection) / (sum1 + sum2) : 0;
}
/**
 * Calculate Hu moments for shape matching
 */
function calculateHuMoments(mask, width, height) {
    // Raw moments
    let m00 = 0, m10 = 0, m01 = 0;
    let m11 = 0, m20 = 0, m02 = 0;
    let m21 = 0, m12 = 0, m30 = 0, m03 = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const v = mask[y * width + x];
            if (v === 0)
                continue;
            m00 += v;
            m10 += x * v;
            m01 += y * v;
            m11 += x * y * v;
            m20 += x * x * v;
            m02 += y * y * v;
            m21 += x * x * y * v;
            m12 += x * y * y * v;
            m30 += x * x * x * v;
            m03 += y * y * y * v;
        }
    }
    if (m00 === 0)
        return new Array(7).fill(0);
    // Centroid
    const cx = m10 / m00;
    const cy = m01 / m00;
    // Central moments
    const mu20 = m20 / m00 - cx * cx;
    const mu02 = m02 / m00 - cy * cy;
    const mu11 = m11 / m00 - cx * cy;
    const mu30 = m30 / m00 - 3 * cx * mu20 - cx * cx * cx;
    const mu03 = m03 / m00 - 3 * cy * mu02 - cy * cy * cy;
    const mu21 = m21 / m00 - 2 * cx * mu11 - cy * mu20 - cx * cx * cy;
    const mu12 = m12 / m00 - 2 * cy * mu11 - cx * mu02 - cx * cy * cy;
    // Normalized central moments
    const norm = (p, q) => Math.pow(m00, 1 + (p + q) / 2);
    const nu20 = mu20 / norm(2, 0);
    const nu02 = mu02 / norm(0, 2);
    const nu11 = mu11 / norm(1, 1);
    const nu30 = mu30 / norm(3, 0);
    const nu03 = mu03 / norm(0, 3);
    const nu21 = mu21 / norm(2, 1);
    const nu12 = mu12 / norm(1, 2);
    // 7 Hu moments
    const hu = new Array(7);
    hu[0] = nu20 + nu02;
    hu[1] = Math.pow(nu20 - nu02, 2) + 4 * Math.pow(nu11, 2);
    hu[2] = Math.pow(nu30 - 3 * nu12, 2) + Math.pow(3 * nu21 - nu03, 2);
    hu[3] = Math.pow(nu30 + nu12, 2) + Math.pow(nu21 + nu03, 2);
    hu[4] =
        (nu30 - 3 * nu12) *
            (nu30 + nu12) *
            (Math.pow(nu30 + nu12, 2) - 3 * Math.pow(nu21 + nu03, 2)) +
            (3 * nu21 - nu03) *
                (nu21 + nu03) *
                (3 * Math.pow(nu30 + nu12, 2) - Math.pow(nu21 + nu03, 2));
    hu[5] =
        (nu20 - nu02) * (Math.pow(nu30 + nu12, 2) - Math.pow(nu21 + nu03, 2)) +
            4 * nu11 * (nu30 + nu12) * (nu21 + nu03);
    hu[6] =
        (3 * nu21 - nu03) *
            (nu30 + nu12) *
            (Math.pow(nu30 + nu12, 2) - 3 * Math.pow(nu21 + nu03, 2)) -
            (nu30 - 3 * nu12) *
                (nu21 + nu03) *
                (3 * Math.pow(nu30 + nu12, 2) - Math.pow(nu21 + nu03, 2));
    return hu;
}
/**
 * Calculate Hu moment distance
 */
function huMomentDistance(hu1, hu2) {
    let distance = 0;
    for (let i = 0; i < 7; i++) {
        const sign1 = hu1[i] >= 0 ? 1 : -1;
        const sign2 = hu2[i] >= 0 ? 1 : -1;
        const log1 = hu1[i] !== 0 ? sign1 * Math.log10(Math.abs(hu1[i])) : 0;
        const log2 = hu2[i] !== 0 ? sign2 * Math.log10(Math.abs(hu2[i])) : 0;
        distance += Math.abs(log1 - log2);
    }
    return distance;
}
/**
 * Calculate shape similarity (for type detection)
 */
function calculateShapeSimilarity(sourceIcon, referenceImage) {
    // Resize both to standard size
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = COMPARE_SIZE;
    srcCanvas.height = COMPARE_SIZE;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(sourceIcon.canvas, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const srcData = srcCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const refCanvas = document.createElement('canvas');
    refCanvas.width = COMPARE_SIZE;
    refCanvas.height = COMPARE_SIZE;
    const refCtx = refCanvas.getContext('2d');
    refCtx.drawImage(referenceImage, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const refData = refCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);
    // Create binary masks
    const srcMask = createBinaryMask(srcData, COMPARE_SIZE, COMPARE_SIZE);
    const refMask = createBinaryMask(refData, COMPARE_SIZE, COMPARE_SIZE);
    // Mask overlap score
    const iou = calculateIoU(srcMask, refMask);
    const dice = calculateDice(srcMask, refMask);
    const maskScore = (iou * 0.4 + dice * 0.6) * 100;
    // Hu moments score
    const srcHu = calculateHuMoments(srcMask, COMPARE_SIZE, COMPARE_SIZE);
    const refHu = calculateHuMoments(refMask, COMPARE_SIZE, COMPARE_SIZE);
    const huDistance = huMomentDistance(srcHu, refHu);
    const huScore = Math.max(0, 100 - huDistance * 20);
    // Combine scores
    if (maskScore > 60) {
        return maskScore * 0.8 + huScore * 0.2;
    }
    else {
        return maskScore * 0.4 + huScore * 0.6;
    }
}
/**
 * Detect element from icon
 */
export function detectElement(iconData, referenceImages) {
    let bestMatch = {
        element: 'None',
        confidence: 0,
        allScores: {},
        iconData,
    };
    const allScores = {};
    for (const [element, refImage] of Object.entries(referenceImages.elements)) {
        const similarity = calculateColorHistogramSimilarity(iconData, refImage);
        allScores[element] = Math.round(similarity);
        if (similarity > bestMatch.confidence) {
            bestMatch = {
                element: element,
                confidence: Math.round(similarity),
                allScores,
                iconData,
            };
        }
    }
    bestMatch.allScores = allScores;
    return bestMatch;
}
/**
 * Detect type from icon (using enhanced multi-method matching)
 */
export function detectType(iconData, referenceImages) {
    // Store for recalculation
    lastTypeIconData = iconData;
    lastReferenceImages = referenceImages;
    lastTypeAllDetails = {};
    let bestMatch = {
        type: 'Human',
        confidence: 0,
        allScores: {},
        iconData,
    };
    const allScores = {};
    for (const [type, refImage] of Object.entries(referenceImages.types)) {
        // Use enhanced similarity with all methods
        const result = calculateShapeSimilarityEnhanced(iconData, refImage);
        allScores[type] = Math.round(result.score);
        lastTypeAllDetails[type] = result.details;
        if (result.score > bestMatch.confidence) {
            bestMatch = {
                type: type,
                confidence: Math.round(result.score),
                allScores,
                iconData,
            };
        }
    }
    bestMatch.allScores = allScores;
    return bestMatch;
}
/**
 * Recalculate type detection with custom tuning parameters
 * Returns updated scores and details for live tuning UI
 */
export function recalculateTypeWithTuning(params) {
    if (!lastTypeIconData || !lastReferenceImages) {
        console.warn('No scan data available for recalculation');
        return null;
    }
    const options = {
        maskWeight: params.maskWeight,
        huWeight: params.huWeight,
        edgeWeight: params.edgeWeight,
        colorWeight: params.colorWeight,
        maskOptions: {
            backgroundTolerance: params.backgroundTolerance,
            morphologyKernel: params.morphologyKernel,
            useAdaptiveBackground: params.useAdaptiveBackground,
        },
    };
    const allScores = {};
    const allDetails = {};
    for (const [type, refImage] of Object.entries(lastReferenceImages.types)) {
        const result = calculateShapeSimilarityEnhanced(lastTypeIconData, refImage, options);
        allScores[type] = Math.round(result.score);
        allDetails[type] = result.details;
    }
    // Update stored details
    lastTypeAllDetails = allDetails;
    return { allScores, allDetails };
}
/**
 * Get the last type detection details for debug display
 */
export function getLastTypeDetails() {
    return lastTypeAllDetails;
}
/**
 * Get stored icon data for mask preview rendering
 */
export function getLastTypeIconData() {
    return lastTypeIconData;
}
/**
 * Generate mask preview data for debug display
 */
export function generateMaskPreviews(params) {
    if (!lastTypeIconData)
        return null;
    // Resize to compare size
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = COMPARE_SIZE;
    srcCanvas.height = COMPARE_SIZE;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(lastTypeIconData.canvas, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
    const srcData = srcCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);
    // Raw mask (no morphology)
    const rawMask = createBinaryMaskEnhanced(srcData, COMPARE_SIZE, COMPARE_SIZE, {
        ...params,
        morphologyKernel: 0,
    });
    // Cleaned mask (with morphology)
    const cleanedMask = createBinaryMaskEnhanced(srcData, COMPARE_SIZE, COMPARE_SIZE, params);
    // Edge mask
    const edges = createEdgeMask(srcData, COMPARE_SIZE, COMPARE_SIZE);
    return { rawMask, cleanedMask, edges };
}
export { COMPARE_SIZE };
//# sourceMappingURL=icon-matcher.js.map