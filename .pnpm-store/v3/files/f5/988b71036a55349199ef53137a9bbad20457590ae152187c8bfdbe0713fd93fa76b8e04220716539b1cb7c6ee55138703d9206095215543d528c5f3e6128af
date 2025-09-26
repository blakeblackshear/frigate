var _ = require('./lodash'),
  parseBody = require('./util/parseBody'),
  sanitize = require('./util/sanitize').sanitize,
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  addFormParam = require('./util/sanitize').addFormParam,
  self;

/**
 * Used to get the headers and put them in the desired form of the language
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
      return `${indentation}'${sanitize(header.key, true)}' => ` +
            `'${sanitize(header.value)}'`;
    });
    return `$request->setHeaders(array(\n${headerMap.join(',\n')}\n));`;
  }
  return '';
}


self = module.exports = {
  /**
     * @returns {Array} plugin specific options
     */
  getOptions: function () {
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
        default: 'Space',
        availableOptions: ['Tab', 'Space'],
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
        name: 'Trim request body fields',
        id: 'trimRequestBody',
        type: 'boolean',
        default: false,
        description: 'Remove white space and additional lines that may affect the server\'s response'
      },
      {
        name: 'Follow redirects',
        id: 'followRedirect',
        type: 'boolean',
        default: true,
        description: 'Automatically follow HTTP redirects'
      }
    ];
  },

  /**
     * @param  {Object} request - postman SDK-request object
     * @param  {Object} options
     * @param  {String} options.indentType - type of indentation eg: spaces/Tab (default: Space)
     * @param  {String} options.indentCount - frequency of indent (default: 4 for indentType: Space,
     *                                                               default: 2 for indentType: Tab)
     * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
                                                (default: 0 -> never bail out)
     * @param {Boolean} options.trimRequestBody : whether to trim request body fields (default: false)
     * @param {Boolean} options.followRedirect : whether to allow redirects of a request
     * @param  {Function} callback - function with parameters (error, snippet)
     */
  convert: function (request, options, callback) {
    var snippet = '',
      indentation = '',
      identity = '';

    if (_.isFunction(options)) {
      callback = options;
    }
    else if (!_.isFunction(callback)) {
      throw new Error('Php-Pecl(HTTP)~convert: Callback is not a function');
    }
    options = sanitizeOptions(options, self.getOptions());

    identity = options.indentType === 'Tab' ? '\t' : ' ';
    indentation = identity.repeat(options.indentCount);

    snippet = '<?php\n';
    snippet += '$client = new http\\Client;\n';
    snippet += '$request = new http\\Client\\Request;\n';
    snippet += `$request->setRequestUrl('${sanitize(request.url.toString())}');\n`;
    snippet += `$request->setRequestMethod('${request.method}');\n`;
    if (!_.isEmpty(request.body)) {

      // The following code handles multiple files in the same formdata param.
      // It removes the form data params where the src property is an array of filepath strings
      // Splits that array into different form data params with src set as a single filepath string
      if (request.body.mode === 'formdata') {
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
      snippet += '$body = new http\\Message\\Body;\n';
      snippet += `${parseBody(request.toJSON(), indentation, options.trimRequestBody)}`;
      snippet += '$request->setBody($body);\n';
    }
    snippet += '$request->setOptions(array(';
    snippet += options.requestTimeout === 0 ? '' : `'connecttimeout' => ${options.requestTimeout}`;
    snippet += options.followRedirect ? '' : ', \'redirect\' => false';
    snippet += '));\n';
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
    snippet += '$client->enqueue($request)->send();\n';
    snippet += '$response = $client->getResponse();\n';
    snippet += 'echo $response->getBody();\n';

    return callback(null, snippet);
  }
};
