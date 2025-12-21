/**
 * Scanner configuration
 */

import type { ScannerConfig } from './types.js';

export const scannerConfig: ScannerConfig = {
  borderColors: {
    Common: { r: 127, g: 127, b: 127 },    // Gray (placeholder)
    Rare: { r: 0, g: 150, b: 255 },        // Blue-ish (placeholder)
    Epic: { r: 110, g: 75, b: 255 },       // Purple-ish (placeholder)
    Unique: { r: 205, g: 97, b: 9 },       // Orange-ish (placeholder)
    Legendary: { r: 80, g: 163, b: 2 },    // #50A302 - Lime green (confirmed)
  },
  // Icon positions relative to card (percentages)
  elementIconRegion: { x: 0.89, y: 0.185, w: 0.065, h: 0.060 },
  typeIconRegion: { x: 0.895, y: 0.27, w: 0.063, h: 0.060 },
  nameRegion: { x: 0.05, y: 0.05, w: 0.75, h: 0.05 },
  textRegion: { x: 0.03, y: 0.79, w: 0.94, h: 0.1 },
  debug: false,
};

// Background color for masking (dark card background)
export const CARD_BACKGROUND = { r: 58, g: 52, b: 47 };
export const BACKGROUND_TOLERANCE = 40;
export const BORDER_TOLERANCE = 50;

/**
 * Icon matcher configuration with tunable weights
 */
export const ICON_MATCHER_CONFIG = {
  backgroundTolerance: 45,
  morphologyKernel: 0,
  useAdaptiveBackground: true,
  weights: {
    mask: 0.80,   // Mask overlap (IoU + Dice)
    hu: 0.00,     // Hu moments (rotation/scale invariant)
    edge: 0.20,   // Edge detection (Sobel)
    color: 0.00,  // Color similarity (HSL)
  },
};
