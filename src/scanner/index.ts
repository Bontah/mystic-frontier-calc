/**
 * Image Scanner Module
 * Provides OCR and image recognition for familiar cards
 */

import type { ReferenceImages, ScanResult, CroppedImageData } from './types.js';
import { scannerConfig } from './config.js';
import {
  loadImage,
  detectAndCropByBorder,
  extractIconRegion,
  preprocessForOCR,
} from './image-processor.js';
import { detectRank } from './rank-detector.js';
import { detectElement, detectType } from './icon-matcher.js';
import { matchConditionalText } from './text-matcher.js';
import { initOCR, recognizeText } from '../services/ocr-service.js';

// Reference images for icon matching
let referenceImages: ReferenceImages = { elements: {}, types: {} };

// Scanner canvas and context
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

/**
 * Initialize the scanner
 */
export async function initScanner(): Promise<void> {
  canvas = document.getElementById('scannerCanvas') as HTMLCanvasElement;
  if (!canvas) return;

  ctx = canvas.getContext('2d', { willReadFrequently: true });

  await loadReferenceImages();
}

/**
 * Load reference images for element and type detection
 */
async function loadReferenceImages(): Promise<void> {
  const elements = ['Fire', 'Ice', 'Lightning', 'Poison', 'Dark', 'Holy', 'None'];
  const types = [
    'Human',
    'Beast',
    'Plant',
    'Aquatic',
    'Fairy',
    'Reptile',
    'Devil',
    'Undead',
    'Machine',
  ];

  for (const element of elements) {
    try {
      referenceImages.elements[element] = await loadImage(`element/${element}.png`);
    } catch {
      console.warn(`Could not load element reference: ${element}`);
    }
  }

  for (const type of types) {
    try {
      referenceImages.types[type] = await loadImage(`type/${type}.png`);
    } catch {
      console.warn(`Could not load type reference: ${type}`);
    }
  }
}

/**
 * Extract name from cropped card using OCR
 */
async function extractName(croppedData: CroppedImageData): Promise<string> {
  const region = scannerConfig.nameRegion;
  const x = Math.floor(croppedData.width * region.x);
  const y = Math.floor(croppedData.height * region.y);
  const w = Math.floor(croppedData.width * region.w);
  const h = Math.floor(croppedData.height * region.h);

  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = w;
  nameCanvas.height = h;
  const nameCtx = nameCanvas.getContext('2d')!;

  nameCtx.drawImage(croppedData.canvas, x, y, w, h, 0, 0, w, h);
  preprocessForOCR(nameCtx, w, h);

  try {
    await initOCR();
    const rawText = await recognizeText(nameCanvas);
    return rawText.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

/**
 * Extract conditional text from cropped card using OCR
 */
async function extractConditionalText(
  croppedData: CroppedImageData
): Promise<{ rawText: string; matched: ReturnType<typeof matchConditionalText>; confidence: number }> {
  const region = scannerConfig.textRegion;
  const x = Math.floor(croppedData.width * region.x);
  const y = Math.floor(croppedData.height * region.y);
  const w = Math.floor(croppedData.width * region.w);
  const h = Math.floor(croppedData.height * region.h);

  const textCanvas = document.createElement('canvas');
  textCanvas.width = w;
  textCanvas.height = h;
  const textCtx = textCanvas.getContext('2d')!;

  textCtx.drawImage(croppedData.canvas, x, y, w, h, 0, 0, w, h);
  preprocessForOCR(textCtx, w, h);

  try {
    await initOCR();
    const rawText = await recognizeText(textCanvas);
    const matched = matchConditionalText(rawText);

    return {
      rawText,
      matched,
      confidence: matched?.matchScore ?? 0,
    };
  } catch {
    return { rawText: '', matched: null, confidence: 0 };
  }
}

/**
 * Process an image file and extract familiar data
 */
export async function processImage(
  file: File,
  onProgress?: (status: string) => void
): Promise<ScanResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file');
  }

  if (!canvas || !ctx) {
    throw new Error('Scanner not initialized');
  }

  onProgress?.('Loading image...');

  // Load image
  const imageUrl = URL.createObjectURL(file);
  const image = await loadImage(imageUrl);
  URL.revokeObjectURL(imageUrl);

  // Draw to canvas
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  onProgress?.('Detecting border...');

  // Detect and crop by border
  const croppedData = detectAndCropByBorder(canvas, ctx);

  onProgress?.('Detecting rank...');

  // Detect rank
  const rankResult = detectRank(croppedData.borderColor);

  onProgress?.('Detecting element...');

  // Detect element
  const elementIconData = extractIconRegion(
    croppedData,
    scannerConfig.elementIconRegion
  );
  const elementResult = detectElement(elementIconData, referenceImages);

  onProgress?.('Detecting type...');

  // Detect type
  const typeIconData = extractIconRegion(croppedData, scannerConfig.typeIconRegion);
  const typeResult = detectType(typeIconData, referenceImages);

  onProgress?.('Extracting name...');

  // OCR for name
  const name = await extractName(croppedData);

  onProgress?.('Extracting conditional...');

  // OCR for conditional
  const conditionalResult = await extractConditionalText(croppedData);

  // Debug: Draw extraction regions on canvas
  if (scannerConfig.debug) {
    drawDebugOverlay(croppedData);
    // Update croppedImageUrl AFTER drawing debug overlay
    croppedData.croppedImageUrl = croppedData.canvas.toDataURL('image/png');
  }

  // Update canvas to show cropped result
  canvas.width = croppedData.width;
  canvas.height = croppedData.height;
  ctx.drawImage(croppedData.canvas, 0, 0);

  // Log debug info to console
  if (scannerConfig.debug) {
    console.log('Scanner Results:', {
      borderColor: croppedData.borderColor,
      bounds: croppedData.bounds,
      rank: rankResult,
      element: elementResult,
      type: typeResult,
      name,
      conditional: conditionalResult,
    });
  }

  onProgress?.('Done!');

  return {
    name,
    rank: rankResult,
    element: elementResult,
    type: typeResult,
    conditional: conditionalResult,
    croppedImage: croppedData.croppedImageUrl,
  };
}

