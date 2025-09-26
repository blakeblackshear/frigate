import type { CheckFitFunction, MarkdownLine, MarkdownWord } from './types.js';
/**
 * Splits a string into graphemes if available, otherwise characters.
 */
export declare function splitTextToChars(text: string): string[];
/**
 * Splits a string into words by using `Intl.Segmenter` if available, or splitting by ' '.
 * `Intl.Segmenter` uses the default locale, which might be different across browsers.
 */
export declare function splitLineToWords(text: string): string[];
/**
 * Splits a word into two parts, the first part fits the width and the remaining part.
 * @param checkFit - Function to check if word fits
 * @param word - Word to split
 * @returns [first part of word that fits, rest of word]
 */
export declare function splitWordToFitWidth(checkFit: CheckFitFunction, word: MarkdownWord): [MarkdownWord, MarkdownWord];
/**
 * Splits a line into multiple lines that satisfy the checkFit function.
 * @param line - Line to split
 * @param checkFit - Function to check if line fits
 * @returns Array of lines that fit
 */
export declare function splitLineToFitWidth(line: MarkdownLine, checkFit: CheckFitFunction): MarkdownLine[];
