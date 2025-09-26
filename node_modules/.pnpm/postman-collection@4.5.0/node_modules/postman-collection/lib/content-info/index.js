var util = require('../util'),
    _ = util.lodash,
    fileType = require('file-type'),
    mimeType = require('mime-types'),
    mimeFormat = require('mime-format'),

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
    DOT = '.',

    /**
     * @private
     * @const
     * @type {String}
     */
    QUESTION_MARK = '?',

    /**
     * @private
     * @const
     * @type {String}
     */
    DOUBLE_QUOTES = '"',

    /**
     * @private
     * @const
     * @type {String}
     */
    TOKEN_$1 = '$1',

    /**
     * @private
     * @const
     * @type {String}
     */
    BINARY = 'binary',

    /**
     * @private
     * @const
     * @type {String}
     */
    CHARSET_UTF8 = 'utf8',

    /**
     * @private
     * @const
     * @type {String}
     */
    CONTENT_TYPE_TEXT_PLAIN = 'text/plain',

    /**
     * Enum for all the Content Headers
     *
     * @private
     * @const
     * @enum {String} HEADERS
     */
    HEADERS = {
        CONTENT_TYPE: 'Content-Type',
        CONTENT_DISPOSITION: 'Content-Disposition'
    },

    /**
     * @private
     * @const
     * @type {String}
     */
    DEFAULT_RESPONSE_FILENAME = 'response',

    /**
     * @private
     * @type {Boolean}
     */
    supportsBuffer = (typeof Buffer !== 'undefined') && _.isFunction(Buffer.byteLength),

    /**
     * Regexes for extracting and decoding the filename from content-disposition header
     *
     * @private
     * @type {Object}
     */
    regexes = {

        /**
         * RegExp for extracting filename from content-disposition header
         *
         * RFC 2616 grammar
         * parameter     = token "=" ( token | quoted-string )
         * token         = 1*<any CHAR except CTLs or separators>
         * separators    = "(" | ")" | "<" | ">" | "@"
         *               | "," | ";" | ":" | "\" | <">
         *               | "/" | "[" | "]" | "?" | "="
         *               | "{" | "}" | SP | HT
         * quoted-string = ( <"> *(qdtext | quoted-pair ) <"> )
         * qdtext        = <any TEXT except <">>
         * quoted-pair   = "\" CHAR
         * CHAR          = <any US-ASCII character (octets 0 - 127)>
         * TEXT          = <any OCTET except CTLs, but including LWS>
         * LWS           = [CRLF] 1*( SP | HT )
         * CRLF          = CR LF
         * CR            = <US-ASCII CR, carriage return (13)>
         * LF            = <US-ASCII LF, linefeed (10)>
         * SP            = <US-ASCII SP, space (32)>
         * HT            = <US-ASCII HT, horizontal-tab (9)>
         * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
         * OCTET         = <any 8-bit sequence of data>
         *
         * egHeader: inline; filename=testResponse.json
         * egHeader: inline; filename="test Response.json"
         * Reference: https://github.com/jshttp/content-disposition
         */
        // eslint-disable-next-line max-len
        fileNameRegex: /;[ \t]*(?:filename)[ \t]*=[ \t]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[ \t]*/,

        /**
         * RegExp for extracting filename* from content-disposition header
         *
         * RFC 5987 grammar
         * parameter     = reg-parameter / ext-parameter
         * ext-parameter = parmname "*" LWSP "=" LWSP ext-value
         * parmname      = 1*attr-char
         * ext-value     = charset  "'" [ language ] "'" value-chars
                    ; like RFC 2231's <extended-initial-value>
                    ; (see [RFC2231], Section 7)
         * charset       = "UTF-8" / "ISO-8859-1" / mime-charset
         * mime-charset  = 1*mime-charsetc
         * mime-charsetc = ALPHA / DIGIT
                    / "!" / "#" / "$" / "%" / "&"
                    / "+" / "-" / "^" / "_" / "`"
                    / "{" / "}" / "~"
                    ; as <mime-charset> in Section 2.3 of [RFC2978]
                    ; except that the single quote is not included
                    ; SHOULD be registered in the IANA charset registry
         * language      = <Language-Tag, defined in [RFC5646], Section 2.1>
         * value-chars   = *( pct-encoded / attr-char )
         * pct-encoded   = "%" HEXDIG HEXDIG
                    ; see [RFC3986], Section 2.1
         * attr-char     = ALPHA / DIGIT
                    / "!" / "#" / "$" / "&" / "+" / "-" / "."
                    / "^" / "_" / "`" / "|" / "~"
                    ; token except ( "*" / "'" / "%" )
         *
         * egHeader: attachment;filename*=utf-8''%E4%BD%A0%E5%A5%BD.txt
         * Reference: https://github.com/jshttp/content-disposition
         */
        // eslint-disable-next-line max-len, security/detect-unsafe-regex
        encodedFileNameRegex: /;[ \t]*(?:filename\*)[ \t]*=[ \t]*([A-Za-z0-9!#$%&+\-^_`{}~]+)'.*'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)[ \t]*/,

        /**
         * RegExp to match quoted-pair in RFC 2616
         *
         * quoted-pair = "\" CHAR
         * CHAR        = <any US-ASCII character (octets 0 - 127)>
         */
        quotedPairRegex: /\\([ -~])/g,

        /**
         * Regex to match all the hexadecimal number inside encoded string
         */
        hexCharMatchRegex: /%([0-9A-Fa-f]{2})/g,

        /**
         * Regex to match non-latin characters
         */
        nonLatinCharMatchRegex: /[^\x20-\x7e\xa0-\xff]/g
    },

    /**
     * Decodes the hexcode to charCode
     *
     * @private
     * @param {String} str - The matched string part of a hexadecimal number
     * @param {String} hex - The hexadecimal string which needs to be converted to charCode
     * @returns {String} - String with decoded hexcode values
     */
    decodeHexcode = function (str, hex) {
        return String.fromCharCode(parseInt(hex, 16));
    },

    /**
     * HashMap for decoding string with supported characterSets
     * iso-8859-1
     * utf-8
     *
     * @private
     * @type {Object}
     */
    characterDecoders = {

        /**
         * Replaces non-latin characters with '?'
         *
         * @private
         * @param {String} val - Input encoded string
         * @returns {String} - String with latin characters
         */
        'iso-8859-1' (val) {
            return val.replace(regexes.nonLatinCharMatchRegex, QUESTION_MARK);
        },

        /**
         * Decodes the given string with utf-8 character set
         *
         * @private
         * @param {?String} encodedString - Input encoded string
         * @returns {?String} - String with decoded character with utf-8
         */
        'utf-8' (encodedString) {
            /* istanbul ignore if */
            if (!supportsBuffer) {
                return;
            }

            return Buffer.from(encodedString, BINARY).toString(CHARSET_UTF8);
        }
    },

    /**
     * Decodes the given filename with given charset
     * The supported character sets are
     * iso-8859-1
     * utf-8
     *
     * @private
     * @param {String} encodedFileName - Input encoded file name
     * @param {String} charset - The character set to be used while decoding
     * @returns {String} - Returns the decoded filename
     */
    decodeFileName = function (encodedFileName, charset) {
        /* istanbul ignore if */
        if (!encodedFileName) {
            return;
        }

        if (!characterDecoders[charset]) {
            return;
        }

        // decodes the hexadecimal numbers to charCode in encodedFileName and then decodes with given charset
        return characterDecoders[charset](encodedFileName.replace(regexes.hexCharMatchRegex, decodeHexcode));
    },

    /**
     * Takes the content-type header value and performs the mime sniffing with known mime types.
     * If content-type header is not present, detects the mime type from the response stream or response body
     * If content-type is not provided and not able to detect, then text/plain is taken as default
     *
     * @private
     * @param {?String} contentType - The value of content type header
     * @param {Stream|String} response - The response stream or body, for which content-info should be determined
     * @returns {Object} - mime information from response headers
     */
    getMimeInfo = function (contentType, response) {
        var normalized,
            detected,
            detectedExtension;


        if (!contentType) {
            detected = fileType(response);
            detected && (contentType = detected.mime) && (detectedExtension = detected.ext);
        }

        // if contentType is not detected set text/plain as default
        if (!contentType) {
            contentType = CONTENT_TYPE_TEXT_PLAIN;
        }

        normalized = mimeFormat.lookup(contentType);

        return {
            contentType: normalized.source,
            mimeType: normalized.type, // sanitized mime type base
            mimeFormat: normalized.format, // format specific to the type returned
            charset: normalized.charset || CHARSET_UTF8,
            extension: detectedExtension || mimeType.extension(normalized.source) || E
        };
    },

    /**
     * Parses Content disposition header, and returns file name and extension
     *
     * @private
     * @param {?String} dispositionHeader - Content-disposition Header from the response
     * @returns {?String} - Returns file name from content disposition header if present
     */
    getFileNameFromDispositionHeader = function (dispositionHeader) {
        if (!dispositionHeader) {
            return;
        }

        var encodedFileName,
            fileName;

        // Get filename* value from the dispositionHeader
        encodedFileName = regexes.encodedFileNameRegex.exec(dispositionHeader);

        if (encodedFileName) {
            fileName = decodeFileName(encodedFileName[2], encodedFileName[1]);
        }

        // If filename* is not present or unparseable, then we are checking for filename in header
        if (!fileName) {
            fileName = regexes.fileNameRegex.exec(dispositionHeader);
            fileName && (fileName = fileName[1]);

            // check if file name is wrapped in double quotes
            // file name can contain escaped characters if wrapped in quotes
            if (fileName && fileName[0] === DOUBLE_QUOTES) {
                // remove quotes and escapes
                fileName = fileName
                    .substr(1, fileName.length - 2)
                    .replace(regexes.quotedPairRegex, TOKEN_$1);
            }
        }

        return fileName;
    };


module.exports = {

    /**
     * Extracts content related information from response.
     * Includes response mime information, character set and file name.
     *
     * @private
     * @param {Response} response - response instance
     * @returns {Response.ResponseContentInfo} - Return contentInfo of the response
     */
    contentInfo (response) {
        var contentType = response.headers.get(HEADERS.CONTENT_TYPE),
            contentDisposition = response.headers.get(HEADERS.CONTENT_DISPOSITION),
            mimeInfo = getMimeInfo(contentType, response.stream || response.body),
            fileName = getFileNameFromDispositionHeader(contentDisposition),
            fileExtension = mimeInfo.extension,

            /**
             * @typedef Response.ResponseContentInfo
             *
             * @property {String} mimeType sanitized mime type
             * @property {String} mimeFormat format for the identified mime type
             * @property {String} charset the normalized character set
             * @property {String} fileExtension extension identified from the mime type
             * @property {String} fileName file name extracted from disposition header
             * @property {String} contentType sanitized content-type extracted from header
             */
            contentInfo = {};


        // if file name is not present in the content disposition headers, use a default file name
        if (!fileName) {
            fileName = DEFAULT_RESPONSE_FILENAME;
            // add extension to default if present
            fileExtension && (fileName += (DOT + fileExtension));
        }

        // create a compacted list of content info from mime info and file name
        mimeInfo.contentType && (contentInfo.contentType = mimeInfo.contentType);
        mimeInfo.mimeType && (contentInfo.mimeType = mimeInfo.mimeType);
        mimeInfo.mimeFormat && (contentInfo.mimeFormat = mimeInfo.mimeFormat);
        mimeInfo.charset && (contentInfo.charset = mimeInfo.charset);
        fileExtension && (contentInfo.fileExtension = fileExtension);
        fileName && (contentInfo.fileName = fileName);

        return contentInfo;
    },
    // regexes are extracted for vulnerability tests
    regexes
};