/**
 * Draw debug overlay showing extraction regions
 */
function drawDebugOverlay(croppedData: CroppedImageData): void {
  const ctx = croppedData.ctx;
  const w = croppedData.width;
  const h = croppedData.height;

  // Draw element region (red)
  const elemRegion = scannerConfig.elementIconRegion;
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    w * elemRegion.x, h * elemRegion.y,
    w * elemRegion.w, h * elemRegion.h
  );
  ctx.fillStyle = 'red';
  ctx.font = '12px sans-serif';
  ctx.fillText('ELEMENT', w * elemRegion.x, h * elemRegion.y - 2);

  // Draw type region (blue)
  const typeRegion = scannerConfig.typeIconRegion;
  ctx.strokeStyle = 'blue';
  ctx.strokeRect(
    w * typeRegion.x, h * typeRegion.y,
    w * typeRegion.w, h * typeRegion.h
  );
  ctx.fillStyle = 'blue';
  ctx.fillText('TYPE', w * typeRegion.x, h * typeRegion.y - 2);

  // Draw name region (cyan)
  const nameRegion = scannerConfig.nameRegion;
  ctx.strokeStyle = 'cyan';
  ctx.strokeRect(
    w * nameRegion.x, h * nameRegion.y,
    w * nameRegion.w, h * nameRegion.h
  );
  ctx.fillStyle = 'cyan';
  ctx.fillText('NAME', w * nameRegion.x, h * nameRegion.y - 2);

  // Draw text region (green)
  const textRegion = scannerConfig.textRegion;
  ctx.strokeStyle = 'lime';
  ctx.strokeRect(
    w * textRegion.x, h * textRegion.y,
    w * textRegion.w, h * textRegion.h
  );
  ctx.fillStyle = 'lime';
  ctx.fillText('TEXT/OCR', w * textRegion.x, h * textRegion.y - 2);

  // Draw border bounds info
  ctx.fillStyle = 'yellow';
  ctx.font = '14px monospace';
  ctx.fillText(`Bounds: L=${croppedData.bounds.left} T=${croppedData.bounds.top} R=${croppedData.bounds.right} B=${croppedData.bounds.bottom}`, 5, 16);
  ctx.fillText(`Border: RGB(${croppedData.borderColor.r}, ${croppedData.borderColor.g}, ${croppedData.borderColor.b})`, 5, 32);
}

/**
 * Get the scanner canvas element
 */
export function getScannerCanvas(): HTMLCanvasElement | null {
  return canvas;
}

/**
 * Get reference images for debug display
 */
export function getReferenceImages(): ReferenceImages {
  return referenceImages;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return scannerConfig.debug;
}

// Re-export types and utilities
export type { ScanResult, ReferenceImages, TuningParameters } from './types.js';
export { matchConditionalText, findTopMatches } from './text-matcher.js';
export { detectRank } from './rank-detector.js';
export { scannerConfig } from './config.js';
export {
  recalculateTypeWithTuning,
  getLastTypeDetails,
  getLastTypeIconData,
  generateMaskPreviews,
} from './icon-matcher.js';
