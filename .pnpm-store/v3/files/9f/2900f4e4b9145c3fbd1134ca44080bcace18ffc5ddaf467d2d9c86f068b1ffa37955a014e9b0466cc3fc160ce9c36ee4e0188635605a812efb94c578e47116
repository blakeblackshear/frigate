/**
 * This modules provides simple percent (URI) encoding.
 *
 * @note Safety check for input types is not done intentionally as these
 * functions are invoked in the hot code path.
 *
 * @private
 * @module postman-url-encoder/encoder/percent-encode
 */

/**
 * @fileoverview
 * A percent-encoding mechanism is used to represent a data octet in a component
 * when that octet's corresponding character is outside the allowed set or is
 * being used as a delimiter of, or within, the component.
 * A percent-encoded octet is encoded as a character triplet, consisting of the
 * percent character "%" followed by the two hexadecimal digits representing
 * that octet's numeric value.
 *
 * For example, "%20" is the percent-encoding for the binary octet "00100000"
 * (ABNF: %x20), which in US-ASCII corresponds to the space character (SP).
 *
 * @see {@link https://en.wikipedia.org/wiki/Percent-encoding}
 * @see {@link https://tools.ietf.org/html/rfc3986#section-2.1}
 */

const E = '',
    ZERO = '0',
    PERCENT = '%';

/**
 * Checks if character with given code is valid hexadecimal digit or not.
 *
 * @private
 * @param {Number} byte Byte
 * @returns {Boolean}
 */
function isPreEncodedCharacter (byte) {
    return (byte >= 0x30 && byte <= 0x39) || // 0-9
        (byte >= 0x41 && byte <= 0x46) || // A-F
        (byte >= 0x61 && byte <= 0x66); // a-f
}

/**
 * Checks if character at given index in the buffer is already percent encoded or not.
 *
 * @private
 * @param {Buffer} buffer Buffer to check the character from
 * @param {Number} i Index of the character to check
 * @returns {Boolean} true if the character is encoded, false otherwise
 */
function isPreEncoded (buffer, i) {
    // if it is % check next two bytes for percent encode characters
    // looking for pattern %00 - %FF
    return buffer[i] === 0x25 && // %
        isPreEncodedCharacter(buffer[i + 1]) &&
        isPreEncodedCharacter(buffer[i + 2]);
}

/**
 * Percent encode a character with given code.
 *
 * @example
 * // returns '%20'
 * encodeCharCode(32)
 *
 * @param {Number} code Character code
 * @returns {String} Percent-encoded character
 */
function encodeCharCode (code) {
    let hex = code.toString(16).toUpperCase();

    (hex.length === 1) && (hex = ZERO + hex);

    return PERCENT + hex;
}

/**
 * Percent-encode the given string with the given {@link EncodeSet}.
 *
 * @example
 * // returns 'foo%40bar'
 * encode('foo@bar', new EncodeSet(['@']))
 *
 * @param {String} value String to percent-encode
 * @param {EncodeSet} encodeSet EncodeSet to use for encoding
 * @returns {String} Percent-encoded string
 */
function encode (value, encodeSet) {
    let i,
        ii,
        charCode,
        encoded = E,
        buffer = Buffer.from(value);

    for (i = 0, ii = buffer.length; i < ii; ++i) {
        // avoid double encoding
        if (i < ii - 2 && isPreEncoded(buffer, i)) {
            encoded += PERCENT + String.fromCharCode(buffer[++i], buffer[++i]);
            continue;
        }

        charCode = buffer[i];

        encoded += encodeSet.has(charCode) ?
            // encode if char code present in encodeSet
            encodeCharCode(charCode) :
            // or, append string from char code
            String.fromCharCode(charCode);
    }

    return encoded;
}

module.exports = {
    encode,
    encodeCharCode
};
