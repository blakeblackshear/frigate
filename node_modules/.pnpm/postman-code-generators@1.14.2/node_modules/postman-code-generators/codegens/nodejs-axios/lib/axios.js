const _ = require('lodash'),
  parseRequest = require('./parseRequest'),
  sanitize = require('./util').sanitize,
  sanitizeOptions = require('./util').sanitizeOptions,
  addFormParam = require('./util').addFormParam;

/**
 * returns snippet of nodejs(axios) by parsing data from Postman-SDK request object
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation required for code snippet
 * @param {Object} options
 * @returns {String} - nodejs(axios) code snippet for given request object
 */
function makeSnippet (request, indentString, options) {

  let snippet = 'const',
    configArray = [],
    dataSnippet = '',
    body,
    headers;

  snippet += ' axios = require(\'axios\');\n';
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

  body = request.body && request.body.toJSON();

  dataSnippet = !_.isEmpty(body) ? parseRequest.parseBody(body,
    options.trimRequestBody,
    indentString,
    request.headers.get('Content-Type')) : '';
  snippet += dataSnippet + '\n';

  configArray.push(indentString + `method: '${request.method.toLowerCase()}'`);
  configArray.push(indentString + 'maxBodyLength: Infinity');
  configArray.push(indentString + `url: '${sanitize(request.url.toString())}'`);

  headers = parseRequest.parseHeader(request, indentString);
  // https://github.com/axios/axios/issues/789#issuecomment-577177492
  if (!_.isEmpty(body) && body.formdata) {
    // we can assume that data object is filled up
    headers.push(`${indentString.repeat(2)}...data.getHeaders()`);
  }
  let headerSnippet = indentString + 'headers: { ';
  if (headers.length > 0) {
    headerSnippet += '\n';
    headerSnippet += headers.join(', \n') + '\n';
    headerSnippet += indentString + '}';
  }
  else {
    headerSnippet += '}';
  }

  configArray.push(headerSnippet);

  if (options.requestTimeout) {
    configArray.push(indentString + `timeout: ${options.requestTimeout}`);
  }
  if (_.get(request, 'protocolProfileBehavior.followRedirects', options.followRedirect) === false) {
    // setting the maxRedirects to 0 will disable any redirects.
    // by default, maxRedirects are set to 5
    configArray.push(indentString + 'maxRedirects: 0');
  }
  if (dataSnippet !== '') {
    // although just data is enough, whatever :shrug:
    configArray.push(indentString + 'data : data');
  }

  snippet += 'let config = {\n';
  snippet += configArray.join(',\n') + '\n';
  snippet += '};\n\n';

  if (options.asyncAwaitEnabled) {
    snippet += 'async function makeRequest() {\n';
    snippet += indentString + 'try {\n';
    snippet += indentString.repeat(2) + 'const response = await axios.request(config);\n';
    snippet += indentString.repeat(2) + 'console.log(JSON.stringify(response.data));\n';
    snippet += indentString + '}\n';
    snippet += indentString + 'catch (error) {\n';
    snippet += indentString.repeat(2) + 'console.log(error);\n';
    snippet += indentString + '}\n';
    snippet += '}\n\n';
    snippet += 'makeRequest();\n';
  }
  else {
    snippet += 'axios.request(config)\n';
    snippet += '.then((response) => {\n';
    snippet += indentString + 'console.log(JSON.stringify(response.data));\n';
    snippet += '})\n';
    snippet += '.catch((error) => {\n';
    snippet += indentString + 'console.log(error);\n';
    snippet += '});\n';
  }

  return snippet;
}

/**
 * Used to get the options specific to this codegen
 *
 * @returns {Array} - Returns an array of option objects
 */
function getOptions () {
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
    },
    {
      name: 'Use async/await',
      id: 'asyncAwaitEnabled',
      type: 'boolean',
      default: false,
      description: 'Modifies code snippet to use async/await'
    }
  ];
}


/**
 * Converts Postman sdk request object to nodejs axios code snippet
 *
 * @param {Object} request - postman-SDK request object
 * @param {Object} options
 * @param {String} options.indentType - type for indentation eg: Space, Tab
 * @param {String} options.indentCount - number of spaces or tabs for indentation.
 * @param {Boolean} options.followRedirect - whether to enable followredirect
 * @param {Boolean} options.trimRequestBody - whether to trim fields in request body or not
 * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
 * @param {Function} callback - callback function with parameters (error, snippet)
 */
function convert (request, options, callback) {
  if (!_.isFunction(callback)) {
    throw new Error('NodeJS-Axios-Converter: callback is not valid function');
  }
  options = sanitizeOptions(options, getOptions());

  //  String representing value of indentation required
  let indentString;

  indentString = options.indentType === 'Tab' ? '\t' : ' ';
  indentString = indentString.repeat(options.indentCount);

  return callback(null, makeSnippet(request, indentString, options));
}

module.exports = {
  convert: convert,
  getOptions: getOptions
};
