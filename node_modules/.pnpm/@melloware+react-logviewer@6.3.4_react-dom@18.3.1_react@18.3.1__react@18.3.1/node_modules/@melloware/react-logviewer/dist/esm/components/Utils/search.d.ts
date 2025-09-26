/**
 * Implements the Knuth-Morris-Pratt (KMP) string searching algorithm.
 * This function searches for occurrences of a keyword within a given log.
 *
 * @param {string | undefined} rawKeywords - The search term to look for.
 * @param {Uint8Array} rawLog - The log data to search within.
 * @returns {number[]} An array of indices where the keyword is found in the log.
 */
export declare const searchIndexes: (rawKeywords: string | undefined, rawLog: Uint8Array) => number[];
/**
 * Searches for keywords within log lines, handling case sensitivity.
 *
 * @param {string | undefined} rawKeywords - The search term to look for.
 * @param {Uint8Array} rawLog - The log data to search within.
 * @param {boolean} isCaseInsensitive - Whether the search should be case-insensitive.
 * @returns {number[]} An array of line numbers where the keyword is found.
 */
export declare const searchLines: (rawKeywords: string | undefined, rawLog: Uint8Array, isCaseInsensitive: boolean) => number[];
