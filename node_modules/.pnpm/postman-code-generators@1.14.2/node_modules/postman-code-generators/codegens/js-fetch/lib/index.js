var _ = require('./lodash'),
  sanitize = require('./util').sanitize,
  sanitizeOptions = require('./util').sanitizeOptions,
  addFormParam = require('./util').addFormParam,
  path = require('path');
const VALID_BODY_MODES = ['urlencoded', 'raw', 'graphql', 'file', 'formdata'];

/**
 * Adds mode of redirection in fetch.
 *
 * @param {boolean} redirect to determine whether to follow redirects or not.
 */
function redirectMode (redirect) {
  if (redirect) {
    return 'follow';
  }
  return 'manual';
}

/**
 * Parses URLEncoded body from request to fetch syntax
 *
 * @param {Object} body URLEncoded Body
 * @param {boolean} trim trim body option
 */
function parseURLEncodedBody (body, trim) {
  var bodySnippet = 'const urlencoded = new URLSearchParams();\n';
  _.forEach(body, function (data) {
    if (!data.disabled) {
      bodySnippet += `urlencoded.append("${sanitize(data.key, trim)}", "${sanitize(data.value, trim)}");\n`;
    }
  });
  return bodySnippet;
}

/**
 * Parses Formdata from request to fetch syntax
 *
 * @param {Object} body FormData body
 * @param {boolean} trim trim body option
 */
function parseFormData (body, trim) {
  var bodySnippet = 'const formdata = new FormData();\n';
  _.forEach(body, function (data) {
    if (!data.disabled) {
      if (data.type === 'file') {
        var pathArray = data.src.split(path.sep),
          fileName = pathArray[pathArray.length - 1];
        bodySnippet += `formdata.append("${sanitize(data.key, trim)}", fileInput.files[0], "${fileName}");\n`;
      }
      else {
        bodySnippet += `formdata.append("${sanitize(data.key, trim)}", "${sanitize(data.value, trim)}");\n`;
      }
    }
  });
  return bodySnippet;
}

/**
 * Parses Raw data to fetch syntax
 *
 * @param {Object} body Raw body data
 * @param {boolean} trim trim body option
 * @param {String} contentType Content type of the body being sent
 * @param {String} indentString Indentation string
 */
function parseRawBody (body, trim, contentType, indentString) {
  var bodySnippet = 'const raw = ';
  // Match any application type whose underlying structure is json
  // For example application/vnd.api+json
  // All of them have +json as suffix
  if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
    try {
      let jsonBody = JSON.parse(body);
      bodySnippet += `JSON.stringify(${JSON.stringify(jsonBody, null, indentString.length)});\n`;
    }
    catch (error) {
      bodySnippet += `"${sanitize(body.toString(), trim)}";\n`;
    }
  }
  else {
    bodySnippet += `"${sanitize(body.toString(), trim)}";\n`;
  }
  return bodySnippet;
}

/**
 * Parses graphql data to fetch syntax
 *
 * @param {Object} body graphql body data
 * @param {boolean} trim trim body option
 * @param {String} indentString indentation to be added to the snippet
 */
function parseGraphQL (body, trim, indentString) {
  let query = body.query,
    graphqlVariables,
    bodySnippet;
  try {
    graphqlVariables = JSON.parse(body.variables);
  }
  catch (e) {
    graphqlVariables = {};
  }
  bodySnippet = 'const graphql = JSON.stringify({\n';
  bodySnippet += `${indentString}query: "${sanitize(query, trim)}",\n`;
  bodySnippet += `${indentString}variables: ${JSON.stringify(graphqlVariables)}\n})`;
  return bodySnippet;
}


/* istanbul ignore next */
/**
 * parses binamry file data
 */
function parseFileData () {
  var bodySnippet = 'const file = "<file contents here>";\n';
  return bodySnippet;
}

/**
 * Parses Body from the Request
 *
 * @param {Object} body body object from request.
 * @param {boolean} trim trim body option
 * @param {String} indentString indentation to be added to the snippet
 * @param {String} contentType Content type of the body being sent
 */
