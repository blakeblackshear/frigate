var _ = require('../util').lodash,
    Property = require('./property').Property,
    PropertyList = require('./property-list').PropertyList,
    Url = require('./url').Url,
    UrlMatchPattern = require('../url-pattern/url-match-pattern').UrlMatchPattern,
    UrlMatchPatternList = require('../url-pattern/url-match-pattern-list').UrlMatchPatternList,
    ProxyConfig,
    PROTOCOL_DELIMITER = UrlMatchPattern.PROTOCOL_DELIMITER,
    E = '',
    COLON = ':',
    DEFAULT_PORT = 8080,
    PROTOCOL_HOST_SEPARATOR = '://',
    MATCH_ALL_HOST_AND_PATH = '*:*/*',
    AUTH_CREDENTIALS_SEPARATOR = '@',
    DEFAULT_PROTOCOL = 'http',
    ALLOWED_PROTOCOLS = ['http', 'https'],
    // 'http+https://*:*/*'
    DEFAULT_PATTERN = ALLOWED_PROTOCOLS.join(PROTOCOL_DELIMITER) + PROTOCOL_HOST_SEPARATOR + MATCH_ALL_HOST_AND_PATH;

/**
* The following is the object structure accepted as constructor parameter while calling `new ProxyConfig(...)`. It is
* also the structure exported when {@link Property#toJSON} or {@link Property#toObjectResolved} is called on a
* Proxy instance.
 *
* @typedef ProxyConfig.definition
*
* @property {String=} [match = 'http+https://*\/*'] The match for which the proxy needs to be configured.
* @property {String=} [host = ''] The proxy server url.
* @property {Number=} [port = 8080] The proxy server port number.
* @property {Boolean=} [tunnel = false] The tunneling option for the proxy request.
* @property {Boolean=} [disabled = false] To override the proxy for the particular url, you need to provide true.
* @property {Boolean=} [authenticate = false] To enable authentication for the proxy, you need to provide true.
* @property {String=} [username] The proxy authentication username
* @property {String=} [password] The proxy authentication password
*
* @example <caption>JSON definition of an example proxy object</caption>
* {
*     "match": "http+https://example.com/*",
*     "host": "proxy.com",
*     "port": "8080",
*     "tunnel": true,
*     "disabled": false,
*     "authenticate": true,
*     "username": "proxy_username",
*     "password": "proxy_password"
* }
*/
_.inherit((

    /**
     * A ProxyConfig definition that represents the proxy configuration for an url match.
     * Properties can then use the `.toObjectResolved` function to procure an object representation of the property with
     * all the variable references replaced by corresponding values.
     *
     * @constructor
     * @extends {Property}
     * @param {ProxyConfig.definition=} [options] - Specifies object with props matches, server and tunnel.
     *
     * @example <caption>Create a new ProxyConfig</caption>
     * var ProxyConfig = require('postman-collection').ProxyConfig,
     *     myProxyConfig = new ProxyConfig({
     *          host: 'proxy.com',
     *          match: 'http+https://example.com/*',
     *          port: 8080,
     *          tunnel: true,
     *          disabled: false,
     *          authenticate: true,
     *          username: 'proxy_username',
     *          password: 'proxy_password'
     *     });
     */
    ProxyConfig = function ProxyConfig (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        ProxyConfig.super_.call(this, options);

        // Assign defaults before proceeding
        _.assign(this, /** @lends ProxyConfig */ {
            /**
             * The proxy server host or ip
             *
             * @type {String}
             */
            host: E,

            /**
             * The url mach for which the proxy has been associated with.
             *
             * @type {String}
             */
            match: new UrlMatchPattern(DEFAULT_PATTERN),

            /**
             * The proxy server port number
             *
             * @type {Number}
             */
            port: DEFAULT_PORT,

            /**
             * This represents whether the tunneling needs to done while proxying this request.
             *
             * @type Boolean
             */
            tunnel: false,

            /**
             * Proxy bypass list
             *
             * @type {UrlMatchPatternList}
             */
            bypass: undefined,

            /**
             * Enable proxy authentication
             *
             * @type {Boolean}
             */
            authenticate: false,

            /**
             * Proxy auth username
             *
             * @type {String}
             */
            username: undefined,

            /**
             * Proxy auth password
             *
             * @type {String}
             */
            password: undefined
        });

        this.update(options);
    }), Property);

