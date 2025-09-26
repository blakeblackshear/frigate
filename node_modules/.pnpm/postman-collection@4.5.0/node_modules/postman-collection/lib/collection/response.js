var util = require('../util'),
    _ = util.lodash,
    httpReasons = require('http-reasons'),
    LJSON = require('liquid-json'),
    Property = require('./property').Property,
    PropertyBase = require('./property-base').PropertyBase,
    Request = require('./request').Request,
    CookieList = require('./cookie-list').CookieList,
    HeaderList = require('./header-list').HeaderList,
    contentInfo = require('../content-info').contentInfo,

    /**
     * @private
     * @const
     * @type {string}
     */
    E = '',

    /**
     * @private
     * @const
     * @type {String}
     */
    HEADER = 'header',

    /**
     * @private
     * @const
     * @type {String}
     */
    BODY = 'body',

    /**
     * @private
     * @const
     * @type {String}
     */
    GZIP = 'gzip',

    /**
     * @private
     * @const
     * @type {String}
     */
    CONTENT_ENCODING = 'Content-Encoding',

    /**
     * @private
     * @const
     * @type {String}
     */
    CONTENT_LENGTH = 'Content-Length',

    /**
     * @private
     * @const
     * @type {string}
     */
    BASE64 = 'base64',

    /**
     * @private
     * @const
     * @type {string}
     */
    STREAM_TYPE_BUFFER = 'Buffer',

    /**
     * @private
     * @const
     * @type {string}
     */
    STREAM_TYPE_BASE64 = 'Base64',

    /**
     * @private
     * @const
     * @type {string}
     */
    FUNCTION = 'function',

    /**
     * @private
     * @const
     * @type {string}
     */
    STRING = 'string',

    /**
     * @private
     * @const
     * @type {String}
     */
    HTTP_X_X = 'HTTP/X.X',

    /**
     * @private
     * @const
     * @type {String}
     */
    SP = ' ',

    /**
     * @private
     * @const
     * @type {String}
     */
    CRLF = '\r\n',

    /**
     * @private
     * @const
     * @type {RegExp}
     */
    REGEX_JSONP_LEFT = /^[^{(].*\(/,

    /**
     * @private
     * @const
     * @type {RegExp}
     */
    REGEX_JSONP_RIGHT = /\)[^}].*$|\)$/,

    /**
     * Remove JSON padded string to pure JSON
     *
     * @private
     * @param {String} str -
     * @returns {String}
     */
    stripJSONP = function (str) {
        return str.replace(REGEX_JSONP_LEFT, E).replace(REGEX_JSONP_RIGHT, E);
    },

    /**
     * @private
     * @type {Boolean}
     */
    supportsBuffer = (typeof Buffer !== 'undefined') && _.isFunction(Buffer.byteLength),

    /**
     * Normalizes an input Buffer, Buffer.toJSON() or base64 string into a Buffer or ArrayBuffer.
     *
     * @private
     * @param {Buffer|Object} stream - An instance of Buffer, Buffer.toJSON(), or Base64 string
     * @returns {Buffer|ArrayBuffer|undefined}
     */
    normalizeStream = function (stream) {
        if (!stream) { return; }

        // create buffer from buffer's JSON representation
        if (stream.type === STREAM_TYPE_BUFFER && _.isArray(stream.data)) {
            // @todo Add tests for Browser environments, where ArrayBuffer is returned instead of Buffer
            return typeof Buffer === FUNCTION ? Buffer.from(stream.data) : new Uint8Array(stream.data).buffer;
        }

        // create buffer from base64 string
        if (stream.type === STREAM_TYPE_BASE64 && typeof stream.data === STRING) {
            return Buffer.from(stream.data, BASE64);
        }

        // probably it's already of type buffer
        return stream;
    },

    Response; // constructor

/**
 * @typedef Response.definition
 * @property {Number} code - define the response code
 * @property {String=} [reason] - optionally, if the response has a non-standard response code reason, provide it here
 * @property {Array<Header.definition>} [header]
 * @property {Array<Cookie.definition>} [cookie]
 * @property {String} [body]
 * @property {Buffer|ArrayBuffer} [stream]
 * @property {Number} responseTime
 *
 * @todo pluralise `header`, `cookie`
 */
