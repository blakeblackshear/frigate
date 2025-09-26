const getOptions = require('./options').getOptions,
  sanitizeString = require('./util/sanitize').sanitizeString,
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  parseBody = require('./util/parseBody').parseBody;

/**
  * Returns the snippet header
  *
  * @module convert
  *
  * @returns {string} the snippet headers (uses)
  */
function getSnippetHeader () {
  return 'library(httr)\n\n';
}

/**
  * Returns the snippet footer
  *
  * @module convert
  * @returns {string} the snippet headers (uses)
  */
function getSnippetFooter () {
  return 'cat(content(res, \'text\'))';
}

/**
 * Gets the defined indentation from options
 *
 * @param  {object} options - process options
 * @returns {String} - indentation characters
 */
function getIndentation (options) {
  if (options && options.indentType && options.indentCount) {
    let charIndentation = options.indentType === 'Tab' ? '\t' : ' ';
    return charIndentation.repeat(options.indentCount);
  }
  return '  ';
}

/**
 * Used to get the headers and put them in the desired form of the language
 *
 * @param  {Object} request - postman SDK-request object
 * @returns {String} - request headers in the desired format
 */
function getRequestHeaders (request) {
  return request.headers.members;
}

/**
 * Returns the request's url in string format
 *
 * @param  {Object} request - postman SDK-request object
 * @returns {String} - request url in string representation
 */
function getRequestURL (request) {
  return request.url.toString();
}

/**
  * Validates if the input is a function
  *
  * @module convert
  *
  * @param  {*} validateFunction - postman SDK-request object
  * @returns {boolean} true if is a function otherwise false
  */
function validateIsFunction (validateFunction) {
  return typeof validateFunction === 'function';
}

/**
 * Returns the request's url in string format
 *
 * @param  {Object} request - postman SDK-request object
 * @returns {String} - request url in string representation
 */
function getRequestMethod (request) {
  return request.method;
}

/**
 * Transforms an array of headers into the desired form of the language
 *
 * @param  {Array} mapToSnippetArray - array of key values
 * @param  {String} indentation - used for indenting snippet's structure
 * @param  {boolean} sanitize - whether to sanitize the key and values
 * @returns {String} - array in the form of [ key => value ]
 */
function getSnippetArray (mapToSnippetArray, indentation, sanitize) {
  let mappedArray = mapToSnippetArray.map((entry) => {
    return `${indentation}'${sanitize ? sanitizeString(entry.key, true) : entry.key}' = ` +
    `${sanitize ? '\'' + sanitizeString(entry.value) + '\'' : entry.value}`;
  });
  return `c(\n${mappedArray.join(',\n')}\n)`;
}

/**
 * Groups the headers with the same key value
 *
 * @param {array} headers The array of headers
 * @returns {array} An array with grouped headers
 */
function groupHeadersSameKey (headers) {
  let grouped = {},
    groupedList = [];
  headers.forEach((header) => {
    if (grouped.hasOwnProperty(header.key)) {
      grouped[header.key].push(header.value);
    }
    else {
      grouped[header.key] = [header.value];
    }
  });
  groupedList = Object.keys(grouped).map((key) => {
    return {
      key,
      value: grouped[key].join(', ')
    };
  });
  return groupedList;
}

/**
 * Transforms an array of headers into the desired form of the language
 *
 * @param  {Array} headers - postman SDK-headers
 * @param  {String} indentation - used for indenting snippet's structure
 * @returns {String} - request headers in the desired format
 */
function getSnippetHeaders (headers, indentation) {
  if (headers.length > 0) {
    headers = headers.filter((header) => { return !header.disabled; });
    headers = groupHeadersSameKey(headers);
    return `headers = ${getSnippetArray(headers, indentation, true)}\n\n`;
  }
  return '';
}

/**
 * Return an encode snippet depending on the mode
 *
 * @param {object} mode - The body mode from request
 * @returns {string} the encode snippet
 */
