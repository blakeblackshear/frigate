/**
 * This module helps to encode different URL components and expose utility
 * methods to percent-encode a given string using an {@link EncodeSet}.
 *
 * @example
 * const encoder = require('postman-url-encoder/encoder')
 *
 * // returns 'xn--48jwgn17gdel797d.com'
 * encoder.encodeHost('郵便屋さん.com')
 *
 * @example <caption>Using EncodeSet</caption>
 * var EncodeSet = require('postman-url-encoder/encoder').EncodeSet
 *
 * var fragmentEncodeSet = new EncodeSet([' ', '"', '<', '>', '`'])
 *
 * // returns false
 * fragmentEncodeSet.has('['.charCodeAt(0))
 *
 * // returns true
 * fragmentEncodeSet.has('<'.charCodeAt(0))
 *
 * @module postman-url-encoder/encoder
 * @see {@link https://url.spec.whatwg.org/#url-representation}
 */

/**
 * @fileoverview
 * This module determines which of the reserved characters in the different
 * URL components should be percent-encoded and which can be safely used.
 *
 * The generic URI syntax consists of a hierarchical sequence of components
 * referred to as the scheme, authority, path, query, and fragment.
 *
 *      URI         = scheme ":" hier-part [ "?" query ] [ "#" fragment ]
 *
 *      hier-part   = "//" authority path-abempty
 *                  / path-absolute
 *                  / path-rootless
 *                  / path-empty
 *
 *      authority   = [ userinfo "@" ] host [ ":" port ]
 *
 * @see {@link https://tools.ietf.org/html/rfc3986#section-2}
 * @see {@link https://tools.ietf.org/html/rfc3986#section-3}
 */

const encodeSet = require('./encode-set'),

    _percentEncode = require('./percent-encode').encode,
    _percentEncodeCharCode = require('./percent-encode').encodeCharCode,

    EncodeSet = encodeSet.EncodeSet,

    PATH_ENCODE_SET = encodeSet.PATH_ENCODE_SET,
    QUERY_ENCODE_SET = encodeSet.QUERY_ENCODE_SET,
    USERINFO_ENCODE_SET = encodeSet.USERINFO_ENCODE_SET,
    FRAGMENT_ENCODE_SET = encodeSet.FRAGMENT_ENCODE_SET,
    C0_CONTROL_ENCODE_SET = encodeSet.C0_CONTROL_ENCODE_SET,

    PARAM_VALUE_ENCODE_SET = EncodeSet.extend(QUERY_ENCODE_SET, ['&']).seal(),
    PARAM_KEY_ENCODE_SET = EncodeSet.extend(QUERY_ENCODE_SET, ['&', '=']).seal(),

    E = '',
    EQUALS = '=',
    AMPERSAND = '&',
    STRING = 'string',
    OBJECT = 'object',

    PATH_SEPARATOR = '/',
    DOMAIN_SEPARATOR = '.',

    /**
     * Returns the Punycode ASCII serialization of the domain.
     *
     * @private
     * @function
     * @param {String} domain domain name
     * @returns {String} punycode encoded domain name
     */
    domainToASCII = (function () {
        // @note `url.domainToASCII` returns empty string for invalid domain.
        const domainToASCII = require('url').domainToASCII;

        // use faster native `url` method in Node.js
        /* istanbul ignore next */
        if (typeof domainToASCII === 'function') {
            return domainToASCII;
        }

        // else, lazy load `punycode` dependency in browser
        /* istanbul ignore next */
        return require('punycode').toASCII;
    }());

/**
 * Returns the Punycode ASCII serialization of the domain.
 *
 * @note Returns input hostname on invalid domain.
 *
 * @example
 * // returns 'xn--fiq228c.com'
 * encodeHost('中文.com')
 *
 * // returns 'xn--48jwgn17gdel797d.com'
 * encodeHost(['郵便屋さん', 'com'])
 *
 * // returns '127.0.0.1'
 * encodeHost('127.1')
 *
 * // returns 'xn--iñvalid.com'
 * encodeHost('xn--iñvalid.com')
 *
 * @param {String|String[]} hostName host or domain name
 * @returns {String} Punycode-encoded hostname
 */
function encodeHost (hostName) {
    if (Array.isArray(hostName)) {
        hostName = hostName.join(DOMAIN_SEPARATOR);
    }

    if (typeof hostName !== STRING) {
        return E;
    }

    // return input host name if `domainToASCII` returned an empty string
    return domainToASCII(hostName) || hostName;
}

/**
 * Encodes URL path or individual path segments.
 *
 * @example
 * // returns 'foo/bar&baz'
 * encodePath('foo/bar&baz')
 *
 * // returns 'foo/bar/%20%22%3C%3E%60%23%3F%7B%7D'
 * encodePath(['foo', 'bar', ' "<>\`#?{}'])
 *
 * @param {String|String[]} path Path or path segments
 * @returns {String} Percent-encoded path
 */
function encodePath (path) {
    if (Array.isArray(path) && path.length) {
        path = path.join(PATH_SEPARATOR);
    }

    if (typeof path !== STRING) {
        return E;
    }

    return _percentEncode(path, PATH_ENCODE_SET);
}

/**
 * Encodes URL userinfo (username / password) fields.
 *
 * @example
 * // returns 'info~%20%22%3C%3E%60%23%3F%7B%7D%2F%3A%3B%3D%40%5B%5C%5D%5E%7C'
 * encodeAuth('info~ "<>`#?{}/:;=@[\\]^|')
 *
 * @param {String} param Parameter to encode
 * @returns {String} Percent-encoded parameter
 */
