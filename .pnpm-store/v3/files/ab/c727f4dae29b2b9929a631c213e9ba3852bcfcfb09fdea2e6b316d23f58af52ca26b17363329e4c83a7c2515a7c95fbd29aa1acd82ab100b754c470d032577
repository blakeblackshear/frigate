var _ = require('../util').lodash,
    PropertyBase = require('./property-base').PropertyBase,
    PropertyList = require('./property-list').PropertyList,

    E = '',
    EQ = '=',
    PAIR_SPLIT_REGEX = /; */,
    COOKIES_SEPARATOR = '; ',

    /**
     * Enum for all the Cookie attributes.
     *
     * @private
     * @readonly
     * @enum {string} CookieAttributes
     */
    cookieAttributes = {
        httponly: 'httpOnly',
        secure: 'secure',
        domain: 'domain',
        path: 'path',
        'max-age': 'maxAge',
        session: 'session',
        expires: 'expires'
    },

    Cookie;

/**
 * The following is the object structure accepted as constructor parameter while calling `new Cookie(...)`. It is
 * also the structure exported when {@link Property#toJSON} or {@link Property#toObjectResolved} is called on a
 * Cookie instance.
 *
 * @typedef Cookie.definition
 *
 * @property {String=} [key] The name of the cookie. Some call it the "name".
 * @property {String=} [value] The value stored in the Cookie
 * @property {String=} [expires] Expires sets an expiry date for when a cookie gets deleted. It should either be a
 * date object or timestamp string of date.
 * @property {Number=} [maxAge] Max-age sets the time in seconds for when a cookie will be deleted.
 * @property {String=} [domain] Indicates the domain(s) for which the cookie should be sent.
 * @property {String=} [path] Limits the scope of the cookie to a specified path, e.g: "/accounts"
 * @property {Boolean=} [secure] A secure cookie will only be sent to the server when a request is made using SSL and
 * the HTTPS protocol.
 * The idea that the contents of the cookie are of high value and could be potentially damaging to transmit
 * as clear text.
 * @property {Boolean=} [httpOnly] The idea behind HTTP-only cookies is to instruct a browser that a cookie should never
 * be accessible via JavaScript through the document.cookie property. This feature was designed as a security measure
 * to help prevent cross-site scripting (XSS) attacks perpetrated by stealing cookies via JavaScript.
 * @property {Boolean=} [hostOnly] Indicates that this cookie is only valid for the given domain (and not its parent or
 * child domains.)
 * @property {Boolean=} [session] Indicates whether this is a Session Cookie. (A transient cookie, which is deleted at
 * the end of an HTTP session.)
 * @property {Array=} [extensions] Any extra attributes that are extensions to the original Cookie specification can be
 * specified here.
 * @property {String} [extensions[].key] Name of the extension.
 * @property {String} [extensions[].value] Value of the extension
 *
 * @example <caption>JSON definition of an example cookie</caption>
 * {
 *     "key": "my-cookie-name",
 *     "expires": "1464769543832",
 *      // UNIX timestamp, in *milliseconds*
 *     "maxAge": "300",
 *      // In seconds. In this case, the Cookie is valid for 5 minutes
 *     "domain": "something.example.com",
 *     "path": "/",
 *     "secure": false,
 *     "httpOnly": true,
 *     "session": false,
 *     "value": "my-cookie-value",
 *     "extensions": [{
 *         "key": "Priority",
 *         "value": "HIGH"
 *     }]
 * }
 */
_.inherit((

    /**
     * A Postman Cookie definition that comprehensively represents an HTTP Cookie.
     *
     * @constructor
     * @extends {PropertyBase}
     *
     * @param {Cookie.definition} [options] Pass the initial definition of the Cookie.
     * @example <caption>Create a new Cookie</caption>
     * var Cookie = require('postman-collection').Cookie,
     *     myCookie = new Cookie({
     *          name: 'my-cookie-name',
     *          expires: '1464769543832', // UNIX timestamp, in *milliseconds*
     *          maxAge: '300',  // In seconds. In this case, the Cookie is valid for 5 minutes
     *          domain: 'something.example.com',
     *          path: '/',
     *          secure: false,
     *          httpOnly: true,
     *          session: false,
     *          value: 'my-cookie-value',
     *          extensions: [{
     *              key: 'Priority',
     *              value: 'HIGH'
     *          }]
     *     });
     *
     * @example <caption>Parse a Cookie Header</caption>
     * var Cookie = require('postman-collection').Cookie,
     *     rawHeader = 'myCookie=myValue;Path=/;Expires=Sun, 04-Feb-2018 14:18:27 GMT;Secure;HttpOnly;Priority=HIGH'
     *     myCookie = new Cookie(rawHeader);
     *
     * console.log(myCookie.toJSON());
     */
    Cookie = function PostmanCookie (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Cookie.super_.call(this, options);

        _.isString(options) && (options = Cookie.parse(options));

        options && this.update(options);
    }), PropertyBase);

