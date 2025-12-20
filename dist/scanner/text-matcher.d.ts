/**
 * Text matching utilities for conditional bonus matching
 */
import type { ConditionalBonus } from '../types/index.js';
/**
 * Calculate Levenshtein distance between two strings
 */
export declare function levenshteinDistance(str1: string, str2: string): number;
/**
 * Jaro-Winkler similarity (handles OCR errors well)
 */
export declare function jaroWinklerSimilarity(s1: string, s2: string): number;
/**
 * Calculate combined text similarity
 */
export declare function calculateTextSimilarity(text1: string, text2: string): number;
/**
 * Extract bonus values from OCR text
 */
export declare function extractBonusValues(text: string): {
    flat: number | null;
    mult: number | null;
};
/**
 * Match extracted text against known conditionals
 */
export declare function matchConditionalText(extractedText: string): (ConditionalBonus & {
    matchScore: number;
}) | null;
/**
 * Find top N matches for extracted text
 */
export declare function findTopMatches(extractedText: string, limit?: number): Array<ConditionalBonus & {
    matchScore: number;
}>;
//# sourceMappingURL=text-matcher.d.ts.map