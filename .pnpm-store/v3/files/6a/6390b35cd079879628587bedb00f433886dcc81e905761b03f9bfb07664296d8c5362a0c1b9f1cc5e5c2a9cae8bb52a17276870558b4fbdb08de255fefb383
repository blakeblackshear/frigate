const getOptions = require('./options').getOptions,
  sanitizeString = require('./util/sanitize').sanitizeString,
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  parseBody = require('./util/parseBody').parseBody;

/**
 * Takes in an array and group the ones with same key
 *
 * @param  {Array} headerArray - postman SDK-headers
 * @returns {String} - request headers in the desired format
 */
function groupHeadersSameKey (headerArray) {
  let res = [],
    group = headerArray.reduce((header, a) => {
      header[a.key] = [...header[a.key] || [], a];
      return header;
    }, {});
  Object.keys(group).forEach((item) => {
    let values = [];
    group[item].forEach((child) => {
      values.push(child.value);
    });
    res.push({key: item, value: values.join(', ') });
  });
  return res;
}

/**
  * Returns the snippet header
  *
  * @module convert
 * @param  {boolean} ignoreWarnings - option to add code for ignoring warnings
  * @returns {string} the snippet headers (uses)
  */
function getSnippetHeader (ignoreWarnings) {
  if (ignoreWarnings) {
    return 'library(RCurl)\noptions(warn=-1)\n';
  }
  return 'library(RCurl)\n';

}

/**
  * Returns the snippet footer
  *
  * @module convert
  * @returns {string} the snippet headers (uses)
  */
function getSnippetFooter () {
  return 'cat(res)';
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
  mapToSnippetArray = groupHeadersSameKey(mapToSnippetArray);
  let mappedArray = mapToSnippetArray.map((entry) => {
    return `${indentation}"${sanitize ? sanitizeString(entry.key, true) : entry.key}" = ` +
    `${sanitize ? '"' + sanitizeString(entry.value) + '"' : entry.value}`;
  });
  return `c(\n${mappedArray.join(',\n')}\n)`;
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
    return `headers = ${getSnippetArray(headers, indentation, true)}\n`;
  }
  return '';
}

/**
  * Creates the snippet request for the request options
  *
  * @module convert
  *
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the headers
  * @param  {number} requestTimeout - the request timeout
  * @param  {boolean} followRedirect - wheter to follow location or not
  * @returns {String} - returns generated snippet
*/
function buildOptionsSnippet (hasParams, hasHeaders, requestTimeout, followRedirect) {
  let options = [],
    mappedArray;
  if (hasParams) {
    options.push({ key: 'postfields', value: 'params' });
  }
  if (hasHeaders) {
    options.push({ key: 'httpheader', value: 'headers' });
  }
  if (requestTimeout && requestTimeout !== 0) {
    options.push({ key: 'timeout.ms', value: requestTimeout });
  }
  if (followRedirect === true) {
    options.push({ key: 'followlocation', value: 'TRUE' });
  }
  mappedArray = options.map((entry) => {
    return `${entry.key} = ${entry.value}`;
  });
  return `${mappedArray.join(', ')}`;
}

/**
  * Creates the snippet request for the postForm method
  *
  * @module convert
  *
  * @param  {object} filesInfo - information of the form data files
  * @returns {String} - returns generated snippet
  */
function buildFileRequestSnippet (filesInfo) {
  if (!filesInfo || filesInfo.numberOfFiles === 0) {
    return '';
  }
  let files = [];
  for (let index = 0; index < filesInfo.numberOfFiles; index++) {
    files.push(`file = file${index}`);
  }
  return `${files.join(', ')}, `;
}


/**
  * Creates the snippet request for the postForm method
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {string} style - "post":urlencoded params "httpost":multipart/form-data
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the header
  * @param  {number} requestTimeout - the request timeout
  * @param  {boolean} followRedirect - follow redirect from options
  * @param  {object} filesInfo - information of the form data files
  * @returns {String} - returns generated snippet
  */
function getSnippetPostFormInParams (url, style, hasParams, hasHeaders, requestTimeout, followRedirect,
  filesInfo) {
  let optionsSnipppet = buildOptionsSnippet(false, hasHeaders, requestTimeout, followRedirect),
    fileRequestSnippet = buildFileRequestSnippet(filesInfo),
    paramsSnippet = hasParams ? '.params = params, ' : '';
  if (optionsSnipppet !== '') {
    return `res <- postForm("${url}", ${fileRequestSnippet}${paramsSnippet}.opts=list(${optionsSnipppet}),` +
    ` style = "${style}")\n`;
  }
  return `res <- postForm("${url}", ${fileRequestSnippet}${paramsSnippet}style = "${style}")\n`;
}