_.assign(Cookie.prototype, /** @lends Cookie.prototype */ {
    update (options) {
        _.mergeDefined(this, /** @lends Cookie.prototype */ {
            /**
             * The name of the cookie.
             *
             * @type {String}
             */
            name: _.choose(options.name, options.key),

            /**
             * Expires sets an expiry date for when a cookie gets deleted. It should either be a date object or
             * timestamp string of date.
             *
             * @type {Date|String}
             *
             * @note
             * The value for this option is a date in the format Wdy, DD-Mon-YYYY HH:MM:SS GMT such as
             * "Sat, 02 May 2009 23:38:25 GMT". Without the expires option, a cookie has a lifespan of a single session.
             * A session is defined as finished when the browser is shut down, so session cookies exist only while the
             * browser remains open. If the expires option is set to a date that appears in the past, then the cookie is
             * immediately deleted in browser.
             *
             * @todo Accept date object and convert stringified date (timestamp only) to date object
             * @todo Consider using Infinity as a default
             */
            expires: _.isString(options.expires) ? new Date(options.expires) : options.expires,

            /**
             * Max-age sets the time in seconds for when a cookie will be deleted.
             *
             * @type {Number}
             */
            maxAge: _.has(options, 'maxAge') ? Number(options.maxAge) : undefined,

            /**
             * Indicates the domain(s) for which the cookie should be sent.
             *
             * @type {String}
             *
             * @note
             * By default, domain is set to the host name of the page setting the cookie, so the cookie value is sent
             * whenever a request is made to the same host name. The value set for the domain option must be part of the
             * host name that is sending the Set-Cookie header. The SDK does not perform this check, but the underlying
             * client that actually sends the request could do it automatically.
             */
            domain: options.domain,

            /**
             * @type {String}
             *
             * @note
             * On server, the default value for the path option is the path of the URL that sent the Set-Cookie header.
             */
            path: options.path,

            /**
             * A secure cookie will only be sent to the server when a request is made using SSL and the HTTPS protocol.
             * The idea that the contents of the cookie are of high value and could be potentially damaging to transmit
             * as clear text.
             *
             * @type {Boolean}
             */
            secure: _.has(options, 'secure') ? Boolean(options.secure) : undefined,

            /**
             * The idea behind HTTP-only cookies is to instruct a browser that a cookie should never be accessible via
             * JavaScript through the document.cookie property. This feature was designed as a security measure to help
             * prevent cross-site scripting (XSS) attacks perpetrated by stealing cookies via JavaScript.
             *
             * @type {Boolean}
             */
            httpOnly: _.has(options, 'httpOnly') ? Boolean(options.httpOnly) : undefined,

            /**
             * @type {Boolean}
             */
            hostOnly: _.has(options, 'hostOnly') ? Boolean(options.hostOnly) : undefined,

            /**
             * Indicates whether this is a Session Cookie.
             *
             * @type {Boolean}
             */
            session: _.has(options, 'session') ? Boolean(options.session) : undefined,

            /**
             * @note The commonly held belief is that cookie values must be URL-encoded, but this is a fallacy even
             * though it is the de facto implementation. The original specification indicates that only three types of
             * characters must be encoded: semicolon, comma, and white space. The specification indicates that URL
             * encoding may be used but stops short of requiring it. The RFC makes no mention of encoding whatsoever.
             * Still, almost all implementations perform some sort of URL encoding on cookie values.
             * @type {String}
             */
            value: options.value ? _.ensureEncoded(options.value) : undefined,

            /**
             * Any extra parameters that are not strictly a part of the Cookie spec go here.
             *
             * @type {Array}
             */
            extensions: options.extensions || undefined
        });
    },

    /**
     * Get the value of this cookie.
     *
     * @returns {String}
     */
    valueOf () {
        try {
            return decodeURIComponent(this.value);
        }
        // handle malformed URI sequence
        // refer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Malformed_URI
        catch (error) {
            /* istanbul ignore next */
            return this.value;
        }
    },

    /**
     * Converts the Cookie to a single Set-Cookie header string.
     *
     * @returns {String}
     */
    toString () {
        var str = Cookie.unparseSingle(this);

        if (this.expires && this.expires instanceof Date) {
            // check for valid date
            if (!Number.isNaN(this.expires.getTime())) {
                str += '; Expires=' + this.expires.toUTCString();
            }
        }
        else if (this.expires) {
            str += '; Expires=' + this.expires;
        }

        if (this.maxAge && this.maxAge !== Infinity) {
            str += '; Max-Age=' + this.maxAge;
        }

        if (this.domain && !this.hostOnly) {
            str += '; Domain=' + this.domain;
        }

        if (this.path) {
            str += '; Path=' + this.path;
        }

        if (this.secure) {
            str += '; Secure';
        }

        if (this.httpOnly) {
            str += '; HttpOnly';
        }

        if (this.extensions) {
            this.extensions.forEach(({ key, value }) => {
                str += `; ${key}`;
                str += value === true ? '' : `=${value}`;
            });
        }

        return str;
    }
});