_.inherit((

    /**
     * Response holds data related to the request body. By default, it provides a nice wrapper for url-encoded,
     * form-data, and raw types of request bodies.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {Response.definition} options -
     */
    Response = function PostmanResponse (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Response.super_.apply(this, arguments);
        this.update(options || {});
    }), Property);

_.assign(Response.prototype, /** @lends Response.prototype */ {
    update (options) {
        // options.stream accepts Buffer, Buffer.toJSON() or base64 string
        // @todo this temporarily doubles the memory footprint (options.stream + generated buffer).
        const stream = normalizeStream(options.stream);

        _.mergeDefined((this._details = _.clone(httpReasons.lookup(options.code))), {
            name: _.choose(options.reason, options.status),
            code: options.code,
            standardName: this._details.name
        });

        _.mergeDefined(this, /** @lends Response.prototype */ {
            /**
             * @type {Request}
             */
            originalRequest: options.originalRequest ? new Request(options.originalRequest) : undefined,

            /**
             * @type {String}
             */
            status: this._details.name,

            /**
             * @type {Number}
             */
            code: options.code,

            /**
             * @type {HeaderList}
             */
            headers: new HeaderList(this, options.header),

            /**
             * @type {String}
             */
            body: options.body,

            /**
             * @private
             *
             * @type {Buffer|UInt8Array}
             */
            stream: (options.body && _.isObject(options.body)) ? options.body : stream,

            /**
             * @type {CookieList}
             */
            cookies: new CookieList(this, options.cookie),

            /**
             * Time taken for the request to complete.
             *
             * @type {Number}
             */
            responseTime: options.responseTime,

            /**
             * @private
             * @type {Number}
             */
            responseSize: stream && stream.byteLength,

            /**
             * @private
             * @type {Number}
             */
            downloadedBytes: options.downloadedBytes
        });
    }
});

