/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Calculates the reading time for a given content string using Intl.Segmenter.
 * @param content The text content to calculate reading time for.
 * @param locale Required locale string for Intl.Segmenter
 * @param options Options for reading time calculation.
 *   - wordsPerMinute: number of words per minute (default 200)
 * @returns Estimated reading time in minutes (float, rounded to 2 decimals)
 */
export declare function calculateReadingTime(content: string, locale: string, options?: {
    wordsPerMinute?: number;
}): number;