_.assign(Cookie, /** @lends Cookie */ {

    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Cookie',

    // define behaviour of this object when put in list
    _postman_propertyIndexKey: 'name',
    _postman_propertyIndexCaseInsensitive: true,
    _postman_propertyAllowsMultipleValues: true,

    /**
     * Check whether an object is an instance of PostmanCookie.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isCookie: function (obj) {
        return Boolean(obj) && ((obj instanceof Cookie) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Cookie._postman_propertyName));
    },

    /**
     * Stringifies an Array or {@link PropertyList} of Cookies into a single string.
     *
     * @param {Cookie[]} cookies - List of cookie definition object
     * @returns {String}
     */
    unparse: function (cookies) {
        if (!_.isArray(cookies) && !PropertyList.isPropertyList(cookies)) {
            return E;
        }

        return cookies.map(Cookie.unparseSingle).join(COOKIES_SEPARATOR);
    },

    /**
     * Unparses a single Cookie.
     *
     * @param {Cookie} cookie - Cookie definition object
     * @returns {String}
     */
    unparseSingle: function (cookie) {
        if (!_.isObject(cookie)) { return E; }

        var value = _.isNil(cookie.value) ? E : cookie.value;

        // for the empty name, return just the value to match the browser behavior
        if (!cookie.name) {
            return value;
        }

        return cookie.name + EQ + value;
    },

    /**
     * Cookie header parser
     *
     * @param {String} str -
     * @returns {*} A plain cookie options object, use it to create a new Cookie
     */
    parse: function (str) {
        if (!_.isString(str)) {
            return str;
        }

        var obj = {},
            pairs = str.split(PAIR_SPLIT_REGEX),
            nameval;

        nameval = Cookie.splitParam(pairs.shift()); // The first kvp is the name and value
        obj.key = nameval.key;
        obj.value = nameval.value;

        pairs.forEach(function (pair) {
            var keyval = Cookie.splitParam(pair),
                value = keyval.value,
                keyLower = keyval.key.toLowerCase();

            if (cookieAttributes[keyLower]) {
                obj[cookieAttributes[keyLower]] = value;
            }
            else {
                obj.extensions = obj.extensions || [];
                obj.extensions.push(keyval);
            }
        });
        // Handle the hostOnly flag
        if (!obj.domain) {
            obj.hostOnly = true;
        }

        return obj;
    },

    /**
     * Converts the Cookie to a single Set-Cookie header string.
     *
     * @param {Cookie} cookie - Cookie definition object
     * @returns {String}
     */
    stringify: function (cookie) {
        return Cookie.prototype.toString.call(cookie);
    },

    /**
     * Splits a Cookie parameter into a key and a value
     *
     * @private
     * @param {String} param -
     * @returns {{key: *, value: (Boolean|*)}}
     */
    splitParam: function (param) {
        var split = param.split('='),
            key, value;

        key = split[0].trim();
        value = _.isString(split[1]) ? split[1].trim() : true;

        if (_.isString(value) && value[0] === '"') {
            value = value.slice(1, -1);
        }

        return { key, value };
    }
});

module.exports = {
    Cookie
};
