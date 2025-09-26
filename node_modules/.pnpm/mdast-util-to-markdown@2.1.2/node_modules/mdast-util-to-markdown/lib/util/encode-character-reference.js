/**
 * Encode a code point as a character reference.
 *
 * @param {number} code
 *   Code point to encode.
 * @returns {string}
 *   Encoded character reference.
 */
export function encodeCharacterReference(code) {
  return '&#x' + code.toString(16).toUpperCase() + ';'
}
