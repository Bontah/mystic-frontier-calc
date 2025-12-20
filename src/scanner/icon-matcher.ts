/**
 * Icon matching for element and type detection
 */

import type { IconData, ElementResult, TypeResult, ReferenceImages } from './types.js';
import type { Element, FamiliarType } from '../types/index.js';
import { CARD_BACKGROUND, BACKGROUND_TOLERANCE } from './config.js';

const COMPARE_SIZE = 32;

/**
 * Check if a color is similar to the card background
 */
function isBackground(r: number, g: number, b: number): boolean {
  const dist = Math.sqrt(
    Math.pow(r - CARD_BACKGROUND.r, 2) +
    Math.pow(g - CARD_BACKGROUND.g, 2) +
    Math.pow(b - CARD_BACKGROUND.b, 2)
  );
  return dist < BACKGROUND_TOLERANCE;
}

/**
 * Calculate color histogram similarity (for element detection)
 */
function calculateColorHistogramSimilarity(
  sourceIcon: IconData,
  referenceImage: HTMLImageElement
): number {
  // Resize both to standard size
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = COMPARE_SIZE;
  srcCanvas.height = COMPARE_SIZE;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(sourceIcon.canvas, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
  const srcData = srcCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);

  const refCanvas = document.createElement('canvas');
  refCanvas.width = COMPARE_SIZE;
  refCanvas.height = COMPARE_SIZE;
  const refCtx = refCanvas.getContext('2d')!;
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

    if (srcA < 128) continue;

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

  if (srcPixelCount === 0 || refPixelCount === 0) return 0;

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
 * Create binary mask from image
 */
function createBinaryMask(
  imageData: ImageData,
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];
    const a = imageData.data[idx + 3];

    const dist = Math.sqrt(
      Math.pow(r - CARD_BACKGROUND.r, 2) +
      Math.pow(g - CARD_BACKGROUND.g, 2) +
      Math.pow(b - CARD_BACKGROUND.b, 2)
    );
    mask[i] = a > 128 && dist > BACKGROUND_TOLERANCE + 5 ? 1 : 0;
  }

  return mask;
}

/**
 * Calculate Intersection over Union
 */
function calculateIoU(mask1: Uint8Array, mask2: Uint8Array): number {
  let intersection = 0;
  let union = 0;

  for (let i = 0; i < mask1.length; i++) {
    if (mask1[i] && mask2[i]) intersection++;
    if (mask1[i] || mask2[i]) union++;
  }

  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate Dice coefficient
 */
function calculateDice(mask1: Uint8Array, mask2: Uint8Array): number {
  let intersection = 0;
  let sum1 = 0;
  let sum2 = 0;

  for (let i = 0; i < mask1.length; i++) {
    if (mask1[i] && mask2[i]) intersection++;
    sum1 += mask1[i];
    sum2 += mask2[i];
  }

  return sum1 + sum2 > 0 ? (2 * intersection) / (sum1 + sum2) : 0;
}

/**
 * Calculate Hu moments for shape matching
 */
function calculateHuMoments(
  mask: Uint8Array,
  width: number,
  height: number
): number[] {
  // Raw moments
  let m00 = 0, m10 = 0, m01 = 0;
  let m11 = 0, m20 = 0, m02 = 0;
  let m21 = 0, m12 = 0, m30 = 0, m03 = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = mask[y * width + x];
      if (v === 0) continue;

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

  if (m00 === 0) return new Array(7).fill(0);

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
  const norm = (p: number, q: number) => Math.pow(m00, 1 + (p + q) / 2);
  const nu20 = mu20 / norm(2, 0);
  const nu02 = mu02 / norm(0, 2);
  const nu11 = mu11 / norm(1, 1);
  const nu30 = mu30 / norm(3, 0);
  const nu03 = mu03 / norm(0, 3);
  const nu21 = mu21 / norm(2, 1);
  const nu12 = mu12 / norm(1, 2);

  // 7 Hu moments
  const hu: number[] = new Array(7);
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
function huMomentDistance(hu1: number[], hu2: number[]): number {
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
function calculateShapeSimilarity(
  sourceIcon: IconData,
  referenceImage: HTMLImageElement
): number {
  // Resize both to standard size
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = COMPARE_SIZE;
  srcCanvas.height = COMPARE_SIZE;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(sourceIcon.canvas, 0, 0, COMPARE_SIZE, COMPARE_SIZE);
  const srcData = srcCtx.getImageData(0, 0, COMPARE_SIZE, COMPARE_SIZE);

  const refCanvas = document.createElement('canvas');
  refCanvas.width = COMPARE_SIZE;
  refCanvas.height = COMPARE_SIZE;
  const refCtx = refCanvas.getContext('2d')!;
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
  } else {
    return maskScore * 0.4 + huScore * 0.6;
  }
}

/**
 * Detect element from icon
 */
export function detectElement(
  iconData: IconData,
  referenceImages: ReferenceImages
): ElementResult {
  let bestMatch: ElementResult = {
    element: 'None',
    confidence: 0,
    allScores: {},
    iconData,
  };

  const allScores: Record<string, number> = {};

  for (const [element, refImage] of Object.entries(referenceImages.elements)) {
    const similarity = calculateColorHistogramSimilarity(iconData, refImage);
    allScores[element] = Math.round(similarity);

    if (similarity > bestMatch.confidence) {
      bestMatch = {
        element: element as Element,
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
 * Detect type from icon
 */
export function detectType(
  iconData: IconData,
  referenceImages: ReferenceImages
): TypeResult {
  let bestMatch: TypeResult = {
    type: 'Human',
    confidence: 0,
    allScores: {},
    iconData,
  };

  const allScores: Record<string, number> = {};

  for (const [type, refImage] of Object.entries(referenceImages.types)) {
    const similarity = calculateShapeSimilarity(iconData, refImage);
    allScores[type] = Math.round(similarity);

    if (similarity > bestMatch.confidence) {
      bestMatch = {
        type: type as FamiliarType,
        confidence: Math.round(similarity),
        allScores,
        iconData,
      };
    }
  }

  bestMatch.allScores = allScores;
  return bestMatch;
}
