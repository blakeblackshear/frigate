var url = require('url'),

    /**
     * @private
     * @const
     * @type {String}
     */
    E = '',

    /**
     * @private
     * @const
     * @type {String}
     */
    QUERY_SEPARATOR = '?',

    /**
     * @private
     * @const
     * @type {String}
     */
    AMPERSAND = '&',

    /**
     * @private
     * @const
     * @type {String}
     */
    EQUALS = '=',

    /**
     * @private
     * @const
     * @type {String}
     */
    PERCENT = '%',

    /**
     * @private
     * @const
     * @type {string}
     */
    ZERO = '0',

    /**
     * @private
     * @const
     * @type {string}
     */
    STRING = 'string',

    encoder;

encoder = {
    /**
     * Percent encode a character with given code.
     *
     * @param {Number} c - character code of the character to encode
     * @returns {String} - percent encoding of given character
     */
    percentEncode (c) {
        var hex = c.toString(16).toUpperCase();

        (hex.length === 1) && (hex = ZERO + hex);

        return PERCENT + hex;
    },

    /**
     * Checks if character at given index in the buffer is already percent encoded or not.
     *
     * @param {Buffer} buffer -
     * @param {Number} i -
     * @returns {Boolean}
     */
    isPreEncoded (buffer, i) {
        // If it is % check next two bytes for percent encode characters
        // looking for pattern %00 - %FF
        return (buffer[i] === 0x25 &&
            (encoder.isPreEncodedCharacter(buffer[i + 1]) &&
            encoder.isPreEncodedCharacter(buffer[i + 2]))
        );
    },

    /**
     * Checks if character with given code is valid hexadecimal digit or not.
     *
     * @param {Number} byte -
     * @returns {Boolean}
     */
    isPreEncodedCharacter (byte) {
        return (byte >= 0x30 && byte <= 0x39) || // 0-9
            (byte >= 0x41 && byte <= 0x46) || // A-F
            (byte >= 0x61 && byte <= 0x66); // a-f
    },

    /**
     * Checks whether given character should be percent encoded or not for fixture.
     *
     * @param {Number} byte -
     * @returns {Boolean}
     */
    charactersToPercentEncode (byte) {
        return (byte < 0x23 || byte > 0x7E || // Below # and after ~
            byte === 0x3C || byte === 0x3E || // > and <
            byte === 0x28 || byte === 0x29 || // ( and )
            byte === 0x25 || // %
            byte === 0x27 || // '
            byte === 0x2A // *
        );
    },

    /**
     * Percent encode a query string according to RFC 3986.
     * Note: This function is supposed to be used on top of node's inbuilt url encoding
     *       to solve issue https://github.com/nodejs/node/issues/8321
     *
     * @param {String} value -
     * @returns {String}
     */
    encode (value) {
        if (!value) { return E; }

        var buffer = Buffer.from(value),
            ret = E,
            i,
            ii;

        for (i = 0, ii = buffer.length; i < ii; ++i) {
            if (encoder.charactersToPercentEncode(buffer[i]) && !encoder.isPreEncoded(buffer, i)) {
                ret += encoder.percentEncode(buffer[i]);
            }
            else {
                ret += String.fromCodePoint(buffer[i]); // Only works in ES6 (available in Node v4+)
            }
        }

        return ret;
    }
};

/**
 * Parses a query string into an array, preserving parameter values
 *
 * @private
 * @param {String} string -
 * @returns {*}
 */
function parseQueryString (string) {
    var parts;

    if (typeof string === STRING) {
        parts = string.split(AMPERSAND);

        return parts.map(function (param, idx) {
            if (param === E && idx !== (parts.length - 1)) {
                return { key: null, value: null };
            }

            var index = (typeof param === STRING) ? param.indexOf(EQUALS) : -1,
                paramObj = {};

            // this means that there was no value for this key (not even blank,
            // so we store this info) and the value is set to null
            if (index < 0) {
                paramObj.key = param.substr(0, param.length);
                paramObj.value = null;
            }
            else {
                paramObj.key = param.substr(0, index);
                paramObj.value = param.substr(index + 1);
            }

            return paramObj;
        });
    }

    return [];
}

/**
 * Stringifies a query string, from an array of parameters
 *
 * @private
 * @param {Object[]} parameters -
 * @returns {string}
 */
function stringifyQueryParams (parameters) {
    return parameters ? parameters.map(function (param) {
        var key = param.key,
            value = param.value;

        if (value === undefined) {
            return E;
        }

        if (key === null) {
            key = E;
        }

        if (value === null) {
            return encoder.encode(key);
        }

        return encoder.encode(key) + EQUALS + encoder.encode(value);
    }).join(AMPERSAND) : E;
}

/**
 * Converts URL string into Node's Url object with encoded values
 *
 * @private
 * @param {String} urlString -
 * @returns {Url}
 */
function toNodeUrl (urlString) {
    var parsed = url.parse(urlString),
        rawQs = parsed.query,
        qs,
        search,
        path,
        str;

    if (!(rawQs && rawQs.length)) { return parsed; }

    qs = stringifyQueryParams(parseQueryString(rawQs));
    search = QUERY_SEPARATOR + qs;
    path = parsed.pathname + search;

    parsed.query = qs;
    parsed.search = search;
    parsed.path = path;

    str = url.format(parsed);

    // Parse again, because Node does not guarantee consistency of properties
    return url.parse(str);
}

module.exports = {
    toNodeUrl
};
