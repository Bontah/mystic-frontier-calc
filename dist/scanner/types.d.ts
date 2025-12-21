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
    matched: (ConditionalBonus & {
        matchScore: number;
    }) | null;
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
/**
 * Options for binary mask creation
 */
export interface MaskOptions {
    backgroundTolerance: number;
    useAdaptiveBackground: boolean;
    morphologyKernel: number;
    alphaThreshold: number;
}
/**
 * Tuning parameters for live adjustment
 */
export interface TuningParameters {
    backgroundTolerance: number;
    morphologyKernel: number;
    maskWeight: number;
    huWeight: number;
    edgeWeight: number;
    colorWeight: number;
    useAdaptiveBackground: boolean;
}
/**
 * Options for shape similarity calculation
 */
export interface ShapeSimilarityOptions {
    maskWeight: number;
    huWeight: number;
    edgeWeight: number;
    colorWeight: number;
    maskOptions: Partial<MaskOptions>;
}
/**
 * Result of enhanced shape similarity calculation
 */
export interface ShapeSimilarityResult {
    score: number;
    details: {
        mask: number;
        hu: number;
        edge: number;
        color: number;
    };
}
/**
 * Default mask options
 */
export declare const DEFAULT_MASK_OPTIONS: MaskOptions;
/**
 * Default tuning parameters
 */
export declare const DEFAULT_TUNING_PARAMS: TuningParameters;
//# sourceMappingURL=types.d.ts.map