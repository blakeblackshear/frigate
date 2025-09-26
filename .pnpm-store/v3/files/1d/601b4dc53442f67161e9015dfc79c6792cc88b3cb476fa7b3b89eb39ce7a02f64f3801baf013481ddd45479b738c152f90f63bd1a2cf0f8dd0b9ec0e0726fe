var _ = require('./lodash'),
  sanitize = require('./util').sanitize,
  sanitizeOptions = require('./util').sanitizeOptions,
  addFormParam = require('./util').addFormParam,
  getUrlStringfromUrlObject = require('./util').getUrlStringfromUrlObject,
  path = require('path');

/**
 * Parses URLEncoded body from request
 *
 * @param {*} body URLEncoded Body
 */
function parseURLEncodedBody (body) {
  var payload = [],
    bodySnippet;
  _.forEach(body, function (data) {
    if (!data.disabled) {
      payload.push(`${encodeURIComponent(data.key)}=${encodeURIComponent(data.value)}`);
    }
  });
  bodySnippet = `var data = "${payload.join('&')}";\n`;
  return bodySnippet;
}

/**
 * Parses Raw data
 *
 * @param {*} body Raw body data
 * @param {*} trim trim body option
 * @param {String} contentType Content type of the body being sent
 * @param {String} indentString Indentation string
 */
function parseRawBody (body, trim, contentType, indentString) {
  var bodySnippet = 'var data = ';
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
 * Parses graphql data
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
  bodySnippet = 'var data = JSON.stringify({\n';
  bodySnippet += `${indentString}query: "${sanitize(query, trim)}",\n`;
  bodySnippet += `${indentString}variables: ${JSON.stringify(graphqlVariables)}\n`;
  bodySnippet += '});\n';
  return bodySnippet;
}

/**
 * Parses formData body from request
 *
 * @param {*} body formData Body
 * @param {*} trim trim body option
 */
function parseFormData (body, trim) {
  var bodySnippet = 'var data = new FormData();\n';
  _.forEach(body, (data) => {
    if (!(data.disabled)) {
      /* istanbul ignore next */
      /* ignoring because the file src is not stored in postman collection" */
      if (data.type === 'file') {
        var pathArray = data.src.split(path.sep),
          fileName = pathArray[pathArray.length - 1];
        bodySnippet += `data.append("${sanitize(data.key, trim)}", fileInput.files[0], "${fileName}");\n `;
      }
      else {
        bodySnippet += `data.append("${sanitize(data.key, trim)}", "${sanitize(data.value, trim)}");\n`;
      }
    }
  });
  return bodySnippet;
}

/* istanbul ignore next */
/* ignoring because source of file is not stored in postman collection */
/**
 * Parses file body from the Request
 *
 */
function parseFile () {
  // var bodySnippet = 'var data = new FormData();\n';
  // bodySnippet += `data.append("${sanitize(body.key, trim)}", "${sanitize(body.src, trim)}", `;
  // bodySnippet += `"${sanitize(body.key, trim)}");\n`;
  var bodySnippet = 'var data = "<file contents here>";\n';
  return bodySnippet;
}

/**
 * Parses Body from the Request
 *
 * @param {*} body body object from request.
 * @param {*} trim trim body option
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
      case 'file':
        return parseFile(body.file, trim);
      default:
        return 'var data = null;\n';
    }
  }
  return 'var data = null;\n';
}

/**
 * Parses headers from the request.
 *
 * @param {Object} headers headers from the request.
 */
function parseHeaders (headers) {
  var headerSnippet = '';
  if (!_.isEmpty(headers)) {
    headers = _.reject(headers, 'disabled');
    _.forEach(headers, function (header) {
      if (_.capitalize(header.key) === 'Cookie') {
        headerSnippet += '// WARNING: Cookies will be stripped away by the browser before sending the request.\n';
      }
      headerSnippet += `xhr.setRequestHeader("${sanitize(header.key, true)}", "${sanitize(header.value)}");\n`;
    });
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
      name: 'Trim request body fields',
      id: 'trimRequestBody',
      type: 'boolean',
      default: false,
      description: 'Remove white space and additional lines that may affect the server\'s response'
    }
  ];
}

/**
 * @description Converts Postman sdk request object to nodejs(unirest) code snippet
 * @param {Object} request - postman-SDK request object
 * @param {Object} options
 * @param {String} options.indentType - type for indentation eg: Space, Tab
 * @param {String} options.indentCount - number of spaces or tabs for indentation.
 * @param {Boolean} options.trimRequestBody - whether to trim fields in request body or not
 * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
 * @param {Function} callback - callback function with parameters (error, snippet)
 */
function convert (request, options, callback) {

  if (!_.isFunction(callback)) {
    throw new Error('JS-XHR-Converter: callback is not valid function');
  }
  options = sanitizeOptions(options, getOptions());
  var indent, trim, headerSnippet,
    codeSnippet = '',
    bodySnippet = '';
  indent = options.indentType === 'Tab' ? '\t' : ' ';
  indent = indent.repeat(options.indentCount);
  trim = options.trimRequestBody;

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
  bodySnippet = request.body && !_.isEmpty(request.body.toJSON()) ? parseBody(request.body.toJSON(), trim,
    indent, request.headers.get('Content-Type')) : '';

  if (_.includes(['Get', 'Post'], _.capitalize(request.method))) {
    codeSnippet += `// WARNING: For ${request.method} requests, body is set to null by browsers.\n`;
  }
  codeSnippet += bodySnippet + '\n';

  codeSnippet += 'var xhr = new XMLHttpRequest();\nxhr.withCredentials = true;\n\n';

  codeSnippet += 'xhr.addEventListener("readystatechange", function() {\n';
  codeSnippet += `${indent}if(this.readyState === 4) {\n`;
  codeSnippet += `${indent.repeat(2)}console.log(this.responseText);\n`;
  codeSnippet += `${indent}}\n});\n\n`;

  codeSnippet += `xhr.open("${request.method}", "${getUrlStringfromUrlObject(request.url)}");\n`;
  if (options.requestTimeout) {
    codeSnippet += `xhr.timeout = ${options.requestTimeout};\n`;
    codeSnippet += 'xhr.addEventListener("ontimeout", function(e) {\n';
    codeSnippet += `${indent} console.log(e);\n`;
    codeSnippet += '});\n';
  }
  if (request.body && request.body.mode === 'graphql' && !request.headers.has('Content-Type')) {
    request.addHeader({
      key: 'Content-Type',
      value: 'application/json'
    });
  }
  headerSnippet = parseHeaders(request.toJSON().header);

  codeSnippet += headerSnippet + '\n';

  codeSnippet += request.body && !_.isEmpty(request.body.toJSON()) ? 'xhr.send(data);' : 'xhr.send();';
  callback(null, codeSnippet);
}

module.exports = {
  convert: convert,
  getOptions: getOptions
};
