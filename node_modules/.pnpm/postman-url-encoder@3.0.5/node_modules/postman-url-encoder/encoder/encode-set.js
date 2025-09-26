/**
 * @fileoverview
 * An EncodeSet represents a set of characters that should be percent-encoded.
 *
 * Different characters need to be encoded in different parts of an URL.
 * For example, a literal ? question mark in an URL’s path would indicate the
 * start of the query string. A question mark meant to be part of the path
 * therefore needs to be percent-encoded.
 * In the query string however, a question mark does not have any special
 * meaning and does not need to be percent-encoded.
 *
 * A few sets are defined in this module.
 * Use the {@link EncodeSet} class to define different ones.
 *
 * @see {@link https://url.spec.whatwg.org/#simple-encode-set}
 */

/**
 * A character (String), or character code (Number).
 *
 * @typedef {String|Number} Char
 */

/**
 * A Set or Array of {@link Char}(s).
 *
 * @typedef {Set.<Char>|Array.<Char>} CharSet
 */

const QUERY_ENCODE_CHARS = [' ', '"', '#', '\'', '<', '>'],
    FRAGMENT_EXTEND_CHARS = [' ', '"', '<', '>', '`'],
    PATH_EXTEND_CHARS = ['#', '?', '{', '}'],
    USERINFO_EXTEND_CHARS = ['/', ':', ';', '=', '@', '[', '\\', ']', '^', '|'];

/**
 * Returns a number representing the UTF-16 code unit value of the character.
 *
 * @private
 * @param {Char} char Character or character code
 * @returns {Number} Character code
 */
function charCode (char) {
    const code = (typeof char === 'string') ?
        // get char code from string
        char.charCodeAt(0) :
        // or, normalize char code using double Bitwise NOT
        // Refer: https://jsperf.com/truncating-decimals
        ~~char;

    // ensure UTF-16 range [0, 0xFFFF]
    return (code >= 0 && code <= 0xFFFF) ? code : 0;
}

/**
 * Extends the EncodeSet with the given characters.
 *
 * @note Mutates the input EncodeSet.
 *
 * @private
 * @param {EncodeSet} encodeSet Instance of EncodeSet
 * @param {CharSet} chars Character set to extend
 * @returns {EncodeSet} Given EncodeSet
 */
function extendEncodeSet (encodeSet, chars) {
    // special handling for Uint8Array chars which signify an existing encode
    // set used to extend the given encodeSet.
    if (chars instanceof Uint8Array) {
        // iterate over fixed / known size set
        encodeSet._set.forEach((encoded, index) => {
            if (!encoded && chars[index]) {
                // encode charCodeAt(index)
                encodeSet._set[index] = 1;
            }
        });

        return encodeSet;
    }

    // check if the input characters are iterable or not
    if (!(chars && typeof chars.forEach === 'function')) {
        return encodeSet;
    }

    chars.forEach((char) => {
        encodeSet.add(char);
    });

    return encodeSet;
}

/**
 * Represents a set of characters / bytes that should be percent-encoded.
 */
class EncodeSet {
    /**
     * @param {CharSet} chars Character set to encode
     */
    constructor (chars) {
        /**
         * Indexes in Uint8Array represents char codes for characters to encode.
         *
         * Size: 128, ASCII range [0, 0x7F]
         *
         * where,
         * 1 -> encode
         * 0 -> don't encode
         *
         * @private
         * @type {Uint8Array}
         */
        this._set = new Uint8Array(0x80);

        // encode C0 control codes [00, 0x1F] AND 0x7F
        this._set.fill(1, 0, 0x20); // 0 to 31
        this._set[0x7F] = 1; // 127

        /**
         * A Boolean indicating whether or not this EncodeSet is sealed.
         *
         * @private
         * @type {Boolean}
         */
        this._sealed = false;

        // extend this set with input characters
        extendEncodeSet(this, chars);
    }

    /**
     * Appends a new character to the EncodeSet.
     *
     * @example
     * var xyzEncodeSet = new EncodeSet(['x', 'y', 'z'])
     *
     * xyzEncodeSet
     *  .add('X')
     *  .add(89) // Y
     *  .add(0x5a) // Z
     *
     * @param {Char} char Character or character code
     * @returns {EncodeSet} Current EncodeSet
     */
    add (char) {
        // bail out if the EncodeSet is sealed
        if (this._sealed) {
            return this;
        }

        const code = charCode(char);

        // ensure ASCII range
        if (code < 0x80) {
            this._set[code] = 1;
        }

        // chaining
        return this;
    }

    /**
     * Returns a boolean asserting whether the given char code will be encoded in
     * the EncodeSet or not.
     *
     * @note Always encode C0 control codes in the range U+0000 to U+001F and U+007F
     * Refer: https://infra.spec.whatwg.org/#c0-control
     *
     * @example
     * var tildeEncodeSet = new EncodeSet(['~'])
     *
     * // returns true
     * tildeEncodeSet.has('~'.charCodeAt(0))
     *
     * // returns false
     * tildeEncodeSet.has(65) // A
     *
     * // returns true
     * tildeEncodeSet.has(31) // \u001f (control character)
     *
     * @param {Number} code Character code
     * @returns {Boolean} Returns true if the character with the specified char code
     * exists in the EncodeSet; otherwise false
     */
    has (code) {
        // encode if not in ASCII range (-∞, 0) OR (127, ∞)
        if (code < 0 || code > 0x7F) {
            return true;
        }

        // encode if present in the set
        return Boolean(this._set[code]);
    }

