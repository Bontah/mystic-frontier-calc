/**
 * Scanner configuration
 */
import type { ScannerConfig } from './types.js';
export declare const scannerConfig: ScannerConfig;
export declare const CARD_BACKGROUND: {
    r: number;
    g: number;
    b: number;
};
export declare const BACKGROUND_TOLERANCE = 40;
export declare const BORDER_TOLERANCE = 50;
/**
 * Icon matcher configuration with tunable weights
 */
export declare const ICON_MATCHER_CONFIG: {
    backgroundTolerance: number;
    morphologyKernel: number;
    useAdaptiveBackground: boolean;
    weights: {
        mask: number;
        hu: number;
        edge: number;
        color: number;
    };
};
//# sourceMappingURL=config.d.ts.map