_.assign(ProxyConfig.prototype, /** @lends ProxyConfig.prototype */ {
    /**
     * Defines whether this property instances requires an id
     *
     * @private
     * @readOnly
     * @type {Boolean}
     */
    _postman_propertyRequiresId: true,

    /**
     * Updates the properties of the proxy object based on the options provided.
     *
     * @param {ProxyConfig.definition} options The proxy object structure.
     */
    update: function (options) {
        if (!_.isObject(options)) {
            return;
        }

        var parsedUrl,
            port = _.get(options, 'port') >> 0;

        if (_.isString(options.host)) {
            // strip the protocol from given host
            parsedUrl = new Url(options.host);
            this.host = parsedUrl.getHost();
        }

        _.isString(options.match) && (this.match = new UrlMatchPattern(options.match));
        _.isString(_.get(options, 'match.pattern')) && (this.match = new UrlMatchPattern(options.match.pattern));
        port && (this.port = port);
        _.isBoolean(options.tunnel) && (this.tunnel = options.tunnel);
        // todo: Add update method in parent class Property and call that here
        _.isBoolean(options.disabled) && (this.disabled = options.disabled);
        _.isBoolean(options.authenticate) && (this.authenticate = options.authenticate);
        _.isString(options.username) && (this.username = options.username);
        _.isString(options.password) && (this.password = options.password);

        // init bypass list from the given array
        if (Array.isArray(options.bypass)) {
            this.bypass = new UrlMatchPatternList(null, options.bypass);
        }
        // or, convert existing PropertyList or UrlMatchPatternList
        else if (PropertyList.isPropertyList(options.bypass)) {
            this.bypass = new UrlMatchPatternList(null, options.bypass.all());
        }
    },

    /**
     * Updates the protocols in the match pattern
     *
     * @param {Array.<String>} protocols The array of protocols
     */
    updateProtocols: function (protocols) {
        if (!protocols) {
            return;
        }

        var updatedProtocols,
            hostAndPath = _.split(this.match.pattern, PROTOCOL_HOST_SEPARATOR)[1];

        if (!hostAndPath) {
            return;
        }

        updatedProtocols = _.intersection(ALLOWED_PROTOCOLS, _.castArray(protocols));
        _.isEmpty(updatedProtocols) && (updatedProtocols = ALLOWED_PROTOCOLS);

        this.match.update({
            pattern: updatedProtocols.join(PROTOCOL_DELIMITER) + PROTOCOL_HOST_SEPARATOR + hostAndPath
        });
    },

    /**
     * Tests the url string with the match provided.
     * Follows the https://developer.chrome.com/extensions/match_patterns pattern for pattern validation and matching
     *
     * @param {String=} [urlStr] The url string for which the proxy match needs to be done.
     */
    test: function (urlStr) {
        var protocol = Url.isUrl(urlStr) ? urlStr.protocol : (Url.parse(urlStr || E).protocol || E);

        // to allow target URLs without any protocol. e.g.: 'foo.com/bar'
        if (_.isEmpty(protocol)) {
            protocol = DEFAULT_PROTOCOL;
            urlStr = protocol + PROTOCOL_HOST_SEPARATOR + urlStr;
        }

        // this ensures we don't proceed any further for any non-supported protocol
        if (!_.includes(ALLOWED_PROTOCOLS, protocol)) {
            return false;
        }

        // don't proceed if the given URL should skip use of a proxy all together
        if (this.bypass && this.bypass.test(urlStr)) {
            return false;
        }

        return this.match.test(urlStr);
    },

    /**
     * Returns the proxy server url.
     *
     * @returns {String}
     */
    getProxyUrl: function () {
        var auth = E;

        // Add authentication method to URL if the same is requested. We do it this way because
        // this is how `postman-request` library accepts auth credentials in its proxy configuration.
        if (this.authenticate) {
            auth = encodeURIComponent(this.username || E);

            if (this.password) {
                auth += COLON + encodeURIComponent(this.password);
            }

            if (auth) {
                auth += AUTH_CREDENTIALS_SEPARATOR;
            }
        }

        return DEFAULT_PROTOCOL + PROTOCOL_HOST_SEPARATOR + auth + this.host + COLON + this.port;
    },

    /**
     * Returns the protocols supported.
     *
     * @returns {Array.<String>}
     */
    getProtocols: function () {
        return this.match.getProtocols();
    }
});

_.assign(ProxyConfig, /** @lends ProxyConfig */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'ProxyConfig',

    /**
     * Check whether an object is an instance of PostmanItem.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isProxyConfig: function (obj) {
        return Boolean(obj) && ((obj instanceof ProxyConfig) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', ProxyConfig._postman_propertyName));
    }
});

module.exports = {
    ProxyConfig,
    ALLOWED_PROTOCOLS,
    DEFAULT_PATTERN
};
