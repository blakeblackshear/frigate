var _ = require('./lodash'),
  sanitize = require('./util').sanitize,
  sanitizeSingleQuotes = require('./util').sanitizeSingleQuotes,
  sanitizeOptions = require('./util').sanitizeOptions,
  addFormParam = require('./util').addFormParam,
  path = require('path');
const VALID_METHODS = ['DEFAULT',
  'DELETE',
  'GET',
  'HEAD',
  'MERGE',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
  'TRACE'];

/**
 * Parses URLEncoded body from request to powershell-restmethod syntax
 *
 * @param {Object} body URLEncoded Body
 */
function parseURLEncodedBody (body) {
  var bodySnippet = '',
    urlencodedArray = [];
  _.forEach(body, function (data) {
    if (!data.disabled) {
      urlencodedArray.push(`${encodeURIComponent(data.key)}=${encodeURIComponent(data.value)}`);
    }
  });
  if (urlencodedArray.length > 0) {
    bodySnippet = '$body = "' + urlencodedArray.join('&') + '"\n';
  }
  return bodySnippet;
}

/**
 * Parses Formdata from request to powershell-restmethod syntax
 *
 * @param {Object} body FormData body
 * @param {boolean} trim trim body option
 */
function parseFormData (body, trim) {
  if (_.isEmpty(body)) {
    return '';
  }

  var bodySnippet = '$multipartContent = [System.Net.Http.MultipartFormDataContent]::new()\n';
  _.forEach(body, function (data) {
    if (!data.disabled) {
      if (data.type === 'file') {
        var pathArray = data.src.split(path.sep),
          fileName = pathArray[pathArray.length - 1];
        bodySnippet += `$multipartFile = '${data.src}'\n` +
        '$FileStream = [System.IO.FileStream]::new($multipartFile, [System.IO.FileMode]::Open)\n' +
        '$fileHeader = [System.Net.Http.Headers.ContentDispositionHeaderValue]::new("form-data")\n' +
        `$fileHeader.Name = "${sanitize(data.key)}"\n` +
        `$fileHeader.FileName = "${sanitize(fileName, trim)}"\n` +
        '$fileContent = [System.Net.Http.StreamContent]::new($FileStream)\n' +
        '$fileContent.Headers.ContentDisposition = $fileHeader\n' +
        '$multipartContent.Add($fileContent)\n\n';
      }
      else {
        bodySnippet += '$stringHeader = ' +
          '[System.Net.Http.Headers.ContentDispositionHeaderValue]::new("form-data")\n' +
          `$stringHeader.Name = "${sanitize(data.key, trim)}"\n` +
          `$stringContent = [System.Net.Http.StringContent]::new("${sanitize(data.value, trim)}")\n` +
          '$stringContent.Headers.ContentDisposition = $stringHeader\n' +
          (data.contentType ? '$contentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("' +
            data.contentType + '")\n$stringContent.Headers.ContentType = $contentType\n' : '') +
          '$multipartContent.Add($stringContent)\n\n';
      }
    }
  });
  bodySnippet += '$body = $multipartContent\n';
  return bodySnippet;
}

/**
 * Parses Raw data from request to powershell-restmethod syntax
 *
 * @param {Object} body Raw body data
 * @param {boolean} trim trim body option
 */
function parseRawBody (body, trim) {
  return `$body = @"\n${sanitize(body.toString(), trim, false)}\n"@\n`;
}

/**
 * Parses graphql data from request to powershell-restmethod syntax
 *
 * @param {Object} body graphql body data
 * @param {boolean} trim trim body option
 */
function parseGraphQL (body, trim) {
  let query = body.query,
    graphqlVariables;
  try {
    graphqlVariables = JSON.parse(body.variables);
  }
  catch (e) {
    graphqlVariables = {};
  }
  return `$body = "${sanitize(JSON.stringify({
    query: query,
    variables: graphqlVariables
  }), trim)}"\n`;
}

/* eslint-disable no-unused-vars*/
/* istanbul ignore next */
/**
 * Parses File data from request to powershell-restmethod syntax
 *
 * @param {Object} src File path
 * @param {boolean} trim trim body option
 */
function parseFileData (src, trim) {
  return '$body = "<file-contents-here>"\n';
}
/* eslint-enable no-unused-vars*/

/**
 * Parses Body from request to powershell-restmethod syntax based on the body mode
 *
 * @param {Object} body body object from request
 * @param {boolean} trim trim body option
 */
function parseBody (body, trim) {
  if (!_.isEmpty(body)) {
    switch (body.mode) {
      case 'urlencoded':
        return parseURLEncodedBody(body.urlencoded);
      case 'raw':
        return parseRawBody(body.raw, trim);
      case 'graphql':
        return parseGraphQL(body.graphql, trim);
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
 * Parses headers from request to powershell-restmethod syntax
 *
 * @param {Object} headers headers from the request
 */
function parseHeaders (headers) {
  var headerSnippet = '';
  if (!_.isEmpty(headers)) {
    headers = _.reject(headers, 'disabled');
    headerSnippet = '$headers = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"\n';
    _.forEach(headers, function (header) {
      headerSnippet += `$headers.Add("${sanitize(header.key, true)}", "${sanitize(header.value)}")\n`;
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
}

/**
 * Converts Postman sdk request object to powershell-restmethod code snippet
 *
 * @param {Object} request - postman-SDK request object
 * @param {Object} options
 * @param {Boolean} options.followRedirect - whether to enable followredirect
 * @param {Boolean} options.trimRequestBody - whether to trim fields in request body or not
 * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
 * @param {Function} callback - callback function with parameters (error, snippet)
 */
function convert (request, options, callback) {
  if (!_.isFunction(callback)) {
    throw new Error('Powershell RestMethod Converter callback is not a valid function');
  }
  options = sanitizeOptions(options, getOptions());

  var trim = options.trimRequestBody,
    headers, body,
    codeSnippet = '',
    headerSnippet = '',
    bodySnippet = '';
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
  body = request.body ? request.body.toJSON() : {};
  bodySnippet = parseBody(body, trim);

  if (headerSnippet !== '') {
    codeSnippet += headerSnippet + '\n';
  }
  if (bodySnippet !== '') {
    codeSnippet += bodySnippet + '\n';
  }

  if (_.includes(VALID_METHODS, request.method)) {
    codeSnippet += `$response = Invoke-RestMethod '${sanitizeSingleQuotes(request.url.toString())}' -Method '` +
                        `${request.method}' -Headers $headers`;
  }
  else {
    codeSnippet += `$response = Invoke-RestMethod '${sanitizeSingleQuotes(request.url.toString())}' -CustomMethod ` +
                        `'${sanitizeSingleQuotes(request.method)}' -Headers $headers`;
  }
  if (bodySnippet !== '') {
    codeSnippet += ' -Body $body';
  }
  if (options.requestTimeout > 0) {
    // Powershell rest method accepts timeout in seconds
    let requestTimeout = options.requestTimeout;
    requestTimeout /= 1000;
    codeSnippet += ` -TimeoutSec ${requestTimeout}`;
  }
  if (!options.followRedirect) {
    codeSnippet += ' -MaximumRedirection 0';
  }
  codeSnippet += '\n$response | ConvertTo-Json';
  callback(null, codeSnippet);
}

module.exports = {
  convert: convert,
  getOptions: getOptions
};
