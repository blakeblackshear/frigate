var _ = require('./lodash'),
  parseBody = require('./util/parseBody'),
  sanitize = require('./util/sanitize').sanitize,
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  addFormParam = require('./util/sanitize').addFormParam,
  self;

/**
 * Used to parse the request headers
 *
 * @param  {Object} headers - postman SDK-request object
 * @returns {String} - request headers in the desired format
 */
function parseHeaders (headers) {
  var headerSnippet = '';
  if (!_.isEmpty(headers)) {
    _.forEach(headers, function (value, key) {
      if (Array.isArray(value)) {
        var headerValues = [];
        _.forEach(value, (singleValue) => {
          headerValues.push(`"${sanitize(singleValue, 'header')}"`);
        });
        headerSnippet += `request["${sanitize(key, 'header', true)}"] = [${headerValues.join(', ')}]\n`;
      }
      else {
        headerSnippet += `request["${sanitize(key, 'header', true)}"] = "${sanitize(value, 'header')}"\n`;
      }
    });
  }
  return headerSnippet;
}

self = module.exports = {
  /**
     * Used to return options which are specific to a particular plugin
     *
     * @returns {Array}
     */
  getOptions: function () {
    return [{
      name: 'Set indentation count',
      id: 'indentCount',
      type: 'positiveInteger',
      default: 2,
      description: 'Set the number of indentation characters to add per code level'
    },
    {
      name: 'Set indentation type',
      id: 'indentType',
      type: 'enum',
      availableOptions: ['Tab', 'Space'],
      default: 'Space',
      description: 'Select the character used to indent lines of code'
    },
    {
      name: 'Set request timeout',
      id: 'requestTimeout',
      type: 'positiveInteger',
      default: 0,
      description: 'Set number of milliseconds the request should wait for a response' +
    ' before timing out (use 0 for infinity)'
    },
    {
      name: 'Follow redirects',
      id: 'followRedirect',
      type: 'boolean',
      default: true,
      description: 'Automatically follow HTTP redirects'
    },
    {
      name: 'Trim request body fields',
      id: 'trimRequestBody',
      type: 'boolean',
      default: false,
      description: 'Remove white space and additional lines that may affect the server\'s response'
    }];
  },

  /**
    * Used to convert the postman sdk-request object in ruby request snippet
    *
    * @param  {Object} request - postman SDK-request object
    * @param  {Object} options
    * @param  {String} options.indentType - type of indentation eg: Space / Tab (default: Space)
    * @param  {Number} options.indentCount - frequency of indent (default: 4 for indentType: Space,
                                                                    default: 1 for indentType: Tab)
    * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
                                                (default: 0 -> never bail out)
    * @param {Boolean} options.trimRequestBody : whether to trim request body fields (default: false)
    * @param {Boolean} options.followRedirect : whether to allow redirects of a request
    * @param  {Function} callback - function with parameters (error, snippet)
    */
  convert: function (request, options, callback) {
    var snippet = '',
      indentation = '',
      identity = '',
      headerSnippet = '',
      methods = ['GET', 'POST', 'HEAD', 'DELETE', 'PATCH', 'PROPFIND',
        'PROPPATCH', 'PUT', 'OPTIONS', 'COPY', 'LOCK', 'UNLOCK', 'MOVE', 'TRACE'],
      contentType;

    if (_.isFunction(options)) {
      callback = options;
      options = null;
    }
    else if (!_.isFunction(callback)) {
      throw new Error('Ruby~convert: Callback is not a function');
    }
    options = sanitizeOptions(options, self.getOptions());

    identity = options.indentType === 'Tab' ? '\t' : ' ';
    indentation = identity.repeat(options.indentCount);
    // concatenation and making up the final string
    snippet = 'require "uri"\n';

    contentType = request.headers.get('Content-Type');
    // If contentType is json then include the json module for later use
    if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
      snippet += 'require "json"\n';
    }

    snippet += 'require "net/http"\n\n';
    if (!_.includes(methods, request.method)) {
      snippet += `class Net::HTTP::${_.capitalize(request.method)} < Net::HTTPRequest\n`;
      snippet += `${indentation}METHOD = "${request.method}"\n`;
      snippet += `${indentation}REQUEST_HAS_BODY = ${!_.isEmpty(request.body)}\n`;
      snippet += `${indentation}RESPONSE_HAS_BODY = true\n`;
      snippet += 'end\n\n';
    }
    snippet += `url = URI("${sanitize(request.url.toString(), 'url')}")\n\n`;
    if (sanitize(request.url.toString(), 'url').startsWith('https')) {
      snippet += 'https = Net::HTTP.new(url.host, url.port)\n';
      snippet += 'https.use_ssl = true\n\n';
      if (options.requestTimeout) {
        snippet += `https.read_timeout = ${Math.ceil(options.requestTimeout / 1000)}\n`;
      }
      snippet += `request = Net::HTTP::${_.capitalize(request.method)}.new(url)\n`;
      if (request.body && !request.headers.has('Content-Type')) {
        if (request.body.mode === 'file') {
          request.addHeader({
            key: 'Content-Type',
            value: 'text/plain'
          });
        }
        else if (request.body.mode === 'graphql') {
          request.addHeader({
            key: 'Content-Type',
            value: 'application/json'
          });
        }
      }
      headerSnippet = parseHeaders(request.getHeaders({enabled: true}));
      if (headerSnippet !== '') {
        snippet += headerSnippet;
      }

      // The following code handles multiple files in the same formdata param.
      // It removes the form data params where the src property is an array of filepath strings
      // Splits that array into different form data params with src set as a single filepath string
      if (request.body && request.body.mode === 'formdata') {
        let formdata = request.body.formdata,
          formdataArray = [];
        formdata.members.forEach((param) => {
          let key = param.key,
            type = param.type,
            disabled = param.disabled,
            contentType = param.contentType;
            // check if type is file or text
          if (type === 'file') {
            // if src is not of type string we check for array(multiple files)
            if (typeof param.src !== 'string') {
              // if src is an array(not empty), iterate over it and add files as separate form fields
              if (Array.isArray(param.src) && param.src.length) {
                param.src.forEach((filePath) => {
                  addFormParam(formdataArray, key, param.type, filePath, disabled, contentType);
                });
              }
              // if src is not an array or string, or is an empty array, add a placeholder for file path(no files case)
              else {
                addFormParam(formdataArray, key, param.type, '/path/to/file', disabled, contentType);
              }
            }
            // if src is string, directly add the param with src as filepath
            else {
              addFormParam(formdataArray, key, param.type, param.src, disabled, contentType);
            }
          }
          // if type is text, directly add it to formdata array
          else {
            addFormParam(formdataArray, key, param.type, param.value, disabled, contentType);
          }
        });
        request.body.update({
          mode: 'formdata',
          formdata: formdataArray
        });
      }
      snippet += `${parseBody(request.toJSON(), options.trimRequestBody, contentType, options.indentCount)}\n`;
      snippet += 'response = https.request(request)\n';
      snippet += 'puts response.read_body\n';
    }
    else {
      snippet += 'http = Net::HTTP.new(url.host, url.port);\n';
      if (options.requestTimeout) {
        snippet += `http.read_timeout = ${Math.ceil(options.requestTimeout / 1000)}\n`;
      }
      snippet += `request = Net::HTTP::${_.capitalize(request.method)}.new(url)\n`;
      if (request.body && !request.headers.has('Content-Type')) {
        if (request.body.mode === 'file') {
          request.addHeader({
            key: 'Content-Type',
            value: 'text/plain'
          });
        }
        else if (request.body.mode === 'graphql') {
          request.addHeader({
            key: 'Content-Type',
            value: 'application/json'
          });
        }
      }
      headerSnippet = parseHeaders(request.getHeaders({enabled: true}));

      if (headerSnippet !== '') {
        snippet += headerSnippet;
      }
      snippet += `${parseBody(request.toJSON(), options.trimRequestBody, contentType, options.indentCount)}\n`;
      snippet += 'response = http.request(request)\n';
      snippet += 'puts response.read_body\n';
    }

    return callback(null, snippet);
  }
};