    /**
     * Creates a copy of the current EncodeSet.
     *
     * @example
     * var set1 = new EncodeSet(['<', '>'])
     * var set1Copy = set1.clone().add('=')
     *
     * @returns {EncodeSet} New EncodeSet instance
     */
    clone () {
        return new EncodeSet(this._set);
    }

    /**
     * Seals the current EncodeSet to prevent new characters being added to it.
     *
     * @example
     * var set = new EncodeSet()
     *
     * set.add(95)
     * set.has(95) // returns true
     *
     * set.seal()
     * set.add(100)
     * set.has(100) // returns false
     *
     * @returns {EncodeSet} Current EncodeSet
     */
    seal () {
        this._sealed = true;

        try {
            // @note Cannot freeze array buffer views with elements.
            // So, rely upon the alternative `Object.seal` method and avoid mutations
            // via EncodeSet~add method.
            // Also, sealed Uint8Array enumerates faster in V8!
            Object.seal(this._set);
        }
        catch (_) {
            // silently swallow exceptions
        }

        return this;
    }

    /**
     * Creates a new EncodeSet by extending the input EncodeSet with additional
     * characters.
     *
     * @example
     * var fooEncodeSet = new EncodeSet(['f', 'o'])
     * var foobarEncodeSet = EncodeSet.extend(fooEncodeSet, new Set(['b', 'a', 'r']))
     *
     * @param {EncodeSet} encodeSet Instance of EncodeSet
     * @param {CharSet} chars Character set to encode
     * @returns {EncodeSet} Copy of given `encodeSet` with extended `chars`
     * @throws {TypeError} Argument `encodeSet` must be of type {@link EncodeSet}
     */
    static extend (encodeSet, chars) {
        if (!EncodeSet.isEncodeSet(encodeSet)) {
            throw new TypeError('Argument `encodeSet` must be EncodeSet');
        }

        // extend the cloned encodeSet to avoid mutations
        return extendEncodeSet(encodeSet.clone(), chars);
    }

    /**
     * Determines whether the input value is an EncodeSet or not.
     *
     * @example
     * // returns true
     * EncodeSet.isEncodeSet(new EncodeSet([40, 41]))
     *
     * // returns false
     * EncodeSet.isEncodeSet(new Set([28, 05]))
     *
     * @param {*} value The value to be tested
     * @returns {Boolean} true if the given value is an EncodeSet; otherwise, false
     */
    static isEncodeSet (value) {
        return Boolean(value) && (value instanceof EncodeSet);
    }
}

const // eslint-disable-line one-var

    /**
     * The C0 control percent-encode set are the C0 controls and all code points
     * greater than U+007E (~).
     *
     * @const
     * @type {EncodeSet}
     * @see {@link https://url.spec.whatwg.org/#c0-control-percent-encode-set}
     */
    C0_CONTROL_ENCODE_SET = new EncodeSet().seal(),

    /**
     * The fragment percent-encode set is the C0 control percent-encode set and
     * U+0020 SPACE, U+0022 ("), U+003C (<), U+003E (>), and U+0060 (`).
     *
     * @const
     * @type {EncodeSet}
     * @see {@link https://url.spec.whatwg.org/#fragment-percent-encode-set}
     */
    FRAGMENT_ENCODE_SET = EncodeSet.extend(C0_CONTROL_ENCODE_SET, FRAGMENT_EXTEND_CHARS).seal(),

    /**
     * The path percent-encode set is the fragment percent-encode set and
     * U+0023 (#), U+003F (?), U+007B ({), and U+007D (}).
     *
     * @const
     * @type {EncodeSet}
     * @see {@link https://url.spec.whatwg.org/#path-percent-encode-set}
     */
    PATH_ENCODE_SET = EncodeSet.extend(FRAGMENT_ENCODE_SET, PATH_EXTEND_CHARS).seal(),

    /**
     * The userinfo percent-encode set is the path percent-encode set and
     * U+002F (/), U+003A (:), U+003B (;), U+003D (=), U+0040 (@), U+005B ([),
     * U+005C (\), U+005D (]), U+005E (^), and U+007C (|).
     *
     * @const
     * @type {EncodeSet}
     * @see {@link https://url.spec.whatwg.org/#userinfo-percent-encode-set}
     */
    USERINFO_ENCODE_SET = EncodeSet.extend(PATH_ENCODE_SET, USERINFO_EXTEND_CHARS).seal(),

    /**
     * The query percent-encode set is the C0 control percent-encode set and
     * U+0020 SPACE, U+0022 ("), U+0023 (#), U+0027 ('), U+003C (<), and U+003E (>).
     *
     * @const
     * @type {EncodeSet}
     * @see {@link https://url.spec.whatwg.org/#query-state}
     */
    QUERY_ENCODE_SET = new EncodeSet(QUERY_ENCODE_CHARS).seal();

module.exports = {
    // EncodeSet class
    EncodeSet,

    // Constants
    PATH_ENCODE_SET,
    QUERY_ENCODE_SET,
    FRAGMENT_ENCODE_SET,
    USERINFO_ENCODE_SET,
    C0_CONTROL_ENCODE_SET
};
