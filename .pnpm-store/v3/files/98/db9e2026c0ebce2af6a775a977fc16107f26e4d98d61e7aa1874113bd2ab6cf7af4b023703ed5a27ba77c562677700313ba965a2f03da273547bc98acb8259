/**
 * Implementation of the WHATWG URL Standard.
 *
 * @example
 * const urlEncoder = require('postman-url-encoder')
 *
 * // Encoding URL string to Node.js compatible Url object
 * urlEncoder.toNodeUrl('郵便屋さん.com/foo&bar/{baz}?q=("foo")#`hash`')
 *
 * // Encoding URI component
 * urlEncoder.encode('qüêry štrìng')
 *
 * // Encoding query string object
 * urlEncoder.encodeQueryString({ q1: 'foo', q2: ['bãr', 'baž'] })
 *
 * @module postman-url-encoder
 * @see {@link https://url.spec.whatwg.org}
 */

const querystring = require('querystring'),

    legacy = require('./legacy'),
    parser = require('./parser'),
    encoder = require('./encoder'),
    QUERY_ENCODE_SET = require('./encoder/encode-set').QUERY_ENCODE_SET,

    E = '',
    COLON = ':',
    BACK_SLASH = '\\',
    DOUBLE_SLASH = '//',
    DOUBLE_BACK_SLASH = '\\\\',
    STRING = 'string',
    OBJECT = 'object',
    FUNCTION = 'function',
    DEFAULT_PROTOCOL = 'http',
    LEFT_SQUARE_BRACKET = '[',
    RIGHT_SQUARE_BRACKET = ']',

    PATH_SEPARATOR = '/',
    QUERY_SEPARATOR = '?',
    PARAMS_SEPARATOR = '&',
    SEARCH_SEPARATOR = '#',
    DOMAIN_SEPARATOR = '.',
    AUTH_CREDENTIALS_SEPARATOR = '@',

    // @note this regular expression is referred from Node.js URL parser
    PROTOCOL_RE = /^[a-z0-9.+-]+:(?:\/\/|\\\\)./i,

    /**
     * Protocols that always contain a // bit.
     *
     * @private
     * @see {@link https://github.com/nodejs/node/blob/v10.17.0/lib/url.js#L91}
     */
    SLASHED_PROTOCOLS = {
        'file:': true,
        'ftp:': true,
        'gopher:': true,
        'http:': true,
        'https:': true,
        'ws:': true,
        'wss:': true
    };

/**
 * Returns stringified URL from Url object but only includes parts till given
 * part name.
 *
 * @example
 * var url = 'http://postman.com/foo?q=v#hash';
 * getUrlTill(toNodeUrl(url), 'host')
 * // returns 'http://postman.com'
 *
 * @private
 * @param {Object} url base URL
 * @param {String} [urlPart='query'] one of ['host', 'pathname', 'query']
 */
function getUrlTill (url, urlPart) {
    let result = '';

    if (url.protocol) {
        result += url.protocol + DOUBLE_SLASH;
    }

    if (url.auth) {
        result += url.auth + AUTH_CREDENTIALS_SEPARATOR;
    }

    result += url.host || E;

    if (urlPart === 'host') { return result; }

    result += url.pathname;

    if (urlPart === 'pathname') { return result; }

    // urlPart must be query at this point
    return result + (url.search || E);
}

/**
 * Percent-encode the given string using QUERY_ENCODE_SET.
 *
 * @deprecated since version 2.0, use {@link encodeQueryParam} instead.
 *
 * @example
 * // returns 'foo%20%22%23%26%27%3C%3D%3E%20bar'
 * encode('foo "#&\'<=> bar')
 *
 * // returns ''
 * encode(['foobar'])
 *
 * @param {String} value String to percent-encode
 * @returns {String} Percent-encoded string
 */
function encode (value) {
    return encoder.percentEncode(value, QUERY_ENCODE_SET);
}

/**
 * Percent-encode the URL query string or x-www-form-urlencoded body object
 * according to RFC3986.
 *
 * @example
 * // returns 'q1=foo&q2=bar&q2=baz'
 * encodeQueryString({ q1: 'foo', q2: ['bar', 'baz'] })
 *
 * @param {Object} query Object representing query or urlencoded body
 * @returns {String} Percent-encoded string
 */
function encodeQueryString (query) {
    if (!(query && typeof query === OBJECT)) {
        return E;
    }

    // rely upon faster querystring module
    query = querystring.stringify(query);

    // encode characters not encoded by querystring.stringify() according to RFC3986.
    return query.replace(/[!'()*]/g, function (c) {
        return encoder.percentEncodeCharCode(c.charCodeAt(0));
    });
}

