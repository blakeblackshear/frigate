/**
 * Unirest for Node.js
 *
 * @author Nijko Yonskai
 * @copyright 2013-2015
 * @license MIT
 */

/**
 * Module Dependencies
 */

var StringDecoder = require('string_decoder').StringDecoder
var QueryString = require('querystring')
var FormData = require('form-data')
var Stream = require('stream')
var mime = require('mime')
var zlib = require('zlib')
var path = require('path')
var URL = require('url')
var fs = require('fs')

/**
 * Define form mime type
 */
mime.define({
  'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-data']
})

/**
 * Initialize our Rest Container
 *
 * @type {Object}
 */
var Unirest = function (method, uri, headers, body, callback) {
  var unirest = function (uri, headers, body, callback) {
    var $this = {
      /**
       * Stream Multipart form-data request
       *
       * @type {Boolean}
       */
      _stream: false,

      /**
       * Container to hold multipart form data for processing upon request.
       *
       * @type {Array}
       * @private
       */
      _multipart: [],

      /**
       * Container to hold form data for processing upon request.
       *
       * @type {Array}
       * @private
       */
      _form: [],

      /**
       * Request option container for details about the request.
       *
       * @type {Object}
       */
      options: {
        /**
         * Url obtained from request method arguments.
         *
         * @type {String}
         */
        url: uri,

        /**
         * Method obtained from request method arguments.
         *
         * @type {String}
         */
        method: method,

        /**
         * List of headers with case-sensitive fields.
         *
         * @type {Object}
         */
        headers: {}
      },

      hasHeader: function (name) {
        var headers
        var lowercaseHeaders

        name = name.toLowerCase()
        headers = Object.keys($this.options.headers)
        lowercaseHeaders = headers.map(function (header) {
          return header.toLowerCase()
        })

        for (var i = 0; i < lowercaseHeaders.length; i++) {
          if (lowercaseHeaders[i] === name) {
            return headers[i]
          }
        }

        return false
      },

      /**
       * Turn on multipart-form streaming
       *
       * @return {Object}
       */
      stream: function () {
        $this._stream = true
        return this
      },

      /**
       * Attaches a field to the multipart-form request, with pre-processing.
       *
       * @param  {String} name
       * @param  {String} value
       * @return {Object}
       */
      field: function (name, value, options) {
        return handleField(name, value, options)
      },

      /**
       * Attaches a file to the multipart-form request.
       *
       * @param  {String} name
       * @param  {String|Object} path
       * @return {Object}
       */
      attach: function (name, path, options) {
        options = options || {}
        options.attachment = true
        return handleField(name, path, options)
      },

      /**
       * Attaches field to the multipart-form request, with no pre-processing.
       *
       * @param  {String} name
       * @param  {String|Object} path
       * @param  {Object} options
       * @return {Object}
       */
      rawField: function (name, value, options) {
        $this._multipart.push({
          name: name,
          value: value,
          options: options,
          attachment: options.attachment || false
        })
      },

      /**
       * Basic Header Authentication Method
       *
       * Supports user being an Object to reflect Request
       * Supports user, password to reflect SuperAgent
       *
       * @param  {String|Object} user
       * @param  {String} password
       * @param  {Boolean} sendImmediately
       * @return {Object}
       */
      auth: function (user, password, sendImmediately) {
        $this.options.auth = (is(user).a(Object)) ? user : {
          user: user,
          password: password,
          sendImmediately: sendImmediately
        }

        return $this
      },

      /**
       * Sets header field to value
       *
       * @param  {String} field Header field
       * @param  {String} value Header field value
       * @return {Object}
       */
      header: function (field, value) {
        if (is(field).a(Object)) {
          for (var key in field) {
            if (Object.prototype.hasOwnProperty.call(field, key)) {
              $this.header(key, field[key])
            }
          }

          return $this
        }

        var existingHeaderName = $this.hasHeader(field)
        $this.options.headers[existingHeaderName || field] = value

        return $this
      },

      /**
       * Serialize value as querystring representation, and append or set on `Request.options.url`
       *
       * @param  {String|Object} value
       * @return {Object}
       */
      query: function (value) {
        if (is(value).a(Object)) value = Unirest.serializers.form(value)
        if (!value.length) return $this
        $this.options.url += (does($this.options.url).contain('?') ? '&' : '?') + value
        return $this
      },

      /**
       * Set _content-type_ header with type passed through `mime.getType()` when necessary.
       *
       * @param  {String} type
       * @return {Object}
       */
      type: function (type) {
        $this.header('Content-Type', does(type).contain('/')
          ? type
          : mime.getType(type))
        return $this
      },

      /**
       * Data marshalling for HTTP request body data
       *
       * Determines whether type is `form` or `json`.
       * For irregular mime-types the `.type()` method is used to infer the `content-type` header.
       *
       * When mime-type is `application/x-www-form-urlencoded` data is appended rather than overwritten.
       *
       * @param  {Mixed} data
       * @return {Object}
       */
      send: function (data) {
        var type = $this.options.headers[$this.hasHeader('content-type')]

        if ((is(data).a(Object) || is(data).a(Array)) && !Buffer.isBuffer(data)) {
          if (!type) {
            $this.type('form')
            type = $this.options.headers[$this.hasHeader('content-type')]
            $this.options.body = Unirest.serializers.form(data)
          } else if (~type.indexOf('json')) {
            $this.options.json = true

            if ($this.options.body && is($this.options.body).a(Object)) {
              for (var key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                  $this.options.body[key] = data[key]
                }
              }
            } else {
              $this.options.body = data
            }
          } else {
            $this.options.body = Unirest.Request.serialize(data, type)
          }
        } else if (is(data).a(String)) {
          if (!type) {
            $this.type('form')
            type = $this.options.headers[$this.hasHeader('content-type')]
          }

          if (type === 'application/x-www-form-urlencoded') {
            $this.options.body = $this.options.body
              ? $this.options.body + '&' + data
              : data
          } else {
            $this.options.body = ($this.options.body || '') + data
          }
        } else {
          $this.options.body = data
        }

        return $this
      },

      /**
       * Takes multipart options and places them on `options.multipart` array.
       * Transforms body when an `Object` or _content-type_ is present.
       *
       * Example:
       *
       *      Unirest.get('http://google.com').part({
       *        'content-type': 'application/json',
       *        body: {
       *          phrase: 'Hello'
       *        }
       *      }).part({
       *        'content-type': 'application/json',
       *        body: {
       *          phrase: 'World'
       *        }
       *      }).end(function (response) {})
       *
       * @param  {Object|String} options When an Object, headers should be placed directly on the object,
       *                                 not under a child property.
       * @return {Object}
       */
      part: function (options) {
        if (!$this._multipart) {
          $this.options.multipart = []
        }

        if (is(options).a(Object)) {
          if (options['content-type']) {
            var type = Unirest.type(options['content-type'], true)
            if (type) options.body = Unirest.Response.parse(options.body)
          } else {
            if (is(options.body).a(Object)) {
              options.body = Unirest.serializers.json(options.body)
            }
          }

          $this.options.multipart.push(options)
        } else {
          $this.options.multipart.push({
            body: options
          })
        }

        return $this
      },

      /**
       * Instructs the Request to be retried if specified error status codes (4xx, 5xx, ETIMEDOUT) are returned.
       * Retries are delayed with an exponential backoff.
       *
       * @param {(err: Error) => boolean} [callback] - Invoked on response error. Return false to stop next request.
       * @param {Object} [options] - Optional retry configuration to override defaults.
       * @param {number} [options.attempts=3] - The number of retry attempts.
       * @param {number} [options.delayInMs=250] - The delay in milliseconds (delayInMs *= delayMulti)
       * @param {number} [options.delayMulti=2] - The multiplier of delayInMs after each attempt.
       * @param {Array<string|number>} [options.statusCodes=["ETIMEDOUT", "5xx"]] - The status codes to retry on.
       * @return {Object}
       */
      retry: function (callback, options) {

        $this.options.retry = {
          callback: typeof callback === "function" ? callback : null,
          attempts: options && +options.attempts || 3,
          delayInMs: options && +options.delayInMs || 250,
          delayMulti: options && +options.delayMulti || 2,
          statusCodes: (options && options.statusCodes || ["ETIMEDOUT", "5xx"]).slice(0)
        };

        return $this
      },

      /**
       * Proxies the call to end. This adds support for using promises as well as async/await.
       *
       * @param  {Function} callback
       * @return {Promise}
       **/
      then: function (callback) {
        return new Promise((resolve, reject) => {
          this.end(result => {
            try {
              resolve(callback(result))
            } catch (err) {
              reject(err)
            }
          })
        })
      },

      /**
       * Sends HTTP Request and awaits Response finalization. Request compression and Response decompression occurs here.
       * Upon HTTP Response post-processing occurs and invokes `callback` with a single argument, the `[Response](#response)` object.
       *
       * @param  {Function} callback
       * @return {Object}
       */
      end: function (callback) {
        var self = this
        var Request
        var header
        var parts
        var form

        function handleRetriableRequestResponse (result) {

          // If retries is not defined or all attempts tried, return true to invoke end's callback.
          if ($this.options.retry === undefined || $this.options.retry.attempts === 0) {
            return true
          }

          // If status code is not listed, abort with return true to invoke end's callback.
          var isStatusCodeDefined = (function (code, codes) {

            if (codes.indexOf(code) !== -1) {
              return true
            }

            return codes.reduce(function (p, c) {
                return p || String(code).split("").every(function (ch, i) {
                  return ch === "x" || ch === c[i]
                })
              }, false)

          }(result.code || result.error && result.error.code, $this.options.retry.statusCodes))

          if (!isStatusCodeDefined) {
            return true
          }

          if ($this.options.retry.callback) {
            var isContinue = $this.options.retry.callback(result)
            // If retry callback returns false, stop retries and invoke end's callback.
            if (isContinue === false) {
              return true;
            }
          }

          setTimeout(function () {
            self.end(callback)
          }, $this.options.retry.delayInMs)

          $this.options.retry.attempts--
          $this.options.retry.delayInMs *= $this.options.retry.delayMulti

          // Return false to not invoke end's callback.
          return false
        }

        function handleRequestResponse (error, response, body) {
          var result = {}
          var status
          var data
          var type

          // Handle pure error
          if (error && !response) {
            result.error = error

            if (handleRetriableRequestResponse(result) && callback) {
              callback(result)
            }

            return
          }

          // Handle No Response...
          // This is weird.
          if (!response) {
            console.log('This is odd, report this action / request to: http://github.com/mashape/unirest-nodejs')

            result.error = {
              message: 'No response found.'
            }

            if (handleRetriableRequestResponse(result) && callback) {
              callback(result)
            }

            return
          }

          // Create response reference
          result = response

          // Create response status reference
          status = response.statusCode

          // Normalize MSIE response to HTTP 204
          status = (status === 1223 ? 204 : status)

          // Obtain status range typecode (1, 2, 3, 4, 5, etc.)
          type = status / 100 | 0

          // Generate sugar helper properties for status information
          result.code = status
          result.status = status
          result.statusType = type
          result.info = type === 1
          result.ok = type === 2
          result.clientError = type === 4
          result.serverError = type === 5
          result.error = (type === 4 || type === 5) ? (function generateErrorMessage () {
            var msg = 'got ' + result.status + ' response'
            var err = new Error(msg)
            err.status = result.status
            return err
          })() : false

          // Iterate over Response Status Codes and generate more sugar
          for (var name in Unirest.Response.statusCodes) {
            result[name] = Unirest.Response.statusCodes[name] === status
          }

          // Cookie Holder
          result.cookies = {}

          // Cookie Sugar Method
          result.cookie = function (name) {
            return result.cookies[name]
          }

          function setCookie (cookie) {
            var crumbs = Unirest.trim(cookie).split('=')
            var key = Unirest.trim(crumbs[0])
            var value = Unirest.trim(crumbs.slice(1).join('='))

            if (crumbs[0] && crumbs[0] !== '') {
              result.cookies[key] = value === '' ? true : value
            }
          }

          if (response.cookies && is(response.cookies).a(Object) && Object.keys(response.cookies).length > 0) {
            result.cookies = response.cookies
          } else {
            // Handle cookies to be set
            var cookies = response.headers['set-cookie']
            if (cookies && is(cookies).a(Array)) {
              for (var index = 0; index < cookies.length; index++) {
                var entry = cookies[index]

                if (is(entry).a(String) && does(entry).contain(';')) {
                  entry.split(';').forEach(setCookie)
                }
              }
            }

            // Handle cookies that have been set
            cookies = response.headers.cookie
            if (cookies && is(cookies).a(String)) {
              cookies.split(';').forEach(setCookie)
            }
          }

          // Obtain response body
          body = body || response.body
          result.raw_body = body
          result.headers = response.headers

          // Handle Response Body
          if (body) {
            type = Unirest.type(result.headers['content-type'], true)
            if (type) data = Unirest.Response.parse(body, type)
            else data = body
          }

          result.body = data

          ;(handleRetriableRequestResponse(result)) && (callback) && callback(result)
        }

        function handleGZIPResponse (response) {
          if (/^(deflate|gzip)$/.test(response.headers['content-encoding'])) {
            var unzip = zlib.createUnzip()
            var stream = new Stream()
            var _on = response.on
            var decoder

            // Keeping node happy
            stream.req = response.req

            // Make sure we emit prior to processing
            unzip.on('error', function (error) {
              // Catch the parser error when there is no content
              if (error.errno === zlib.Z_BUF_ERROR || error.errno === zlib.Z_DATA_ERROR) {
                stream.emit('end')
                return
              }

              stream.emit('error', error)
            })

            // Start the processing
            response.pipe(unzip)

            // Ensure encoding is captured
            response.setEncoding = function (type) {
              decoder = new StringDecoder(type)
            }

            // Capture decompression and decode with captured encoding
            unzip.on('data', function (buffer) {
              if (!decoder) return stream.emit('data', buffer)
              var string = decoder.write(buffer)
              if (string.length) stream.emit('data', string)
            })

            // Emit yoself
            unzip.on('end', function () {
              stream.emit('end')
            })

            response.on = function (type, next) {
              if (type === 'data' || type === 'end') {
                stream.on(type, next)
              } else if (type === 'error') {
                _on.call(response, type, next)
              } else {
                _on.call(response, type, next)
              }
            }
          }
        }

        function handleFormData (form) {
          for (var i = 0; i < $this._multipart.length; i++) {
            var item = $this._multipart[i]

            if (item.attachment && is(item.value).a(String)) {
              if (does(item.value).contain('http://') || does(item.value).contain('https://')) {
                item.value = Unirest.request(item.value)
              } else {
                item.value = fs.createReadStream(path.resolve(item.value))
              }
            }

            form.append(item.name, item.value, item.options)
          }

          return form
        }

        if ($this._multipart.length && !$this._stream) {
          header = $this.options.headers[$this.hasHeader('content-type')]
          parts = URL.parse($this.options.url)
          form = new FormData()

          if (header) {
            $this.options.headers['content-type'] = header.split(';')[0] + '; boundary=' + form.getBoundary()
          } else {
            $this.options.headers['content-type'] = 'multipart/form-data; boundary=' + form.getBoundary()
          }

          function authn(auth) {
              if (!auth) return null;
              if (typeof auth === 'string') return auth;
              if (auth.user && auth.pass) return auth.user + ':' + auth.pass;
              return auth;
          }

          return handleFormData(form).submit({
            protocol: parts.protocol,
            port: parts.port,
            // Formdata doesn't expect port to be included with host
            // so we use hostname rather than host
            host: parts.hostname,
            path: parts.path,
            method: $this.options.method,
            headers: $this.options.headers,
            auth: authn($this.options.auth || parts.auth)
          }, function (error, response) {
            var decoder = new StringDecoder('utf8')

            if (error) {
              return handleRequestResponse(error, response)
            }

            if (!response.body) {
              response.body = ''
            }

            // Node 10+
            response.resume()

            // GZIP, Feel me?
            handleGZIPResponse(response)

            // Fallback
            response.on('data', function (chunk) {
              if (typeof chunk === 'string') response.body += chunk
              else response.body += decoder.write(chunk)
            })

            // After all, we end up here
            response.on('end', function () {
              return handleRequestResponse(error, response)
            })
          })
        }

        Request = Unirest.request($this.options, handleRequestResponse)
        Request.on('response', handleGZIPResponse)

        if ($this._multipart.length && $this._stream) {
          handleFormData(Request.form())
        }

        return Request
      }
    }

    /**
     * Alias for _.header_
     * @type {Function}
     */
    $this.headers = $this.header

    /**
     * Alias for _.header_
     *
     * @type {Function}
     */
    $this.set = $this.header

    /**
     * Alias for _.end_
     *
     * @type {Function}
     */
    $this.complete = $this.end

    /**
     * Aliases for _.end_
     *
     * @type {Object}
     */

    $this.as = {
      json: $this.end,
      binary: $this.end,
      string: $this.end
    }

    /**
     * Handles Multipart Field Processing
     *
     * @param {String} name
     * @param {Mixed} value
     * @param {Object} options
     */
    function handleField (name, value, options) {
      var serialized
      var length
      var key
      var i

      options = options || { attachment: false }

      if (is(name).a(Object)) {
        for (key in name) {
          if (Object.prototype.hasOwnProperty.call(name, key)) {
            handleField(key, name[key], options)
          }
        }
      } else {
        if (is(value).a(Array)) {
          for (i = 0, length = value.length; i < length; i++) {
            serialized = handleFieldValue(value[i])
            if (serialized) {
              $this.rawField(name, serialized, options)
            }
          }
        } else if (value != null) {
          $this.rawField(name, handleFieldValue(value), options)
        }
      }

      return $this
    }

    /**
     * Handles Multipart Value Processing
     *
     * @param {Mixed} value
     */
    function handleFieldValue (value) {
      if (!(value instanceof Buffer || typeof value === 'string')) {
        if (is(value).a(Object)) {
          if (value instanceof fs.FileReadStream) {
            return value
          } else {
            return Unirest.serializers.json(value)
          }
        } else {
          return value.toString()
        }
      } else return value
    }

    function setupOption (name, ref) {
      $this[name] = function (arg) {
        $this.options[ref || name] = arg
        return $this
      }
    }

    // Iterates over a list of option methods to generate the chaining
    // style of use you see in Superagent and jQuery.
    for (var x in Unirest.enum.options) {
      if (Object.prototype.hasOwnProperty.call(Unirest.enum.options, x)) {
        var option = Unirest.enum.options[x]
        var reference = null

        if (option.indexOf(':') > -1) {
          option = option.split(':')
          reference = option[1]
          option = option[0]
        }

        setupOption(option, reference)
      }
    }

    if (headers && typeof headers === 'function') {
      callback = headers
      headers = null
    } else if (body && typeof body === 'function') {
      callback = body
      body = null
    }

    if (headers) $this.set(headers)
    if (body) $this.send(body)

    return callback ? $this.end(callback) : $this
  }

  return uri ? unirest(uri, headers, body, callback) : unirest
}

