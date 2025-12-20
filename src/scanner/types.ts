/**
 * Scanner-specific types
 */

import type { Rank, Element, FamiliarType, ConditionalBonus } from '../types/index.js';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CroppedImageData {
  borderColor: RGB;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  croppedImageUrl: string;
  bounds: Bounds;
}

export interface IconData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export interface RankResult {
  rank: Rank;
  confidence: number;
  distance: number;
}

export interface ElementResult {
  element: Element;
  confidence: number;
  allScores: Record<string, number>;
  iconData: IconData;
}

export interface TypeResult {
  type: FamiliarType;
  confidence: number;
  allScores: Record<string, number>;
  iconData: IconData;
}

export interface ConditionalResult {
  rawText: string;
  matched: (ConditionalBonus & { matchScore: number }) | null;
  confidence: number;
}

export interface ScanResult {
  name: string;
  rank: RankResult;
  element: ElementResult;
  type: TypeResult;
  conditional: ConditionalResult;
  croppedImage: string;
}

export interface ScannerConfig {
  borderColors: Record<Rank, RGB>;
  elementIconRegion: Region;
  typeIconRegion: Region;
  nameRegion: Region;
  textRegion: Region;
  debug: boolean;
}

export interface ReferenceImages {
  elements: Record<string, HTMLImageElement>;
  types: Record<string, HTMLImageElement>;
}
