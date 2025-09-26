import type { MermaidConfig } from '../../config.type.js';
export declare const lineBreakRegex: RegExp;
/**
 * Gets the rows of lines in a string
 *
 * @param s - The string to check the lines for
 * @returns The rows in that string
 */
export declare const getRows: (s?: string) => string[];
/**
 * Removes script tags from a text
 *
 * @param txt - The text to sanitize
 * @returns The safer text
 */
export declare const removeScript: (txt: string) => string;
export declare const sanitizeText: (text: string, config: MermaidConfig) => string;
export declare const sanitizeTextOrArray: (a: string | string[] | string[][], config: MermaidConfig) => string | string[];
/**
 * Whether or not a text has any line breaks
 *
 * @param text - The text to test
 * @returns Whether or not the text has breaks
 */
export declare const hasBreaks: (text: string) => boolean;
/**
 * Splits on <br> tags
 *
 * @param text - Text to split
 * @returns List of lines as strings
 */
export declare const splitBreaks: (text: string) => string[];
/**
 * Gets the current URL
 *
 * @param useAbsolute - Whether to return the absolute URL or not
 * @returns The current URL
 */
export declare const getUrl: (useAbsolute: boolean) => string;
/**
 * Converts a string/boolean into a boolean
 *
 * @param val - String or boolean to convert
 * @returns The result from the input
 */
export declare const evaluate: (val?: string | boolean) => boolean;
/**
 * Wrapper around Math.max which removes non-numeric values
 * Returns the larger of a set of supplied numeric expressions.
 * @param values - Numeric expressions to be evaluated
 * @returns The smaller value
 */
export declare const getMax: (...values: number[]) => number;
/**
 * Wrapper around Math.min which removes non-numeric values
 * Returns the smaller of a set of supplied numeric expressions.
 * @param values - Numeric expressions to be evaluated
 * @returns The smaller value
 */
export declare const getMin: (...values: number[]) => number;
/**
 * Makes generics in typescript syntax
 *
 * @example
 * Array of array of strings in typescript syntax
 *
 * ```js
 * // returns "Array<Array<string>>"
 * parseGenericTypes('Array~Array~string~~');
 * ```
 * @param text - The text to convert
 * @returns The converted string
 */
export declare const parseGenericTypes: (input: string) => string;
export declare const countOccurrence: (string: string, substring: string) => number;
export declare const isMathMLSupported: () => boolean;
export declare const katexRegex: RegExp;
/**
 * Whether or not a text has KaTeX delimiters
 *
 * @param text - The text to test
 * @returns Whether or not the text has KaTeX delimiters
 */
export declare const hasKatex: (text: string) => boolean;
/**
 * Computes the minimum dimensions needed to display a div containing MathML
 *
 * @param text - The text to test
 * @param config - Configuration for Mermaid
 * @returns Object containing \{width, height\}
 */
export declare const calculateMathMLDimensions: (text: string, config: MermaidConfig) => Promise<{
    width: number;
    height: number;
}>;
/**
 * Attempts to render and return the KaTeX portion of a string with MathML
 *
 * @param text - The text to test
 * @param config - Configuration for Mermaid
 * @returns String containing MathML if KaTeX is supported, or an error message if it is not and stylesheets aren't present
 */
export declare const renderKatexSanitized: (text: string, config: MermaidConfig) => Promise<string>;
declare const _default: {
    getRows: (s?: string) => string[];
    sanitizeText: (text: string, config: MermaidConfig) => string;
    sanitizeTextOrArray: (a: string | string[] | string[][], config: MermaidConfig) => string | string[];
    hasBreaks: (text: string) => boolean;
    splitBreaks: (text: string) => string[];
    lineBreakRegex: RegExp;
    removeScript: (txt: string) => string;
    getUrl: (useAbsolute: boolean) => string;
    evaluate: (val?: string | boolean) => boolean;
    getMax: (...values: number[]) => number;
    getMin: (...values: number[]) => number;
};
export default _default;