/**
 * Expose the underlying layer.
 */
Unirest.request = require('request')
Unirest.cookie = Unirest.request.cookie
Unirest.pipe = Unirest.request.pipe

/**
 * Mime-type lookup / parser.
 *
 * @param  {String} type
 * @param  {Boolean} parse Should we parse?
 * @return {String}
 */
Unirest.type = function (type, parse) {
  if (typeof type !== 'string') return false
  return parse ? type.split(/ *; */).shift() : (Unirest.types[type] || type)
}

/**
 * Utility method to trim strings.
 *
 * @type {String}
 */
Unirest.trim = ''.trim
  ? function (s) { return s.trim() }
  : function (s) { return s.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '') }

/**
 * Parser methods for different data types.
 *
 * @type {Object}
 */
Unirest.parsers = {
  string: function (data) {
    var obj = {}
    var pairs = data.split('&')
    var parts
    var pair

    for (var i = 0, len = pairs.length; i < len; ++i) {
      pair = pairs[i]
      parts = pair.split('=')
      obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1])
    }

    return obj
  },

  json: function (data) {
    try {
      data = JSON.parse(data)
    } catch (e) {}

    return data
  }
}

/**
 * Serialization methods for different data types.
 *
 * @type {Object}
 */
Unirest.serializers = {
  form: function (obj) {
    return QueryString.stringify(obj)
  },

  json: function (obj) {
    return JSON.stringify(obj)
  }
}

