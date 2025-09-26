/**
 * Checks if the given code point can start an identifier.
 *
 * @param {number | undefined} code
 *   Code point to check.
 * @returns {boolean}
 *   Whether `code` can start an identifier.
 */
export function start(code: number | undefined): boolean;
/**
 * Checks if the given code point can continue an identifier.
 *
 * @param {number | undefined} code
 *   Code point to check.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {boolean}
 *   Whether `code` can continue an identifier.
 */
export function cont(code: number | undefined, options?: Options | null | undefined): boolean;
/**
 * Checks if the given value is a valid identifier name.
 *
 * @param {string} name
 *   Identifier to check.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {boolean}
 *   Whether `name` can be an identifier.
 */
export function name(name: string, options?: Options | null | undefined): boolean;
/**
 * Configuration.
 */
export type Options = {
    /**
     * Support JSX identifiers (default: `false`).
     */
    jsx?: boolean | null | undefined;
};
