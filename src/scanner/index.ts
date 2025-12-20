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

  // Update canvas to show cropped result
  canvas.width = croppedData.width;
  canvas.height = croppedData.height;
  ctx.drawImage(croppedData.canvas, 0, 0);

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
 * Get the scanner canvas element
 */
export function getScannerCanvas(): HTMLCanvasElement | null {
  return canvas;
}

// Re-export types and utilities
export type { ScanResult, ReferenceImages } from './types.js';
export { matchConditionalText, findTopMatches } from './text-matcher.js';
export { detectRank } from './rank-detector.js';
export { scannerConfig } from './config.js';