function parseBody (body, trim, indentString, contentType) {
  if (!_.isEmpty(body)) {
    switch (body.mode) {
      case 'urlencoded':
        return parseURLEncodedBody(body.urlencoded, trim);
      case 'raw':
        return parseRawBody(body.raw, trim, contentType, indentString);
      case 'graphql':
        return parseGraphQL(body.graphql, trim, indentString);
      case 'formdata':
        return parseFormData(body.formdata, trim);
        /* istanbul ignore next */
      case 'file':
        return parseFileData(body.file, trim);
      default:
        return parseRawBody(body[body.mode], trim);
    }
  }
  return '';
}

/**
 * Parses headers from the request.
 *
 * @param {Object} headers headers from the request.
 */
function parseHeaders (headers) {
  var headerSnippet = '';
  if (!_.isEmpty(headers)) {
    headerSnippet = 'const myHeaders = new Headers();\n';
    headers = _.reject(headers, 'disabled');
    _.forEach(headers, function (header) {
      headerSnippet += `myHeaders.append("${sanitize(header.key, true)}", "${sanitize(header.value)}");\n`;
    });
  }
  else {
    headerSnippet = '';
  }
  return headerSnippet;
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
* Converts Postman sdk request object to js-fetch request code snippet
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
    throw new Error('JS-Fetch Converter callback is not a valid function');
  }
  options = sanitizeOptions(options, getOptions());

  var indent = options.indentType === 'Tab' ? '\t' : ' ',
    trim = options.trimRequestBody,
    headers, body,
    codeSnippet = '',
    headerSnippet = '',
    bodySnippet = '',
    optionsSnippet = '',
    fetchSnippet = '';
  indent = indent.repeat(options.indentCount);
  if (request.body && request.body.mode === 'graphql' && !request.headers.has('Content-Type')) {
    request.addHeader({
      key: 'Content-Type',
      value: 'application/json'
    });
  }
  headers = request.toJSON().header;
  headerSnippet = parseHeaders(headers);

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
  bodySnippet = parseBody(body, trim, indent, request.headers.get('Content-Type'));

  if (options.requestTimeout > 0) {
    codeSnippet += 'const controller = new AbortController();\n';
    codeSnippet += `const timerId = setTimeout(() => controller.abort(), ${options.requestTimeout});\n`;
  }
  optionsSnippet = `const requestOptions = {\n${indent}`;
  optionsSnippet += `method: "${request.method}",\n${indent}`;
  if (headerSnippet !== '') {
    optionsSnippet += `headers: myHeaders,\n${indent}`;
    codeSnippet += headerSnippet + '\n';
  }
  if (bodySnippet !== '') {
    if (!_.includes(VALID_BODY_MODES, body.mode)) { body.mode = 'raw'; }
    optionsSnippet += `body: ${body.mode},\n${indent}`;
    codeSnippet += bodySnippet + '\n';
  }
  if (options.requestTimeout > 0) {
    optionsSnippet += `signal: controller.signal,\n${indent}`;
  }
  optionsSnippet += `redirect: "${redirectMode(options.followRedirect)}"\n};\n`;

  codeSnippet += optionsSnippet + '\n';

  if (options.asyncAwaitEnabled) {
    fetchSnippet += `try {\n${indent}`;
    fetchSnippet += `const response = await fetch("${sanitize(request.url.toString())}", requestOptions);\n${indent}`;
    fetchSnippet += `const result = await response.text();\n${indent}`;
    fetchSnippet += 'console.log(result)\n';
    fetchSnippet += `} catch (error) {\n${indent}`;
    fetchSnippet += 'console.error(error);\n';
    if (options.requestTimeout > 0) {
      fetchSnippet += `} finally {\n${indent}`;
      fetchSnippet += 'clearTimeout(timerId);\n';
    }
    fetchSnippet += '};';
  }
  else {
    fetchSnippet = `fetch("${sanitize(request.url.toString())}", requestOptions)\n${indent}`;
    fetchSnippet += `.then((response) => response.text())\n${indent}`;
    fetchSnippet += `.then((result) => console.log(result))\n${indent}`;
    fetchSnippet += '.catch((error) => console.error(error))';
    if (options.requestTimeout > 0) {
      fetchSnippet += `\n${indent}.finally(() => clearTimeout(timerId))`;
    }
    fetchSnippet += ';';
  }

  codeSnippet += fetchSnippet;

  callback(null, codeSnippet);
}

module.exports = {
  convert: convert,
  getOptions: getOptions
};
