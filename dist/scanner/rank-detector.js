/**
 * Rank detection from border color
 */
import { scannerConfig } from './config.js';
import { colorDistance } from './image-processor.js';
/**
 * Detect rank from border color
 */
export function detectRank(borderColor) {
    const ranks = scannerConfig.borderColors;
    let bestMatch = {
        rank: 'Common',
        confidence: 0,
        distance: Infinity,
    };
    for (const [rank, targetColor] of Object.entries(ranks)) {
        const distance = colorDistance(borderColor, targetColor);
        if (distance < bestMatch.distance) {
            // Convert distance to confidence (max distance ~441 for opposite colors)
            const confidence = Math.max(0, 100 - distance / 4.41);
            bestMatch = {
                rank: rank,
                confidence: Math.round(confidence),
                distance,
            };
        }
    }
    return bestMatch;
}
//# sourceMappingURL=rank-detector.js.map