/**
  * Creates the snippet request for the getUrl method
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {string} hasHeaders - wheter or not include the headers
  * @param  {number} requestTimeout - the request timeout
  * @param  {boolean} followRedirect - follow redirect from options
  * @returns {String} - returns generated snippet
  */
function getSnippetGetURL (url, hasHeaders, requestTimeout, followRedirect) {
  let optionsSnipppet = buildOptionsSnippet(false, hasHeaders, requestTimeout, followRedirect);

  if (optionsSnipppet !== '') {
    return `res <- getURL("${url}", .opts=list(${optionsSnipppet}))\n`;
  }
  return `res <- getURL("${url}")\n`;
}

/**
  * Creates the snippet request for the postForm method
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {string} style - "post":urlencoded params "httpost":multipart/form-data
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the headers
  * @param  {number} requestTimeout - the request timeout
  * @param  {boolean} followRedirect - follow redirect from options
  * @returns {String} - returns generated snippet
  */
function getSnippetPostFormInOptions (url, style, hasParams, hasHeaders, requestTimeout, followRedirect) {
  let optionsSnipppet = buildOptionsSnippet(hasParams, hasHeaders, requestTimeout, followRedirect);
  if (optionsSnipppet !== '') {
    return `res <- postForm("${url}", .opts=list(${optionsSnipppet}),` +
    ` style = "${style}")\n`;
  }
  return `res <- postForm("${url}", style = "${style}")\n`;
}

/**
  * Creates the snippet request for the httpPut method
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the headers
  * @param  {number} requestTimeout - the request timeout
  * @param  {boolean} followRedirect - follow redirect from options
  * @returns {String} - returns generated snippet
  */
function getSnippetPut (url, hasParams, hasHeaders, requestTimeout, followRedirect) {
  let optionsSnipppet = buildOptionsSnippet(false, hasHeaders, requestTimeout, followRedirect);
  if (optionsSnipppet !== '' && hasParams) {
    return `res <- httpPUT("${url}", params, ${optionsSnipppet})\n`;
  }
  else if (optionsSnipppet !== '' && !hasParams) {
    return `res <- httpPUT("${url}", ${optionsSnipppet})\n`;
  }
  else if (optionsSnipppet === '' && hasParams) {
    return `res <- httpPUT("${url}", params)\n`;
  }
  else if (optionsSnipppet === '' && !hasParams) {
    return `res <- httpPUT("${url}")\n`;
  }
  return '';
}

/**
  * Creates the snippet request for the httpPut method
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the headers
  * @param  {number} requestTimeout - the request timeout
  * @param  {boolean} followRedirect - follow redirect from options
  * @returns {String} - returns generated snippet
  */
function getSnippetDelete (url, hasParams, hasHeaders, requestTimeout, followRedirect) {
  let optionsSnipppet = buildOptionsSnippet(hasParams, hasHeaders, requestTimeout, followRedirect);
  if (optionsSnipppet !== '') {
    return `res <- httpDELETE("${url}", ${optionsSnipppet})\n`;
  }
  return `res <- httpDELETE("${url}")\n`;
}

/**
  * Creates the snippet request with get rul content for other verbs than
  * POST, PUT, DELETE, and GET
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the headers
  * @param  {number} requestTimeout - the request timeout
  * @param  {boolean} followRedirect - follow redirect from options
  * @param  {string} httpMethod - http method of the request
  * @returns {String} - returns generated snippet
  */
function getSnippetURLContent (url, hasParams, hasHeaders, requestTimeout, followRedirect, httpMethod) {
  let optionsSnipppet = buildOptionsSnippet(hasParams, hasHeaders, requestTimeout, followRedirect);
  if (optionsSnipppet !== '') {
    return `res <- getURLContent("${url}", customrequest = "${httpMethod}", ${optionsSnipppet})\n`;
  }
  return `res <- getURLContent("${url}", customrequest = "${httpMethod}")\n`;
}

/**
  * Creates the snippet request for either get ulr or post form
  *
  * @module convert
  *
  * @param  {string} url - string url of the service
  * @param  {string} method - request http method
  * @param  {string} style - "post":urlencoded params "httpost":multipart/form-data
  * @param  {boolean} hasParams - wheter or not include the params
  * @param  {boolean} hasHeaders - wheter or not include the headers
  * @param  {string} contentTypeHeaderValue - the content type header value
  * @param  {object} request - the PM request
  * @param  {number} requestTimeout - request timeout from options
  * @param  {boolean} followRedirect - follow redirect from options
  * @param  {object} filesInfo - information of the form data files
  * @returns {String} - returns generated snippet
  */