/**
 * Converts PostmanUrl / URL string into Node.js compatible Url object.
 *
 * @example <caption>Using URL string</caption>
 * toNodeUrl('郵便屋さん.com/foo&bar/{baz}?q=("foo")#`hash`')
 * // returns
 * // {
 * //     protocol: 'http:',
 * //     slashes: true,
 * //     auth: null,
 * //     host: 'xn--48jwgn17gdel797d.com',
 * //     port: null,
 * //     hostname: 'xn--48jwgn17gdel797d.com',
 * //     hash: '#%60hash%60',
 * //     search: '?q=(%22foo%22)',
 * //     query: 'q=(%22foo%22)',
 * //     pathname: '/foo&bar/%7Bbaz%7D',
 * //     path: '/foo&bar/%7Bbaz%7D?q=(%22foo%22)',
 * //     href: 'http://xn--48jwgn17gdel797d.com/foo&bar/%7Bbaz%7D?q=(%22foo%22)#%60hash%60'
 * //  }
 *
 * @example <caption>Using PostmanUrl instance</caption>
 * toNodeUrl(new sdk.Url({
 *     host: 'example.com',
 *     query: [{ key: 'foo', value: 'bar & baz' }]
 * }))
 *
 * @param {PostmanUrl|String} url URL string or PostmanUrl object
 * @param {Boolean} disableEncoding Turn encoding off
 * @returns {Url} Node.js like parsed and encoded object
 */
function toNodeUrl (url, disableEncoding) {
    let nodeUrl = {
            protocol: null,
            slashes: null,
            auth: null,
            host: null,
            port: null,
            hostname: null,
            hash: null,
            search: null,
            query: null,
            pathname: null,
            path: null,
            href: E
        },
        port,
        hostname,
        pathname,
        authUser,
        queryParams,
        authPassword;

    // Check if PostmanUrl instance and prepare segments
    if (url && url.constructor && url.constructor._postman_propertyName === 'Url') {
        // @note getPath() always adds a leading '/', similar to Node.js API
        pathname = url.getPath();
        hostname = url.getHost().toLowerCase();

        if (url.query && url.query.count()) {
            queryParams = url.getQueryString({ ignoreDisabled: true });
            queryParams = disableEncoding ? queryParams : encoder.encodeQueryParam(queryParams);

            // either all the params are disabled or a single param is like { key: '' } (http://localhost?)
            // in that case, query separator ? must be included in the raw URL.
            // @todo Add helper in SDK to handle this
            if (queryParams === E) {
                // check if there's any enabled param, if so, set queryString to empty string
                // otherwise (all disabled), it will be set as undefined
                queryParams = url.query.find(function (param) { return !(param && param.disabled); }) && E;
            }
        }

        if (url.auth) {
            authUser = url.auth.user;
            authPassword = url.auth.password;
        }
    }
    // Parser URL string and prepare segments
    else if (typeof url === STRING) {
        url = parser.parse(url);

        pathname = PATH_SEPARATOR + (url.path || []).join(PATH_SEPARATOR);
        hostname = (url.host || []).join(DOMAIN_SEPARATOR).toLowerCase();
        queryParams = url.query && (queryParams = url.query.join(PARAMS_SEPARATOR)) &&
            (disableEncoding ? queryParams : encoder.encodeQueryParam(queryParams));
        authUser = (url.auth || [])[0];
        authPassword = (url.auth || [])[1];
    }
    // bail out with empty URL object for invalid input
    else {
        return nodeUrl;
    }

    // @todo Add helper in SDK to normalize port
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (!(url.port == null) && typeof url.port.toString === FUNCTION) {
        port = url.port.toString();
    }

    // #protocol
    nodeUrl.protocol = (typeof url.protocol === STRING) ? url.protocol.toLowerCase() : DEFAULT_PROTOCOL;
    nodeUrl.protocol += COLON;

    // #slashes
    nodeUrl.slashes = SLASHED_PROTOCOLS[nodeUrl.protocol] || false;

    // #href = protocol://
    nodeUrl.href = nodeUrl.protocol + DOUBLE_SLASH;

    // #auth
    if (url.auth) {
        if (typeof authUser === STRING) {
            nodeUrl.auth = disableEncoding ? authUser : encoder.encodeUserInfo(authUser);
        }

        if (typeof authPassword === STRING) {
            !nodeUrl.auth && (nodeUrl.auth = E);
            nodeUrl.auth += COLON + (disableEncoding ? authPassword : encoder.encodeUserInfo(authPassword));
        }

        if (typeof nodeUrl.auth === STRING) {
            // #href = protocol://user:password@
            nodeUrl.href += nodeUrl.auth + AUTH_CREDENTIALS_SEPARATOR;
        }
    }

    // #host, #hostname
    nodeUrl.host = nodeUrl.hostname = hostname = encoder.encodeHost(hostname); // @note always encode hostname

    // #href = protocol://user:password@host.name
    nodeUrl.href += nodeUrl.hostname;

    // #port
    if (typeof port === STRING) {
        nodeUrl.port = port;

        // #host = (#hostname):(#port)
        nodeUrl.host = nodeUrl.hostname + COLON + port;

        // #href = protocol://user:password@host.name:port
        nodeUrl.href += COLON + port;
    }

    // #path, #pathname
    nodeUrl.path = nodeUrl.pathname = disableEncoding ? pathname : encoder.encodePath(pathname);

    // #href = protocol://user:password@host.name:port/p/a/t/h
    nodeUrl.href += nodeUrl.pathname;

    if (typeof queryParams === STRING) {
        // #query
        nodeUrl.query = queryParams;

        // #search
        nodeUrl.search = QUERY_SEPARATOR + nodeUrl.query;

        // #path = (#pathname)?(#search)
        nodeUrl.path = nodeUrl.pathname + nodeUrl.search;

        // #href = protocol://user:password@host.name:port/p/a/t/h?q=query
        nodeUrl.href += nodeUrl.search;
    }

    if (typeof url.hash === STRING) {
        // #hash
        nodeUrl.hash = SEARCH_SEPARATOR + (disableEncoding ? url.hash : encoder.encodeFragment(url.hash));

        // #href = protocol://user:password@host.name:port/p/a/t/h?q=query#hash
        nodeUrl.href += nodeUrl.hash;
    }

    // Finally apply Node.js shenanigans
    // # Remove square brackets from IPv6 #hostname
    // Refer: https://github.com/nodejs/node/blob/v12.18.3/lib/url.js#L399
    // Refer: https://github.com/nodejs/node/blob/v12.18.3/lib/internal/url.js#L1273
    if (hostname[0] === LEFT_SQUARE_BRACKET && hostname[hostname.length - 1] === RIGHT_SQUARE_BRACKET) {
        nodeUrl.hostname = hostname.slice(1, -1);
    }

    return nodeUrl;
}