function getEncodeSnippetByMode (mode) {
  const isForm = ['urlencoded'].includes(mode),
    isMultipart = ['formdata'].includes(mode);
  let snippet = '';
  if (isForm) {
    snippet = ', encode = \'form\'';
  }
  else if (isMultipart) {
    snippet = ', encode = \'multipart\'';
  }

  return snippet;
}

/**
  * Creates the snippet request for the postForm method
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the headers
  * @param  {string} methodUC - The method upper cased
  * @param  {string} mode - the request body mode
  * @param  {number} requestTimeout - The request timeout in the options
  * @returns {String} - returns generated snippet
  */
function getSnippetFromMethod (url, hasParams, hasHeaders, methodUC, mode, requestTimeout = 0) {
  let paramsSnippet = hasParams ? ', body = body' : '',
    headersSnippet = hasHeaders ? ', add_headers(headers)' : '',
    encodeSnippet = getEncodeSnippetByMode(mode),
    timeoutSnippet = requestTimeout ? `, timeout(${requestTimeout})` : '';

  return `res <- VERB("${methodUC}", url = "${url}"` +
    `${paramsSnippet}${headersSnippet}${encodeSnippet}${timeoutSnippet})\n\n`;
}

/**
  * Creates the snippet request for either get ulr or post form
  *
  * @module convert
  *
  * @param  {object} requestData - an object that includes:
  * {string} method - request http method
  * {boolean} hasParams - wheter or not include the params
  * {boolean} hasHeaders - wheter or not include the headers
  * {string} mode - the request body mode
  * {number} requestTimeout - The request timeout from the options
  * @returns {String} - returns generated snippet
  */
function getSnippetRequest ({url, method, hasParams, hasHeaders, mode, requestTimeout}) {
  const methodUC = method.toUpperCase();
  let snippetRequest = '';
  if (methodUC && methodUC !== '') {
    snippetRequest = getSnippetFromMethod(url, hasParams, hasHeaders, methodUC, mode, requestTimeout);
  }
  return snippetRequest;
}

/**
 * Gets the defined body trim from options
 *
 * @param  {object} options - process options
 * @returns {boolea} - wheter to trim the request body
 */
function getBodyTrim (options) {
  if (options && options.trimRequestBody) {
    return options.trimRequestBody;
  }
  return false;
}

/**
  * Used to convert the postman sdk-request object in PHP-Guzzle request snippet
  *
  * @module convert
  *
  * @param  {Object} request - postman SDK-request object
  * @param  {object} options - process options
  * @param  {Function} callback - function with parameters (error, snippet)
  * @returns {String} - returns generated PHP-Guzzle snippet via callback
  */
function convert (request, options, callback) {

  if (!validateIsFunction(callback)) {
    throw new Error('R-Httr~convert: Callback is not a function');
  }
  let snippet = '';
  options = sanitizeOptions(options, getOptions());

  const method = getRequestMethod(request),
    indentation = getIndentation(options),
    url = getRequestURL(request),
    mode = request.body ? request.body.mode : '',
    snippetHeaders = getSnippetHeaders(getRequestHeaders(request), indentation),
    snippetHeader = getSnippetHeader(),
    snippetFooter = getSnippetFooter(),
    snippetbody = parseBody(request.body, indentation, getBodyTrim(options), request.headers.get('Content-Type')),
    snippetRequest = getSnippetRequest({
      url: url,
      method: method,
      hasParams: snippetbody !== '',
      hasHeaders: snippetHeaders !== '',
      mode: mode,
      requestTimeout: options.requestTimeout
    });

  snippet += snippetHeader;
  snippet += snippetHeaders;
  snippet += snippetbody;
  snippet += snippetRequest;
  snippet += snippetFooter;

  return callback(null, snippet);
}

module.exports = {
  /**
   * Used in order to get options for generation of R-rCurl code snippet
   *
   * @module getOptions
   *
   * @returns {Array} Options specific to generation of R-rCurl code snippet
   */
  getOptions,

  convert,
  getSnippetHeaders,
  getSnippetFromMethod,
  getSnippetRequest,
  getIndentation
};
