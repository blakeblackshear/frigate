/**
 * @typedef Options
 *   Configuration.
 * @property {boolean | null | undefined} [jsx=false]
 *   Support JSX identifiers (default: `false`).
 */

const startRe = /[$_\p{ID_Start}]/u
const contRe = /[$_\u{200C}\u{200D}\p{ID_Continue}]/u
const contReJsx = /[-$_\u{200C}\u{200D}\p{ID_Continue}]/u
const nameRe = /^[$_\p{ID_Start}][$_\u{200C}\u{200D}\p{ID_Continue}]*$/u
const nameReJsx = /^[$_\p{ID_Start}][-$_\u{200C}\u{200D}\p{ID_Continue}]*$/u

/** @type {Options} */
const emptyOptions = {}

/**
 * Checks if the given code point can start an identifier.
 *
 * @param {number | undefined} code
 *   Code point to check.
 * @returns {boolean}
 *   Whether `code` can start an identifier.
 */
// Note: `undefined` is supported so you can pass the result from `''.codePointAt`.
export function start(code) {
  return code ? startRe.test(String.fromCodePoint(code)) : false
}

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
// Note: `undefined` is supported so you can pass the result from `''.codePointAt`.
export function cont(code, options) {
  const settings = options || emptyOptions
  const re = settings.jsx ? contReJsx : contRe
  return code ? re.test(String.fromCodePoint(code)) : false
}

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
export function name(name, options) {
  const settings = options || emptyOptions
  const re = settings.jsx ? nameReJsx : nameRe
  return re.test(name)
}