_.assign(Response.prototype, /** @lends Response.prototype */ {
    /**
     * Defines that this property requires an ID field
     *
     * @private
     * @readOnly
     */
    _postman_propertyRequiresId: true,

    /**
     * Convert this response into a JSON serializable object. The _details meta property is omitted.
     *
     * @returns {Object}
     *
     * @todo consider switching to a different response buffer (stream) representation as Buffer.toJSON
     *       appears to cause multiple performance issues.
     */
    toJSON: function () {
        // @todo benchmark PropertyBase.toJSON, response Buffer.toJSON or _.cloneElement might
        // be the bottleneck.
        var response = PropertyBase.toJSON(this);

        response._details && (delete response._details);

        return response;
    },

    /**
     * Get the http response reason phrase based on the current response code.
     *
     * @returns {String|undefined}
     */
    reason: function () {
        return this.status || httpReasons.lookup(this.code).name;
    },

    /**
     * Creates a JSON representation of the current response details, and returns it.
     *
     * @returns {Object} A set of response details, including the custom server reason.
     * @private
     */
    details: function () {
        if (!this._details || this._details.code !== this.code) {
            this._details = _.clone(httpReasons.lookup(this.code));
            this._details.code = this.code;
            this._details.standardName = this._details.name;
        }

        return _.clone(this._details);
    },

    /**
     * Get the response body as a string/text.
     *
     * @returns {String|undefined}
     */
    text: function () {
        return (this.stream ? util.bufferOrArrayBufferToString(this.stream, this.contentInfo().charset) : this.body);
    },

    /**
     * Get the response body as a JavaScript object. Note that it throws an error if the response is not a valid JSON
     *
     * @param {Function=} [reviver] -
     * @param {Boolean} [strict=false] Specify whether JSON parsing will be strict. This will fail on comments and BOM
     * @example
     * // assuming that the response is stored in a collection instance `myCollection`
     * var response = myCollection.items.one('some request').responses.idx(0),
     *     jsonBody;
     * try {
     *     jsonBody = response.json();
     * }
     * catch (e) {
     *     console.log("There was an error parsing JSON ", e);
     * }
     * // log the root-level keys in the response JSON.
     * console.log('All keys in json response: ' + Object.keys(json));
     *
     * @returns {Object}
     */
    json: function (reviver, strict) {
        return LJSON.parse(this.text(), reviver, strict);
    },

    /**
     * Get the JSON from response body that returns JSONP response.
     *
     * @param {Function=} [reviver] -
     * @param {Boolean} [strict=false] Specify whether JSON parsing will be strict. This will fail on comments and BOM
     *
     * @throws {JSONError} when response body is empty
     */
    jsonp: function (reviver, strict) {
        return LJSON.parse(stripJSONP(this.text() || /* istanbul ignore next */ E), reviver, strict);
    },

    /**
     * Extracts mime type, format, charset, extension and filename of the response content
     * A fallback of default filename is given, if filename is not present in content-disposition header
     *
     * @returns {Response.ResponseContentInfo} - contentInfo for the response
     */
    contentInfo: function () {
        return contentInfo(this);
    },

    /**
     * @private
     * @deprecated discontinued in v4.0
     */
    mime: function () {
        throw new Error('`Response#mime` has been discontinued, use `Response#contentInfo` instead.');
    },

    /**
     * Converts the response to a dataURI that can be used for storage or serialisation. The data URI is formed using
     * the following syntax `data:<content-type>;baseg4, <base64-encoded-body>`.
     *
     * @returns {String}
     * @todo write unit tests
     */
    dataURI: function () {
        const { contentType } = this.contentInfo();

        // if there is no mime detected, there is no accurate way to render this thing
        /* istanbul ignore if */
        if (!contentType) {
            return E;
        }

        // we create the body string first from stream and then fallback to body
        return `data:${contentType};base64, ` + ((!_.isNil(this.stream) &&
            util.bufferOrArrayBufferToBase64(this.stream)) || (!_.isNil(this.body) && util.btoa(this.body)) || E);
    },

    /**
     * @typedef Response.sizeInfo
     * @property {Number} body - size of the response body in bytes
     * @property {Number} header - size of the response header in bytes
     * @property {Number} total - total size of the response body and header in bytes
     */
    /**
     * Get the response size by computing the same from content length header or
     * using the actual response body.
     *
     * @returns {Response.sizeInfo} - Response size object
     */
    size: function () {
        const sizeInfo = {
                body: 0,
                header: 0,
                total: 0
            },
            contentLength = this.headers.get(CONTENT_LENGTH);

        // Set body size from downloadedBytes if available
        if (util.isNumeric(this.downloadedBytes)) {
            sizeInfo.body = this.downloadedBytes;
        }
        // Rely on content-length header
        else if (contentLength && util.isNumeric(contentLength)) {
            sizeInfo.body = _.parseInt(contentLength, 10);
        }
        // Fall back to stream if available
        else if (this.stream && util.isNumeric(this.stream.byteLength)) {
            sizeInfo.body = this.stream.byteLength;
        }
        // Or, calculate size from body string
        else if (!_.isNil(this.body)) {
            sizeInfo.body = supportsBuffer ?
                Buffer.byteLength(this.body.toString()) :
                /* istanbul ignore next */
                this.body.toString().length;
        }

        // Header size is calculated as per the HTTP message format
        // https://tools.ietf.org/html/rfc7230#section-3
        // HTTP-message   = start-line (request-line / status-line)
        //                  *( header-field CRLF )
        //                  CRLF
        //                  [ message-body ]
        // status-line = HTTP-version SP status-code SP reason-phrase CRLF
        sizeInfo.header = (
            HTTP_X_X + SP + this.code + SP + this.reason() + CRLF + CRLF
        ).length + this.headers.contentSize();

        // Compute the approximate total body size by adding size of header and body
        sizeInfo.total = (sizeInfo.body || 0) + (sizeInfo.header);

        return sizeInfo;
    },

    /**
     * Returns the response encoding defined as header or detected from body.
     *
     * @private
     * @returns {Object} - {format: string, source: string}
     */
    encoding: function () {
        var contentEncoding = this.headers.get(CONTENT_ENCODING),
            body = this.stream || this.body,
            source;

        if (contentEncoding) {
            source = HEADER;
        }

        // if the encoding is not found, we check
        else if (body) { // @todo add detection for deflate
            // eslint-disable-next-line lodash/prefer-matches
            if (body[0] === 0x1F && body[1] === 0x8B && body[2] === 0x8) {
                contentEncoding = GZIP;
            }

            if (contentEncoding) {
                source = BODY;
            }
        }

        return {
            format: contentEncoding,
            source: source
        };
    }
});