/**
 * Unirest Request Utility Methods
 *
 * @type {Object}
 */
Unirest.Request = {
  serialize: function (string, type) {
    var serializer = Unirest.firstMatch(type, Unirest.enum.serialize)
    return serializer ? serializer(string) : string
  },

  uid: function (len) {
    var output = ''
    var chars = 'abcdefghijklmnopqrstuvwxyz123456789'
    var nchars = chars.length
    while (len--) output += chars[Math.random() * nchars | 0]
    return output
  }
}

/**
 * Unirest Response Utility Methods
 *
 * @type {Object}
 */
Unirest.Response = {
  parse: function (string, type) {
    var parser = Unirest.firstMatch(type, Unirest.enum.parse)
    return parser ? parser(string) : string
  },

  parseHeader: function (str) {
    var lines = str.split(/\r?\n/)
    var fields = {}
    var index
    var line
    var field
    var val

    // Trailing CRLF
    lines.pop()

    for (var i = 0, len = lines.length; i < len; ++i) {
      line = lines[i]
      index = line.indexOf(':')
      field = line.slice(0, index).toLowerCase()
      val = Unirest.trim(line.slice(index + 1))
      fields[field] = val
    }

    return fields
  },

  statusCodes: {
    'created': 201,
    'accepted': 202,
    'nonAuthoritativeInformation': 203,
    'noContent': 204,
    'resetContent': 205,
    'partialContent': 206,
    'multiStatus': 207,
    'alreadyReported': 208,
    'imUsed': 226,
    'multipleChoices': 300,
    'movedPermanently': 301,
    'found': 302,
    'seeOther': 303,
    'notModified': 304,
    'useProxy': 305,
    'temporaryRedirect': 307,
    'permanentRedirect': 308,
    'badRequest': 400,
    'unauthorized': 401,
    'paymentRequired': 402,
    'forbidden': 403,
    'notFound': 404,
    'methodNotAllowed': 405,
    'notAcceptable': 406,
    'proxyAuthenticationRequired': 407,
    'requestTimeout': 408,
    'conflict': 409,
    'gone': 410,
    'lengthRequired': 411,
    'preconditionFailed': 412,
    'requestEntityTooLarge': 413,
    'uriTooLong': 414,
    'unsupportedMediaType': 415,
    'rangeNotSatisfiable': 416,
    'expectationFailed': 417,
    'misdirectedRequest': 421,
    'unprocessableEntity': 422,
    'locked': 423,
    'failedDependency': 424,
    'upgradeRequired': 426,
    'preconditionRequired': 428,
    'tooManyRequests': 429,
    'requestHeaderFieldsTooLarge': 431,
    'internalServerError': 500,
    'notImplemented': 501,
    'badGateway': 502,
    'serviceUnavailable': 503,
    'gatewayTimeout': 504,
    'httpVersionNotSupported': 505,
    'variantAlsoNegotiates': 506,
    'insufficientStorage': 507,
    'loopDetected': 508,
    'notExtended': 510
  }
}

