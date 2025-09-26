var _ = require('../util').lodash,
    Property = require('./property').Property,
    PropertyBase = require('./property-base').PropertyBase,
    Url = require('./url').Url,
    UrlMatchPatternList = require('../url-pattern/url-match-pattern-list').UrlMatchPatternList,

    STRING = 'string',
    HTTPS = 'https',

    Certificate;

/**
 * The following is the object representation accepted as param for the Certificate constructor.
 * Also the type of the object returned when {@link Property#toJSON} or {@link Property#toObjectResolved} is called on a
 * Certificate instance.
 *
 * @typedef Certificate.definition
 * @property {String} [name] A name for the certificate
 * @property {Array} [matches] A list of match patterns
 * @property {{ src: (String) }} [key] Object with path on the file system for private key file, as src
 * @property {{ src: (String) }} [cert] Object with path on the file system for certificate file, as src
 * @property {String} [passphrase] The passphrase for the certificate key
 *
 * @example <caption>JSON definition of an example certificate object</caption>
 * {
 *     "name": "My certificate for example.com",
 *     "matches": ["https://example.com/*"],
 *     "key": { "src": "/path/to/key" },
 *     "cert": { "src": "/User/path/to/certificate" },
 *     "passphrase": "iampassphrase"
 * }
 */
_.inherit((

    /**
     * A Certificate definition that represents the ssl certificate
     * to be used for an url.
     * Properties can then use the `.toObjectResolved` function to procure an object representation of the property with
     * all the variable references replaced by corresponding values.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {Certificate.definition=} [options] Object with matches, key, cert and passphrase
     *
     * @example <caption> Create a new Certificate</caption>
     *
     * var Certificate = require('postman-collection').Certificate,
     *    certificate = new Certificate({
     *     name: 'Certificate for example.com',
     *     matches: ['example.com'],
     *     key: { src: '/User/path/to/certificate/key' },
     *     cert: { src: '/User/path/to/certificate' },
     *     passphrase: 'iampassphrase'
     * });
     */
    Certificate = function Certificate (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Certificate.super_.apply(this, arguments);

        this.update(options);
    }), Property);

_.assign(Certificate.prototype, /** @lends Certificate.prototype */ {
    /**
     * Ensure all object have id
     *
     * @private
     */
    _postman_propertyRequiresId: true,

    /**
     * Updates the certificate with the given properties.
     *
     * @param {Certificate.definition=} [options] Object with matches, key, cert and passphrase
     */
    update: function (options) {
        // return early if options is empty or invalid
        if (!_.isObject(options)) {
            return;
        }

        _.mergeDefined(this, /** @lends Certificate.prototype */ {
            /**
             * Unique identifier
             *
             * @type {String}
             */
            id: options.id,

            /**
             * Name for user reference
             *
             * @type {String}
             */
            name: options.name,

            /**
             * List of match pattern
             *
             * @type {UrlMatchPatternList}
             */
            matches: options.matches && new UrlMatchPatternList({}, options.matches),

            /**
             * Private Key
             *
             * @type {{ src: (string) }}
             */
            key: _.isObject(options.key) ? options.key : { src: options.key },

            /**
             * Certificate
             *
             * @type {{ src: (string) }}
             */
            cert: _.isObject(options.cert) ? options.cert : { src: options.cert },

            /**
             * PFX or PKCS12 Certificate
             *
             * @type {{ src: (string) }}
             */
            pfx: _.isObject(options.pfx) ? options.pfx : { src: options.pfx },

            /**
             * passphrase
             *
             * @type {Object}
             */
            passphrase: options.passphrase
        });
    },

    /**
     * Checks if the certificate can be applied to a given url
     *
     * @param {String|Url} url The url string for which the certificate is checked for match.
     */
    canApplyTo: function (url) {
        if (_.isEmpty(url)) {
            return false;
        }

        // convert url strings to Url
        (typeof url === STRING) && (url = new Url(url));

        // this ensures we don't proceed any further for any protocol
        // that is not https
        if (url.protocol !== HTTPS) {
            return false;
        }

        // test the input url against allowed matches
        return this.matches.test(url);
    },

    /**
     * Allows the serialization of a {@link Certificate}
     *
     * This is overridden, in order to ensure that certificate contents are not accidentally serialized,
     * which can be a security risk.
     */
    toJSON: function () {
        var obj = PropertyBase.toJSON(this);

        _.unset(obj, 'key.value');
        _.unset(obj, 'cert.value');
        _.unset(obj, 'pfx.value');

        return obj;
    }
});

_.assign(Certificate, /** @lends Certificate */ {
    /**
     * Defines the name of this property for internal use
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Certificate',

    /**
     * Specify the key to be used while indexing this object
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyIndexKey: 'id',

    /**
     * Checks if the given object is a Certificate
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isCertificate: function (obj) {
        return Boolean(obj) && ((obj instanceof Certificate) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Certificate._postman_propertyName));
    }
});

module.exports = {
    Certificate
};
