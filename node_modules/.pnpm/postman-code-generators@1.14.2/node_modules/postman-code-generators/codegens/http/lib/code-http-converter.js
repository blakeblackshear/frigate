let utils = require('./util'),
  _ = require('./lodash'),
  { Url } = require('postman-collection/lib/collection/url');

/**
 * Used in order to get additional options for generation of C# code snippet (i.e. Include Boilerplate code)
 *
 * @module getOptions
 *
 * @returns {Array} Additional options specific to generation of http code snippet
 */
function getOptions () {
  return [{
    name: 'Trim request body fields',
    id: 'trimRequestBody',
    type: 'boolean',
    default: false,
    description: 'Remove white space and additional lines that may affect the server\'s response'
  }];
}

/**
 * Converts a Postman SDK request to HTTP message
 *
 * @param {Object} request - Postman SDK request
 * @param {Object} options - Options for converter
 * @param {Boolean} options.trimRequestBody - determines whether to trim the body or not
 * @param {Function} callback callback
 * @returns {Function} returns the snippet with the callback function.
 */
function convert (request, options, callback) {
  let snippet = '',
    url, host, path, query, body, headers;
  options = utils.sanitizeOptions(options, getOptions());

  url = Url.parse(request.url.toString());
  host = url.host ? url.host.join('.') : '';
  host += url.port ? ':' + url.port : '';
  path = url.path ? '/' + url.path.join('/') : '/';
  query = url.query ? _.reduce(url.query, (accum, q) => {
    accum.push(`${q.key}=${q.value}`);
    return accum;
  }, []) : [];

  if (query.length > 0) {
    query = '?' + query.join('&');
  }
  else {
    query = '';
  }

  snippet = `${request.method} ${path}${query} HTTP/1.1\n`;
  snippet += `Host: ${host}`;
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
              utils.addFormParam(formdataArray, key, param.type, filePath, disabled, contentType);
            });
          }
          // if src is not an array or string, or is an empty array, add a placeholder for file path(no files case)
          else {
            utils.addFormParam(formdataArray, key, param.type, '/path/to/file', disabled, contentType);
          }
        }
        // if src is string, directly add the param with src as filepath
        else {
          utils.addFormParam(formdataArray, key, param.type, param.src, disabled, contentType);
        }
      }
      // if type is text, directly add it to formdata array
      else {
        utils.addFormParam(formdataArray, key, param.type, param.value, disabled, contentType);
      }
    });
    request.body.update({
      mode: 'formdata',
      formdata: formdataArray
    });
  }
  body = utils.getBody(request, options.trimRequestBody);
  if (body && body.length !== 0 && !request.headers.has('Content-Length')) {
    request.addHeader({
      key: 'Content-Length',
      value: body.length
    });
  }
  headers = utils.getHeaders(request);
  snippet += headers ? `\n${headers}` : '';
  snippet += body ? `\n\n${body}` : '';
  return callback(null, snippet);
}

module.exports = {
  getOptions: getOptions,
  convert: convert
};