function encodeUserInfo (param) {
    if (typeof param !== STRING) {
        return E;
    }

    return _percentEncode(param, USERINFO_ENCODE_SET);
}

/**
 * Encodes URL fragment identifier or hash.
 *
 * @example
 * // returns 'fragment#%20%22%3C%3E%60'
 * encodeHash('fragment# "<>`')
 *
 * @param {String} fragment Hash or fragment identifier to encode
 * @returns {String} Percent-encoded fragment
 */
function encodeFragment (fragment) {
    if (typeof fragment !== STRING) {
        return E;
    }

    return _percentEncode(fragment, FRAGMENT_ENCODE_SET);
}

/**
 * Encodes single query parameter and returns as a string.
 *
 * @example
 * // returns 'param%20%22%23%27%3C%3E'
 * encodeQueryParam('param "#\'<>')
 *
 * // returns 'foo=bar'
 * encodeQueryParam({ key: 'foo', value: 'bar' })
 *
 * @param {Object|String} param Query param to encode
 * @returns {String} Percent-encoded query param
 */
function encodeQueryParam (param) {
    if (!param) {
        return E;
    }

    if (typeof param === STRING) {
        return _percentEncode(param, QUERY_ENCODE_SET);
    }

    let key = param.key,
        value = param.value,
        result;

    if (typeof key === STRING) {
        result = _percentEncode(key, PARAM_KEY_ENCODE_SET);
    }
    else {
        result = E;
    }

    if (typeof value === STRING) {
        result += EQUALS + _percentEncode(value, PARAM_VALUE_ENCODE_SET);
    }

    return result;
}

/**
 * Encodes list of query parameters and returns encoded query string.
 *
 * @example
 * // returns 'foo=bar&=foo%26bar'
 * encodeQueryParams([{ key: 'foo', value: 'bar' }, { value: 'foo&bar' }])
 *
 * // returns 'q1=foo&q2=bar&q2=baz'
 * encodeQueryParams({ q1: 'foo', q2: ['bar', 'baz'] })
 *
 * @param {Object|Object[]} params Query params to encode
 * @returns {String} Percent-encoded query string
 */
function encodeQueryParams (params) {
    let i,
        j,
        ii,
        jj,
        paramKey,
        paramKeys,
        paramValue,
        result = E,
        notFirstParam = false;

    if (!(params && typeof params === OBJECT)) {
        return E;
    }

    // handle array of query params
    if (Array.isArray(params)) {
        for (i = 0, ii = params.length; i < ii; i++) {
            // @todo Add helper in PropertyList to filter disabled QueryParam
            if (!params[i] || params[i].disabled === true) {
                continue;
            }

            // don't add '&' for the very first enabled param
            notFirstParam && (result += AMPERSAND);
            notFirstParam = true;

            result += encodeQueryParam(params[i]);
        }

        return result;
    }

    // handle object with query params
    paramKeys = Object.keys(params);

    for (i = 0, ii = paramKeys.length; i < ii; i++) {
        paramKey = paramKeys[i];
        paramValue = params[paramKey];

        // { key: ['value1', 'value2', 'value3'] }
        if (Array.isArray(paramValue)) {
            for (j = 0, jj = paramValue.length; j < jj; j++) {
                notFirstParam && (result += AMPERSAND);
                notFirstParam = true;

                result += encodeQueryParam({ key: paramKey, value: paramValue[j] });
            }
        }
        // { key: 'value' }
        else {
            notFirstParam && (result += AMPERSAND);
            notFirstParam = true;

            result += encodeQueryParam({ key: paramKey, value: paramValue });
        }
    }

    return result;
}

/**
 * Percent-encode the given string with the given {@link EncodeSet}.
 *
 * @example <caption>Defaults to C0_CONTROL_ENCODE_SET</caption>
 * // returns 'foo %00 bar'
 * percentEncode('foo \u0000 bar')
 *
 * @example <caption>Encode literal @ using custom EncodeSet</caption>
 * // returns 'foo%40bar'
 * percentEncode('foo@bar', new EncodeSet(['@']))
 *
 * @param {String} value String to percent-encode
 * @param {EncodeSet} [encodeSet=C0_CONTROL_ENCODE_SET] EncodeSet to use for encoding
 * @returns {String} Percent-encoded string
 */
function percentEncode (value, encodeSet) {
    if (!(value && typeof value === STRING)) {
        return E;
    }

    // defaults to C0_CONTROL_ENCODE_SET
    if (!EncodeSet.isEncodeSet(encodeSet)) {
        encodeSet = C0_CONTROL_ENCODE_SET;
    }

    return _percentEncode(value, encodeSet);
}

/**
 * Percent encode a character with given code.
 *
 * @example
 * // returns '%20'
 * percentEncodeCharCode(32)
 *
 * @param {Number} code Character code
 * @returns {String} Percent-encoded character
 */
function percentEncodeCharCode (code) {
    // ensure [0x00, 0xFF] range
    if (!(Number.isInteger(code) && code >= 0 && code <= 0xFF)) {
        return E;
    }

    return _percentEncodeCharCode(code);
}

module.exports = {
    // URL components
    encodeHost,
    encodePath,
    encodeUserInfo,
    encodeFragment,
    encodeQueryParam,
    encodeQueryParams,

    /** @type EncodeSet */
    EncodeSet,

    // Utilities
    percentEncode,
    percentEncodeCharCode
};
