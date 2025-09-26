var util = require('../util'),
    _ = util.lodash,
    PropertyBase = require('./property-base').PropertyBase,
    Property = require('./property').Property,
    Url = require('./url').Url,
    ProxyConfig = require('./proxy-config').ProxyConfig,
    Certificate = require('./certificate').Certificate,
    HeaderList = require('./header-list').HeaderList,
    RequestBody = require('./request-body').RequestBody,
    RequestAuth = require('./request-auth').RequestAuth,

    Request,

    /**
     * Default request method
     *
     * @private
     * @const
     * @type {String}
     */
    DEFAULT_REQ_METHOD = 'GET',

    /**
     * Content length header name
     *
     * @private
     * @const
     * @type {String}
     */
    CONTENT_LENGTH = 'Content-Length',

    /**
     * Single space
     *
     * @private
     * @const
     * @type {String}
     */
    SP = ' ',

    /**
     * Carriage return + line feed
     *
     * @private
     * @const
     * @type {String}
     */
    CRLF = '\r\n',

    /**
     * HTTP version
     *
     * @private
     * @const
     * @type {String}
     */
    HTTP_X_X = 'HTTP/X.X',

    /**
     * @private
     * @type {Boolean}
     */
    supportsBuffer = (typeof Buffer !== 'undefined') && _.isFunction(Buffer.byteLength),

    /**
     * Source of request body size calculation.
     * Either computed from body or used Content-Length header value.
     *
     * @private
     * @const
     * @type {Object}
     */
    SIZE_SOURCE = {
        computed: 'COMPUTED',
        contentLength: 'CONTENT-LENGTH'
    };

/**
 * @typedef Request.definition
 * @property {String|Url} url The URL of the request. This can be a {@link Url.definition} or a string.
 * @property {String} method The request method, e.g: "GET" or "POST".
 * @property {Array<Header.definition>} header The headers that should be sent as a part of this request.
 * @property {RequestBody.definition} body The request body definition.
 * @property {RequestAuth.definition} auth The authentication/signing information for this request.
 * @property {ProxyConfig.definition} proxy The proxy information for this request.
 * @property {Certificate.definition} certificate The certificate information for this request.
 */
_.inherit((

    /**
     * A Postman HTTP request object.
     *
     * @constructor
     * @extends {Property}
     * @param {Request.definition} options -
     */
    Request = function PostmanRequest (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Request.super_.apply(this, arguments);

        // if the definition is a string, it implies that this is a get of URL
        (typeof options === 'string') && (options = {
            url: options
        });

        // Create the default properties
        _.assign(this, /** @lends Request.prototype */ {
            /**
             * @type {Url}
             */
            url: new Url(),

            /**
             * @type {HeaderList}
             */
            headers: new HeaderList(this, options && options.header),

            // Although a similar check is being done in the .update call below, this handles falsy options as well.
            /**
             * @type {String}
             * @todo: Clean this up
             */
            // the negated condition is required to keep DEFAULT_REQ_METHOD as a fallback
            method: _.has(options, 'method') && !_.isNil(options.method) ?
                String(options.method).toUpperCase() : DEFAULT_REQ_METHOD
        });

        this.update(options);
    }), Property);

