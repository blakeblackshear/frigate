var _ = require('./lodash'),
  parseBody = require('./util/parseBody'),
  sanitize = require('./util/sanitize').sanitize,
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  addFormParam = require('./util/sanitize').addFormParam,
  self;
const ALLOWED_METOHDS = [ 'OPTIONS', 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT'];

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
      return `${indentation}'${sanitize(header.key)}' => ` +
            `'${sanitize(header.value)}'`;
    });
    return `$request->setHeader(array(\n${headerMap.join(',\n')}\n));\n`;
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
  convert: function (request, options, callback) {
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }
    if (!_.isFunction(callback)) {
      throw new Error('PHP-HttpRequest2-Converter: callback is not valid function');
    }
    options = sanitizeOptions(options, self.getOptions());

    var snippet, indentString;
    indentString = options.indentType === 'Tab' ? '\t' : ' ';
    indentString = indentString.repeat(options.indentCount);

    snippet = '<?php\n';
    snippet += 'require_once \'HTTP/Request2.php\';\n';
    snippet += '$request = new HTTP_Request2();\n';
    snippet += `$request->setUrl('${sanitize(request.url.toString())}');\n`;
    snippet += '$request->setMethod(';
    if (ALLOWED_METOHDS.includes(request.method)) {
      snippet += `HTTP_Request2::METHOD_${request.method});\n`;
    }
    else {
      snippet += `'${request.method}');\n`;
    }

    if (options.requestTimeout !== 0 || options.followRedirect) {
      let configArray = [];

      // PHP-HTTP_Request2 method accepts timeout in seconds and it must be an integer
      if (options.requestTimeout !== 0 && Number.isInteger(options.requestTimeout / 1000)) {
        let requestTimeout = options.requestTimeout;
        requestTimeout /= 1000;
        configArray.push(`${indentString}'timeout' => ${requestTimeout}`);
      }
      if (options.followRedirect) {
        configArray.push(`${indentString}'follow_redirects' => TRUE`);
      }
      if (configArray.length) {
        snippet += '$request->setConfig(array(\n';
        snippet += configArray.join(',\n') + '\n';
      }
      snippet += '));\n';
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
    // add the headers to snippet
    snippet += getHeaders(request, indentString);

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
    // add the body to snippet
    if (!_.isEmpty(request.body)) {
      snippet += `${parseBody(request.toJSON(), indentString, options.trimRequestBody)}`;
    }
    snippet += 'try {\n';
    snippet += `${indentString}$response = $request->send();\n`;
    snippet += `${indentString}if ($response->getStatus() == 200) {\n`;
    snippet += `${indentString.repeat(2)}echo $response->getBody();\n`;
    snippet += `${indentString}}\n${indentString}else {\n`;
    snippet += `${indentString.repeat(2)}echo 'Unexpected HTTP status: ' . $response->getStatus() . ' ' .\n`;
    snippet += `${indentString.repeat(2)}$response->getReasonPhrase();\n`;
    snippet += `${indentString}}\n`;
    snippet += '}\ncatch(HTTP_Request2_Exception $e) {\n';
    snippet += `${indentString}echo 'Error: ' . $e->getMessage();\n}`;
    return callback(null, snippet);
  }
};