/**
 * Expose cookie store (tough-cookie)
 *
 * @return {Function} Cookie Store
 */
Unirest.jar = function (options) {
  var jar = Unirest.request.jar()
  options = options || {}

  // Because Requests aliases toughcookie rather than returning.
  if (options.store) {
    jar._jar.store = options.store
  }

  if (options.rejectPublicSuffixes) {
    jar._jar.rejectPublicSuffixes = options.rejectPublicSuffixes
  }

  // Alias helper methods
  jar.add = jar.setCookie
  jar.toString = jar.getCookieString

  // Export
  return jar
}

/**
 * Enum Structures
 *
 * @type {Object}
 */
Unirest.enum = {
  serialize: {
    'application/x-www-form-urlencoded': Unirest.serializers.form,
    'application/json': Unirest.serializers.json,
    '+json': Unirest.serializers.json
  },

  parse: {
    'application/x-www-form-urlencoded': Unirest.parsers.string,
    'application/json': Unirest.parsers.json,
    '+json': Unirest.parsers.json
  },

  methods: [
    'GET',
    'HEAD',
    'PUT',
    'POST',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  options: [
    'uri:url', 'redirects:maxRedirects', 'redirect:followRedirect', 'url', 'method', 'qs', 'form', 'json', 'multipart',
    'followRedirect', 'followAllRedirects', 'maxRedirects', 'encoding', 'pool', 'timeout', 'proxy', 'oauth', 'hawk', 'time',
    'ssl:strictSSL', 'strictSSL', 'jar', 'cookies:jar', 'aws', 'httpSignature', 'localAddress', 'ip:localAddress', 'secureProtocol', 'forever'
  ]
}

/**
 * Returns a list of values obtained by checking the specified string
 * whether it contains array value or object key, when true the value
 * is appended to the list to be returned.
 *
 * @param  {String} string String to be tested
 * @param  {Object|Array} map    Values / Keys to test against string.
 * @return {Array} List of values truthfully matched against string.
 */
Unirest.matches = function matches (string, map) {
  var results = []

  for (var key in map) {
    if (typeof map.length !== 'undefined') {
      key = map[key]
    }

    if (string.indexOf(key) !== -1) {
      results.push(map[key])
    }
  }

  return results
}

/**
 * Returns the first value obtained through #matches
 *
 * @see #matches
 * @param  {String} string String to be tested
 * @param  {Object|Array} map Values / Keys to test against string.
 * @return {Mixed} First match value
 */
Unirest.firstMatch = function firstMatch (string, map) {
  return Unirest.matches(string, map)[0]
}

/**
 * Generate sugar for request library.
 *
 * This allows us to mock super-agent chaining style while using request library under the hood.
 */
function setupMethod (method) {
  Unirest[method] = Unirest(method)
}

for (var i = 0; i < Unirest.enum.methods.length; i++) {
  var method = Unirest.enum.methods[i].toLowerCase()
  setupMethod(method)
}

/**
 * Simple Utility Methods for checking information about a value.
 *
 * @param  {Mixed}  value  Could be anything.
 * @return {Object}
 */
function is (value) {
  return {
    a: function (check) {
      if (check.prototype) check = check.prototype.constructor.name
      var type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase()
      return value != null && type === check.toLowerCase()
    }
  }
}

/**
 * Simple Utility Methods for checking information about a value.
 *
 * @param  {Mixed}  value  Could be anything.
 * @return {Object}
 */
function does (value) {
  var arrayIndexOf = (Array.indexOf ? function (arr, obj, from) {
    return arr.indexOf(obj, from)
  } : function (arr, obj, from) {
    var l = arr.length
    var i = from ? parseInt((1 * from) + (from < 0 ? l : 0), 10) : 0
    i = i < 0 ? 0 : i
    for (; i < l; i++) if (i in arr && arr[i] === obj) return i
    return -1
  })

  return {
    startWith: function (string) {
      if (is(value).a(String)) return value.slice(0, string.length) === string
      if (is(value).a(Array)) return value[0] === string
      return false
    },

    endWith: function (string) {
      if (is(value).a(String)) return value.slice(-string.length) === string
      if (is(value).a(Array)) return value[value.length - 1] === string
      return false
    },

    contain: function (field) {
      if (is(value).a(String)) return value.indexOf(field) > -1
      if (is(value).a(Object)) return Object.prototype.hasOwnProperty.call(value, field)
      if (is(value).a(Array)) return !!~arrayIndexOf(value, field)
      return false
    }
  }
}

/**
 * Expose the Unirest Container
 */

module.exports = exports = Unirest