_.assign(Request.prototype, /** @lends Request.prototype */ {

    /**
     * Updates the different properties of the request.
     *
     * @param {Request.definition} options -
     */
    update: function (options) {
        // Nothing to do
        if (!options) { return; }

        // The existing url is updated.
        _.has(options, 'url') && this.url.update(options.url);

        // The existing list of headers must be cleared before adding the given headers to it.
        options.header && this.headers.repopulate(options.header);

        // Only update the method if one is provided.
        _.has(options, 'method') && (this.method = _.isNil(options.method) ?
            DEFAULT_REQ_METHOD : String(options.method).toUpperCase());

        // The rest of the properties are not assumed to exist so we merge in the defined ones.
        _.mergeDefined(this, /** @lends Request.prototype */ {
            /**
             * @type {RequestBody|undefined}
             */
            body: _.createDefined(options, 'body', RequestBody),

            // auth is a special case, empty RequestAuth should not be created for falsy values
            // to allow inheritance from parent
            /**
             * @type {RequestAuth}
             */
            auth: options.auth ? new RequestAuth(options.auth) : undefined,

            /**
             * @type {ProxyConfig}
             */
            proxy: options.proxy && new ProxyConfig(options.proxy),

            /**
             * @type {Certificate|undefined}
             */
            certificate: options.certificate && new Certificate(options.certificate)
        });
    },

    /**
     * Sets authentication method for the request
     *
     * @param {?String|RequestAuth.definition} type -
     * @param {VariableList=} [options] -
     *
     * @note This function was previously (in v2 of SDK) used to clone request and populate headers. Now it is used to
     * only set auth information to request
     *
     * @note that ItemGroup#authorizeUsing depends on this function
     */
    authorizeUsing: function (type, options) {
        if (_.isObject(type) && _.isNil(options)) {
            options = _.omit(type, 'type');
            type = type.type;
        }

        // null = delete request
        if (type === null) {
            _.has(this, 'auth') && (delete this.auth);

            return;
        }

        if (!RequestAuth.isValidType(type)) {
            return;
        }

        // create a new authentication data
        if (!this.auth) {
            this.auth = new RequestAuth(null, this);
        }
        else {
            this.auth.clear(type);
        }

        this.auth.use(type, options);
    },

    /**
     * Returns an object where the key is a header name and value is the header value.
     *
     * @param {Object=} options -
     * @param {Boolean} options.ignoreCase When set to "true", will ensure that all the header keys are lower case.
     * @param {Boolean} options.enabled Only get the enabled headers
     * @param {Boolean} options.multiValue When set to "true", duplicate header values will be stored in an array
     * @param {Boolean} options.sanitizeKeys When set to "true", headers with falsy keys are removed
     * @returns {Object}
     * @note If multiple headers are present in the same collection with same name, but different case
     * (E.g "x-forward-port" and "X-Forward-Port", and `options.ignoreCase` is set to true,
     * the values will be stored in an array.
     */
    getHeaders: function getHeaders (options) {
        !options && (options = {});

        // @note: options.multiValue will not be respected since, Header._postman_propertyAllowsMultipleValues
        // gets higher precedence in PropertyLists.toObject.
        // @todo: sanitizeKeys for headers by default.
        return this.headers.toObject(options.enabled, !options.ignoreCase, options.multiValue, options.sanitizeKeys);
    },

    /**
     * Calls the given callback on each Header object contained within the request.
     *
     * @param {Function} callback -
     */
    forEachHeader: function forEachHeader (callback) {
        this.headers.all().forEach(function (header) {
            return callback(header, this);
        }, this);
    },

    /**
     * Adds a header to the PropertyList of headers.
     *
     * @param {Header| {key: String, value: String}} header Can be a {Header} object, or a raw header object.
     */
    addHeader: function (header) {
        this.headers.add(header);
    },

    /**
     * Removes a header from the request.
     *
     * @param {String|Header} toRemove A header object to remove, or a string containing the header key.
     * @param {Object} options -
     * @param {Boolean} options.ignoreCase If set to true, ignores case while removing the header.
     */
    removeHeader: function (toRemove, options) {
        toRemove = _.isString(toRemove) ? toRemove : toRemove.key;

        options = options || {};

        if (!toRemove) { // Nothing to remove :(
            return;
        }

        options.ignoreCase && (toRemove = toRemove.toLowerCase());

        this.headers.remove(function (header) {
            var key = options.ignoreCase ? header.key.toLowerCase() : header.key;

            return key === toRemove;
        });
    },

    /**
     * Updates or inserts the given header.
     *
     * @param {Object} header -
     */
    upsertHeader: function (header) {
        if (!(header && header.key)) { return; } // if no valid header is provided, do nothing

        var existing = this.headers.find({ key: header.key });

        if (!existing) {
            return this.headers.add(header);
        }

        existing.value = header.value;
    },

    /**
     * Add query parameters to the request.
     *
     * @todo: Rename this?
     * @param {Array<QueryParam>|String} params -
     */
    addQueryParams: function (params) {
        this.url.addQueryParams(params);
    },

    /**
     * Removes parameters passed in params.
     *
     * @param {String|Array} params -
     */
    removeQueryParams: function (params) {
        this.url.removeQueryParams(params);
    },

    /**
     * Get the request size by computing the headers and body or using the
     * actual content length header once the request is sent.
     *
     * @returns {Object}
     */
    size: function () {
        var contentLength = this.headers.get(CONTENT_LENGTH),
            requestTarget = this.url.getPathWithQuery(),
            bodyString,
            sizeInfo = {
                body: 0,
                header: 0,
                total: 0,
                source: SIZE_SOURCE.computed
            };

        // if 'Content-Length' header is present, we take body as declared by
        // the client(postman-request or user-defined). else we need to compute the same.
        if (contentLength && util.isNumeric(contentLength)) {
            sizeInfo.body = parseInt(contentLength, 10);
            sizeInfo.source = SIZE_SOURCE.contentLength;
        }
        // otherwise, if body is defined, we calculate the length of the body
        else if (this.body) {
            // @note body.toString() returns E for formdata or file mode
            bodyString = this.body.toString();
            sizeInfo.body = supportsBuffer ? Buffer.byteLength(bodyString) :
                /* istanbul ignore next */
                bodyString.length;
        }

        // https://tools.ietf.org/html/rfc7230#section-3
        // HTTP-message   = start-line (request-line / status-line)
        //                  *( header-field CRLF )
        //                  CRLF
        //                  [ message-body ]
        // request-line = method SP request-target SP HTTP-version CRLF
        sizeInfo.header = (this.method + SP + requestTarget + SP + HTTP_X_X + CRLF + CRLF).length +
            this.headers.contentSize();

        // compute the approximate total body size by adding size of header and body
        sizeInfo.total = (sizeInfo.body || 0) + (sizeInfo.header);

        return sizeInfo;
    },

    /**
     * Converts the Request to a plain JavaScript object, which is also how the request is
     * represented in a collection file.
     *
     * @returns {{url: (*|String), method: *, header: (undefined|*), body: *, auth: *, certificate: *}}
     */
    toJSON: function () {
        var obj = PropertyBase.toJSON(this);

        // remove header array if blank
        if (_.isArray(obj.header) && !obj.header.length) {
            delete obj.header;
        }

        return obj;
    },

    /**
     * Creates a clone of this request
     *
     * @returns {Request}
     */
    clone: function () {
        return new Request(this.toJSON());
    }
});

_.assign(Request, /** @lends Request */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Request',

    /**
     * Check whether an object is an instance of {@link ItemGroup}.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isRequest: function (obj) {
        return Boolean(obj) && ((obj instanceof Request) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Request._postman_propertyName));
    }
});

module.exports = {
    Request
};