/**
 * Resolves a relative URL with respect to given base URL.
 * This is a replacement method for Node's url.resolve() which is compatible
 * with URL object generated by toNodeUrl().
 *
 * @example
 * // returns 'http://postman.com/baz'
 * resolveNodeUrl('http://postman.com/foo/bar', '/baz')
 *
 * @param {Object|String} base URL string or toNodeUrl() object
 * @param {String} relative Relative URL to resolve
 * @returns {String} Resolved URL
 */
function resolveNodeUrl (base, relative) {
    // normalize arguments
    typeof base === STRING && (base = toNodeUrl(base));
    typeof relative !== STRING && (relative = E);

    // bail out if base is not an object
    if (!(base && typeof base === OBJECT)) {
        return relative;
    }

    let i,
        ii,
        index,
        baseHref,
        relative_0,
        relative_01,
        basePathname,
        requiredProps = ['protocol', 'auth', 'host', 'pathname', 'search', 'href'];

    // bail out if base is not like Node url object
    for (i = 0, ii = requiredProps.length; i < ii; i++) {
        if (!Object.hasOwnProperty.call(base, requiredProps[i])) {
            return relative;
        }
    }

    // cache base.href and base.pathname
    baseHref = base.href;
    basePathname = base.pathname;

    // cache relative's first two chars
    relative_0 = relative.slice(0, 1);
    relative_01 = relative.slice(0, 2);

    // @note relative can be one of
    // #1 empty string
    // #2 protocol relative, starts with // or \\
    // #3 path relative, starts with / or \
    // #4 just query or hash, starts with ? or #
    // #5 absolute URL, starts with :// or :\\
    // #6 free from path, with or without query and hash

    // #1 empty string
    if (!relative) {
        // return base as it is if there is no hash
        if ((index = baseHref.indexOf(SEARCH_SEPARATOR)) === -1) {
            return baseHref;
        }

        // else, return base without the hash
        return baseHref.slice(0, index);
    }

    // #2 protocol relative, starts with // or \\
    // @note \\ is not converted to //
    if (relative_01 === DOUBLE_SLASH || relative_01 === DOUBLE_BACK_SLASH) {
        return base.protocol + relative;
    }

    // #3 path relative, starts with / or \
    // @note \(s) are not converted to /
    if (relative_0 === PATH_SEPARATOR || relative_0 === BACK_SLASH) {
        return getUrlTill(base, 'host') + relative;
    }

    // #4 just hash, starts with #
    if (relative_0 === SEARCH_SEPARATOR) {
        return getUrlTill(base, 'query') + relative;
    }

    // #4 just query, starts with ?
    if (relative_0 === QUERY_SEPARATOR) {
        return getUrlTill(base, 'pathname') + relative;
    }

    // #5 absolute URL, starts with :// or :\\
    // @note :\\ is not converted to ://
    if (PROTOCOL_RE.test(relative)) {
        return relative;
    }

    // #6 free from path, with or without query and hash
    // remove last path segment form base path
    basePathname = basePathname.slice(0, basePathname.lastIndexOf(PATH_SEPARATOR) + 1);

    return getUrlTill(base, 'host') + basePathname + relative;
}

/**
 * Converts URL string into Node.js compatible Url object using the v1 encoder.
 *
 * @deprecated since version 2.0
 *
 * @param {String} url URL string
 * @returns {Url} Node.js compatible Url object
 */
function toLegacyNodeUrl (url) {
    return legacy.toNodeUrl(url);
}

module.exports = {
    encode,
    toNodeUrl,
    resolveNodeUrl,
    toLegacyNodeUrl,
    encodeQueryString
};
