var _ = require('./lodash'),
  parseBody = require('./util/parseBody'),
  sanitize = require('./util/sanitize').sanitize,
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  self;

/**
 * Used to parse the request headers
 *
 * @param  {Object} request - postman SDK-request object
 * @param  {String} indentation - used for indenting snippet's structure
 * @returns {String} - request headers in the desired format
 */
function getHeaders (request, indentation) {
  var headerArray = request.toJSON().header,
    headerMap;

  if (!_.isEmpty(headerArray)) {
    headerArray = _.reject(headerArray, 'disabled');
    headerMap = _.map(headerArray, function (header) {
      return `${indentation}--header '${sanitize(header.key, 'header', true)}: ` +
            `${sanitize(header.value, 'header')}' \\`;
    });
    return headerMap.join('\n');
  }
  return `${indentation}--header '' \\`;
}

self = module.exports = {
  /**
     * Used to return options which are specific to a particular plugin
     *
     * @module getOptions
     *
     * @returns {Array}
     */
  getOptions: function () {
    // options can be added for this for no certificate check and silent so no output is logged.
    // Also, place where to log the output if required.
    return [
      {
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
      }
    ];
  },

  /**
    * Used to convert the postman sdk-request object in php-curl reuqest snippet
    *
    * @module convert
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
      isFormDataFile = false;

    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }
    else if (!_.isFunction(callback)) {
      throw new Error('Shell-wget~convert: Callback is not a function');
    }

    options = sanitizeOptions(options, self.getOptions());

    identity = options.indentType === 'Tab' ? '\t' : ' ';
    indentation = identity.repeat(options.indentCount);
    // concatenation and making up the final string

    if (request.body && request.body.mode === 'formdata') {
      _.forEach(request.body.toJSON().formdata, (data) => {
        if (!data.disabled && data.type === 'file') {
          isFormDataFile = true;
        }
      });
    }
    if (isFormDataFile) {
      snippet = '# wget doesn\'t support file upload via form data, use curl -F \\\n';
    }
    snippet += 'wget --no-check-certificate --quiet \\\n';
    snippet += `${indentation}--method ${request.method} \\\n`;
    // console.log(getHeaders(request, indentation));
    // Shell-wget accepts timeout in seconds (conversion from milli-seconds to seconds)
    if (options.requestTimeout > 0) {
      snippet += `${indentation}--timeout=${Math.floor(options.requestTimeout / 1000)} \\\n`;
    }
    else {
      snippet += `${indentation}--timeout=0 \\\n`;
    }
    // Shell-wget supports 20 redirects by default (without any specific options)
    if (typeof options.followRedirect === 'boolean' && !options.followRedirect) {
      snippet += `${indentation}--max-redirect=0 \\\n`;
    }
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
    snippet += `${getHeaders(request, indentation)}\n`;
    snippet += `${parseBody(request.toJSON(), options.trimRequestBody, indentation)}`;
    snippet += `${indentation} '${sanitize(request.url.toString(), 'url')}'`;

    return callback(null, snippet);
  }
};
