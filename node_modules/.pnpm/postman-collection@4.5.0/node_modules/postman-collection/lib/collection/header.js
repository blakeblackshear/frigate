var util = require('../util'),
    _ = util.lodash,

    E = '',
    SPC = ' ',
    CRLF = '\r\n',
    HEADER_KV_SEPARATOR = ':',

    Property = require('./property').Property,
    PropertyList = require('./property-list').PropertyList,
    Header;

/**
 * @typedef Header.definition
 * @property {String} key The Header name (e.g: 'Content-Type')
 * @property {String} value The value of the header.
 *
 * @example <caption>Create a header</caption>
 * var Header = require('postman-collection').Header,
 *     header = new Header({
 *         key: 'Content-Type',
 *         value: 'application/xml'
 *     });
 *
 * console.log(header.toString()) // prints the string representation of the Header.
 */
_.inherit((

    /**
     * Represents an HTTP header, for requests or for responses.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {Header.definition|String} options - Pass the header definition as an object or the value of the header.
     * If the value is passed as a string, it should either be in `name:value` format or the second "name" parameter
     * should be used to pass the name as string
     * @param {String} [name] - optional override the header name or use when the first parameter is the header value as
     * string.
     *
     * @example <caption>Parse a string of headers into an array of Header objects</caption>
     * var Header = require('postman-collection').Header,
     *     headerString = 'Content-Type: application/json\nUser-Agent: MyClientLibrary/2.0\n';
     *
     * var rawHeaders = Header.parse(headerString);
     * console.log(rawHeaders); // [{ 'Content-Type': 'application/json', 'User-Agent': 'MyClientLibrary/2.0' }]
     *
     * var headers = rawHeaders.map(function (h) {
     *     return new Header(h);
     * });
     *
     * function assert(condition, message) {
     *       if (!condition) {
     *           message = message || "Assertion failed";
     *           if (typeof Error !== "undefined") {
     *               throw new Error(message);
     *           }
     *           throw message; //fallback
     *       }
     *       else {
     *           console.log("Assertion passed");
     *       }
     *   }
     *
     * assert(headerString.trim() === Header.unparse(headers).trim());
     */
    Header = function PostmanHeader (options, name) {
        if (_.isString(options)) {
            options = _.isString(name) ? { key: name, value: options } : Header.parseSingle(options);
        }

        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Header.super_.apply(this, arguments);

        this.update(options);
    }), Property);

_.assign(Header.prototype, /** @lends Header.prototype */ {
    /**
     * Converts the header to a single header string.
     *
     * @returns {String}
     */
    toString () {
        return this.key + ': ' + this.value;
    },

    /**
     * Return the value of this header.
     *
     * @returns {String}
     */
    valueOf () {
        return this.value;
    },

    /**
     * Assigns the given properties to the Header
     *
     * @param {Object} options -
     * @todo check for allowed characters in header key-value or store encoded.
     */
    update (options) {
        /**
         * The header Key
         *
         * @type {String}
         * @todo avoid headers with falsy key.
         */
        this.key = _.get(options, 'key') || E;

        /**
         * The header value
         *
         * @type {String}
         */
        this.value = _.get(options, 'value', E);

        /**
         * Indicates whether the header was added by internal SDK operations, such as authorizing a request.
         *
         * @type {*|boolean}
         */
        _.has(options, 'system') && (this.system = options.system);

        /**
         * Indicates whether the header should be .
         *
         * @type {*|boolean}
         * @todo figure out whether this should be in property.js
         */
        _.has(options, 'disabled') && (this.disabled = options.disabled);
    }
});

_.assign(Header, /** @lends Header */ {

    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Header',

    /**
     * Specify the key to be used while indexing this object
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyIndexKey: 'key',

    /**
     * Specifies whether the index lookup of this property, when in a list is case insensitive or not
     *
     * @private
     * @readOnly
     * @type {boolean}
     */
    _postman_propertyIndexCaseInsensitive: true,

    /**
     * Since each header may have multiple possible values, this is set to true.
     *
     * @private
     * @readOnly
     * @type {Boolean}
     */
    _postman_propertyAllowsMultipleValues: true,

    /**
     * Parses a multi line header string into an array of {@link Header.definition}.
     *
     * @param {String} headerString -
     * @returns {Array}
     */
    parse: function (headerString) {
        var headers = [],
            regexes = {
                header: /^(\S+):(.*)$/gm,
                fold: /\r\n([ \t])/g,
                trim: /^\s*(.*\S)?\s*$/ // eslint-disable-line security/detect-unsafe-regex
            },
            match = regexes.header.exec(headerString);

        headerString = headerString.toString().replace(regexes.fold, '$1');

        while (match) {
            headers.push({
                key: match[1],
                value: match[2].replace(regexes.trim, '$1')
            });
            match = regexes.header.exec(headerString);
        }

        return headers;
    },

    /**
     * Parses a single Header.
     *
     * @param {String} header -
     * @returns {{key: String, value: String}}
     */
    parseSingle: function (header) {
        if (!_.isString(header)) { return { key: E, value: E }; }

        var index = header.indexOf(HEADER_KV_SEPARATOR),
            key,
            value;

        (index < 0) && (index = header.length);

        key = header.substr(0, index);
        value = header.substr(index + 1);

        return {
            key: _.trim(key),
            value: _.trim(value)
        };
    },

    /**
     * Stringifies an Array or {@link PropertyList} of Headers into a single string.
     *
     * @note Disabled headers are excluded.
     *
     * @param {Array|PropertyList<Header>} headers -
     * @param {String=} [separator='\r\n'] - Specify a string for separating each header
     * @returns {String}
     */
    unparse: function (headers, separator = CRLF) {
        if (!_.isArray(headers) && !PropertyList.isPropertyList(headers)) {
            return E;
        }

        return headers.reduce(function (acc, header) {
            if (header && !header.disabled) {
                acc += Header.unparseSingle(header) + separator;
            }

            return acc;
        }, E);
    },

    /**
     * Unparses a single Header.
     *
     * @param {String} header -
     * @returns {String}
     */
    unparseSingle: function (header) {
        if (!_.isObject(header)) { return E; }

        return header.key + HEADER_KV_SEPARATOR + SPC + header.value;
    },

    /**
     * Check whether an object is an instance of PostmanHeader.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isHeader: function (obj) {
        return Boolean(obj) && ((obj instanceof Header) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Header._postman_propertyName));
    },

    /* eslint-disable jsdoc/check-param-names */
    /**
     * Create a new header instance
     *
     * @param {Header.definition|String} [value] - Pass the header definition as an object or the value of the header.
     * If the value is passed as a string, it should either be in `name:value` format or the second "name" parameter
     * should be used to pass the name as string
     * @param {String} [name] - optional override the header name or use when the first parameter is the header value as
     * string.
     * @returns {Header}
     */
    create: function () {
        var args = Array.prototype.slice.call(arguments);

        args.unshift(Header);

        return new (Header.bind.apply(Header, args))(); // eslint-disable-line prefer-spread
    }
    /* eslint-enable jsdoc/check-param-names */
});

module.exports = {
    Header
};