_.assign(Response, /** @lends Response */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Response',

    /**
     * Check whether an object is an instance of {@link ItemGroup}.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isResponse: function (obj) {
        return Boolean(obj) && ((obj instanceof Response) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Response._postman_propertyName));
    },

    /**
     * Converts the response object from the request module to the postman responseBody format
     *
     * @param {Object} response The response object, as received from the request module
     * @param {Object} cookies -
     * @returns {Object} The transformed responseBody
     * @todo Add a key: `originalRequest` to the returned object as well, referring to response.request
     */
    createFromNode: function (response, cookies) {
        return new Response({
            cookie: cookies,
            body: response.body.toString(),
            stream: response.body,
            header: response.headers,
            code: response.statusCode,
            status: response.statusMessage,
            responseTime: response.elapsedTime
        });
    },

    /**
     * @private
     * @deprecated discontinued in v4.0
     */
    mimeInfo: function () {
        throw new Error('`Response.mimeInfo` has been discontinued, use `Response#contentInfo` instead.');
    },

    /**
     * Returns the durations of each request phase in milliseconds
     *
     * @typedef Response.timings
     * @property {Number} start - timestamp of the request sent from the client (in Unix Epoch milliseconds)
     * @property {Object} offset - event timestamps in millisecond resolution relative to start
     * @property {Number} offset.request - timestamp of the start of the request
     * @property {Number} offset.socket - timestamp when the socket is assigned to the request
     * @property {Number} offset.lookup - timestamp when the DNS has been resolved
     * @property {Number} offset.connect - timestamp when the server acknowledges the TCP connection
     * @property {Number} offset.secureConnect - timestamp when secure handshaking process is completed
     * @property {Number} offset.response -  timestamp when the first bytes are received from the server
     * @property {Number} offset.end - timestamp when the last bytes of the response are received
     * @property {Number} offset.done - timestamp when the response is received at the client
     *
     * @note If there were redirects, the properties reflect the timings
     *       of the final request in the redirect chain
     *
     * @param {Response.timings} timings -
     * @returns {Object}
     *
     * @example Output
     * Request.timingPhases(timings);
     * {
     *     prepare: Number,         // duration of request preparation
     *     wait: Number,            // duration of socket initialization
     *     dns: Number,             // duration of DNS lookup
     *     tcp: Number,             // duration of TCP connection
     *     secureHandshake: Number, // duration of secure handshake
     *     firstByte: Number,       // duration of HTTP server response
     *     download: Number,        // duration of HTTP download
     *     process: Number,         // duration of response processing
     *     total: Number            // duration entire HTTP round-trip
     * }
     *
     * @note if there were redirects, the properties reflect the timings of the
     *       final request in the redirect chain.
     */
    timingPhases: function (timings) {
        // bail out if timing information is not provided
        if (!(timings && timings.offset)) {
            return;
        }

        var phases,
            offset = timings.offset;

        // REFER: https://github.com/postmanlabs/postman-request/blob/v2.88.1-postman.5/request.js#L996
        phases = {
            prepare: offset.request,
            wait: offset.socket - offset.request,
            dns: offset.lookup - offset.socket,
            tcp: offset.connect - offset.lookup,
            firstByte: offset.response - offset.connect,
            download: offset.end - offset.response,
            process: offset.done - offset.end,
            total: offset.done
        };

        if (offset.secureConnect) {
            phases.secureHandshake = offset.secureConnect - offset.connect;
            phases.firstByte = offset.response - offset.secureConnect;
        }

        return phases;
    }
});

module.exports = {
    Response
};