function getSnippetRequest (url, method, style, hasParams, hasHeaders, contentTypeHeaderValue,
  request, requestTimeout, followRedirect, filesInfo) {
  const methodUC = method.toUpperCase();
  if (methodUC === 'GET') {
    return getSnippetGetURL(url, hasHeaders, requestTimeout, followRedirect);
  }
  if (methodUC === 'POST' && request.body && request.body.mode === 'file') {
    return getSnippetPostFormInOptions(url, 'post', hasParams, hasHeaders, requestTimeout, followRedirect);
  }
  if (methodUC === 'POST' && contentTypeHeaderValue === 'application/x-www-form-urlencoded' ||
    contentTypeHeaderValue === 'multipart/form-data' || filesInfo !== undefined) {
    return getSnippetPostFormInParams(url, style, hasParams, hasHeaders, requestTimeout, followRedirect,
      filesInfo);
  }
  if (methodUC === 'POST') {
    return getSnippetPostFormInOptions(url, style, hasParams, hasHeaders, requestTimeout, followRedirect);
  }
  if (methodUC === 'PUT') {
    return getSnippetPut(url, hasParams, hasHeaders, requestTimeout, followRedirect);
  }
  if (methodUC === 'DELETE') {
    return getSnippetDelete(url, hasParams, hasHeaders, requestTimeout, followRedirect);
  }
  return getSnippetURLContent(url, hasParams, hasHeaders, requestTimeout, followRedirect, methodUC);
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
 * Gets the http post style
 *
 *"post":urlencoded params "httpost":multipart/form-data

 * @param  {string} method - request http method
 * @param  {string} contentType - request content type
 * @returns {string} - the post form style
 */
function getCurlStyle (method, contentType) {
  if (method.toUpperCase() === 'POST') {
    if (contentType === 'application/x-www-form-urlencoded') {
      return 'post';
    }
    return 'httppost';
  }
  return '';
}

/**
  * Add the content type header if needed
  *
  * @module convert
  *
  * @param  {Object} request - postman SDK-request object
  */
function addContentTypeHeader (request) {
  if (request.body && request.body.mode === 'graphql' && !request.headers.has('Content-Type')) {
    request.addHeader({
      key: 'Content-Type',
      value: 'application/json'
    });
  }
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
    throw new Error('R-Rcurl~convert: Callback is not a function');
  }
  let snippet = '',
    snippetRequest,
    snippetBody;
  options = sanitizeOptions(options, getOptions());
  addContentTypeHeader(request);
  const method = getRequestMethod(request),
    indentation = getIndentation(options),
    connectionTimeout = options.requestTimeout,
    followRedirect = options.followRedirect,
    ignoreWarnings = options.ignoreWarnings,
    contentTypeHeaderValue = request.headers.get('Content-Type'),
    url = sanitizeString(getRequestURL(request)),
    snippetHeaders = getSnippetHeaders(getRequestHeaders(request), indentation),
    snippetHeader = getSnippetHeader(ignoreWarnings),
    snippetFooter = getSnippetFooter();
  snippetBody = parseBody(request.body, indentation, getBodyTrim(options), contentTypeHeaderValue);
  if (typeof snippetBody === 'string') {
    snippetRequest = getSnippetRequest(url, method, getCurlStyle(method, contentTypeHeaderValue),
      snippetBody !== '', snippetHeaders !== '', contentTypeHeaderValue, request, connectionTimeout, followRedirect);
  }
  else {
    let paramsBody = snippetBody.bodySnippet,
      filesInfo = { fileSnippet: snippetBody.fileSnippet,
        numberOfFiles: snippetBody.numberOfFiles};
    snippetRequest = getSnippetRequest(url, method, getCurlStyle(method, contentTypeHeaderValue),
      paramsBody !== '', snippetHeaders !== '', contentTypeHeaderValue, request, connectionTimeout, followRedirect,
      filesInfo);
    snippetBody = paramsBody + filesInfo.fileSnippet;
  }

  snippet += snippetHeader;
  snippet += snippetHeaders;
  snippet += snippetBody;
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
  getSnippetPostFormInParams,
  getSnippetGetURL,
  getSnippetRequest,
  getSnippetPostFormInOptions,
  addContentTypeHeader,
  buildOptionsSnippet,
  groupHeadersSameKey,
  getIndentation,
  getSnippetPut,
  getSnippetDelete,
  getSnippetURLContent
};
