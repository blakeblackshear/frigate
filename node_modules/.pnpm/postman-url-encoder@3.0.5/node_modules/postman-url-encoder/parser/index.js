/**
 * This module helps to break URL strings up into components
 * (protocol, auth, host, port, path, query, and hash) keeping the variables
 * intact.
 *
 * @example
 * const parser = require('postman-url-encoder/parser')
 *
 * // returns
 * // {
 * //   raw: 'protocol://{{user}}:{{p@ssw?rd}}@{{host.name}}.com:{{#port}}/p/a/t/h?q=query#hash',
 * //   protocol: 'protocol',
 * //   auth: [ '{{user}}', '{{p@ssw?rd}}' ],
 * //   host: [ '{{host.name}}', 'com' ],
 * //   port: '{{#port}}',
 * //   path: [ 'p', 'a', 't', 'h' ],
 * //   query: [ 'q=query' ],
 * //   hash: 'hash'
 * // }
 * parser.parse('protocol://{{user}}:{{p@ssw?rd}}@{{host.name}}.com:{{#port}}/p/a/t/h?q=query#hash')
 *
 * @module postman-url-encoder/parser
 */

const ReplacementTracker = require('./replacement-tracker'),

    REGEX_ALL_BACKSLASHES = /\\/g,
    REGEX_LEADING_SLASHES = /^\/+/,
    REGEX_ALL_VARIABLES = /{{[^{}]*[.:/?#@&\]][^{}]*}}/g,

    HASH_SEPARATOR = '#',
    PATH_SEPARATOR = '/',
    PORT_SEPARATOR = ':',
    AUTH_SEPARATOR = '@',
    QUERY_SEPARATOR = '?',
    DOMAIN_SEPARATOR = '.',
    PROTOCOL_SEPARATOR = '://',
    AUTH_SEGMENTS_SEPARATOR = ':',
    QUERY_SEGMENTS_SEPARATOR = '&',

    E = '',
    STRING = 'string',
    FILE_PROTOCOL = 'file',
    SAFE_REPLACE_CHAR = '_',
    CLOSING_SQUARE_BRACKET = ']',
    URL_PROPERTIES_ORDER = ['protocol', 'auth', 'host', 'port', 'path', 'query', 'hash'];

/**
 * Normalize the given string by replacing the variables which includes
 * reserved characters in its name.
 * The replaced characters are added to the given replacement tracker instance.
 *
 * @private
 * @param {String} str String to normalize
 * @param {ReplacementTracker} replacements ReplacementTracker instance
 * @returns {String} Normalized string
 */
function normalizeVariables (str, replacements) {
    let normalizedString = E,
        pointer = 0, // pointer till witch the string is normalized
        variable,
        match,
        index;

    // find all the instances of {{<variable>}} which includes reserved chars
    // "Hello {{user#name}}!!!"
    //  ↑ (pointer = 0)
    while ((match = REGEX_ALL_VARIABLES.exec(str)) !== null) {
        // {{user#name}}
        variable = match[0];

        // starting index of the {{variable}} in the string
        // "Hello {{user#name}}!!!"
        //        ↑ (index = 6)
        index = match.index;

        // [pointer, index) string is normalized + the safe replacement character
        // "Hello " + "_"
        normalizedString += str.slice(pointer, index) + SAFE_REPLACE_CHAR;

        // track the replacement done for the {{variable}}
        replacements.add(variable, index);

        // update the pointer
        // "Hello {{user#name}}!!!"
        //                     ↑ (pointer = 19)
        pointer = index + variable.length;
    }

    // avoid slicing the string in case of no matches
    if (pointer === 0) {
        return str;
    }

    // whatever left in the string is normalized as well
    /* istanbul ignore else */
    if (pointer < str.length) {
        // "Hello _" + "!!!"
        normalizedString += str.slice(pointer);
    }

    return normalizedString;
}

/**
 * Update replaced characters in the URL object with its original value.
 *
 * @private
 * @param {Object} url URL tracker object
 * @param {ReplacementTracker} replacements ReplacementTracker instance
 */
function applyReplacements (url, replacements) {
    let i,
        ii,
        prop;

    // traverse each URL property in the given order
    for (i = 0, ii = URL_PROPERTIES_ORDER.length; i < ii; ++i) {
        prop = url[URL_PROPERTIES_ORDER[i]];

        // bail out if the given property is not set (undefined or '')
        if (!(prop && prop.value)) {
            continue;
        }

        prop.value = replacements.apply(prop.value, prop.beginIndex, prop.endIndex);
    }

    return url;
}

/**
 * Parses the input string by decomposing the URL into constituent parts,
 * such as path, host, port, etc.
 *
 * @param {String} urlString The URL string to parse
 * @returns {Object} Parsed URL object
 */
function parse (urlString) {
    let url = {
            protocol: { value: undefined, beginIndex: 0, endIndex: 0 },
            auth: { value: undefined, beginIndex: 0, endIndex: 0 },
            host: { value: undefined, beginIndex: 0, endIndex: 0 },
            port: { value: undefined, beginIndex: 0, endIndex: 0 },
            path: { value: undefined, beginIndex: 0, endIndex: 0 },
            query: { value: undefined, beginIndex: 0, endIndex: 0 },
            hash: { value: undefined, beginIndex: 0, endIndex: 0 }
        },
        parsedUrl = {
            raw: urlString,
            protocol: undefined,
            auth: undefined,
            host: undefined,
            port: undefined,
            path: undefined,
            query: undefined,
            hash: undefined
        },
        replacements = new ReplacementTracker(),
        pointer = 0,
        _length,
        length,
        index,
        port;

    // bail out if input string is empty
    if (!(urlString && typeof urlString === STRING)) {
        return parsedUrl;
    }

    // trim leading whitespace characters
    parsedUrl.raw = urlString = urlString.trimLeft();

    // normalize the given string
    urlString = normalizeVariables(urlString, replacements);
    length = urlString.length;

    // 1. url.hash
    if ((index = urlString.indexOf(HASH_SEPARATOR)) !== -1) {
        // extract from the back
        url.hash.value = urlString.slice(index + 1);
        url.hash.beginIndex = pointer + index + 1;
        url.hash.endIndex = pointer + length;

        urlString = urlString.slice(0, (length = index));
    }

    // 2. url.query
    if ((index = urlString.indexOf(QUERY_SEPARATOR)) !== -1) {
        // extract from the back
        url.query.value = urlString.slice(index + 1).split(QUERY_SEGMENTS_SEPARATOR);
        url.query.beginIndex = pointer + index + 1;
        url.query.endIndex = pointer + length;

        urlString = urlString.slice(0, (length = index));
    }

    // 3. url.protocol
    urlString = urlString.replace(REGEX_ALL_BACKSLASHES, PATH_SEPARATOR); // sanitize slashes

    // @todo support `protocol:host/path` and `protocol:/host/path`
    if ((index = urlString.indexOf(PROTOCOL_SEPARATOR)) !== -1) {
        // extract from the front
        url.protocol.value = urlString.slice(0, index);
        url.protocol.beginIndex = pointer;
        url.protocol.endIndex = pointer + index;

        urlString = urlString.slice(index + 3);
        length -= index + 3;
        pointer += index + 3;

        // special handling for extra slashes in protocol e.g, http:///example.com
        _length = length; // length with leading slashes

        urlString = urlString.replace(REGEX_LEADING_SLASHES,
            (url.protocol.value.toLowerCase() === FILE_PROTOCOL) ?
                // file:////path -> file:///path
                PATH_SEPARATOR :
                // protocol:////host/path -> protocol://host/path
                E);

        length = urlString.length; // length without slashes
        pointer += _length - length; // update pointer
    }

    // 4. url.path
    if ((index = urlString.indexOf(PATH_SEPARATOR)) !== -1) {
        // extract from the back
        url.path.value = urlString.slice(index + 1).split(PATH_SEPARATOR);
        url.path.beginIndex = pointer + index + 1;
        url.path.endIndex = pointer + length;

        urlString = urlString.slice(0, (length = index));
    }

    // 5. url.auth
    if ((index = urlString.lastIndexOf(AUTH_SEPARATOR)) !== -1) {
        // extract from the front
        url.auth.value = urlString.slice(0, index);
        url.auth.beginIndex = pointer;
        url.auth.endIndex = pointer + index;

        urlString = urlString.slice(index + 1);
        length -= index + 1;
        pointer += index + 1;

        // separate username:password
        if ((index = url.auth.value.indexOf(AUTH_SEGMENTS_SEPARATOR)) !== -1) {
            url.auth.value = [url.auth.value.slice(0, index), url.auth.value.slice(index + 1)];
        }
        else {
            url.auth.value = [url.auth.value];
        }
    }

    // 6. url.port
    if ((index = urlString.lastIndexOf(PORT_SEPARATOR)) !== -1 &&
        // eslint-disable-next-line lodash/prefer-includes
        (port = urlString.slice(index + 1)).indexOf(CLOSING_SQUARE_BRACKET) === -1
    ) {
        // extract from the back
        url.port.value = port;
        url.port.beginIndex = pointer + index + 1;
        url.port.endIndex = pointer + length;

        urlString = urlString.slice(0, (length = index));
    }

    // 7. url.host
    if (urlString) {
        url.host.value = urlString.split(DOMAIN_SEPARATOR);
        url.host.beginIndex = pointer;
        url.host.endIndex = pointer + length;
    }

    // apply replacements back, if any
    replacements.count() && applyReplacements(url, replacements);

    // finally, prepare parsed url
    parsedUrl.protocol = url.protocol.value;
    parsedUrl.auth = url.auth.value;
    parsedUrl.host = url.host.value;
    parsedUrl.port = url.port.value;
    parsedUrl.path = url.path.value;
    parsedUrl.query = url.query.value;
    parsedUrl.hash = url.hash.value;

    return parsedUrl;
}

module.exports = {
    parse
};
