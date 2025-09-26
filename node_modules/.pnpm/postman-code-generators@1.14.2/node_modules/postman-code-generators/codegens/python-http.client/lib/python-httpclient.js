var _ = require('./lodash'),
  { Url } = require('postman-collection/lib/collection/url'),
  sanitize = require('./util/sanitize').sanitize,
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  addFormParam = require('./util/sanitize').addFormParam,
  parseBody = require('./util/parseBody'),
  self;

/**
 * Used to parse the request headers
 *
 * @param  {Object} request - postman SDK-request object
 * @param  {String} indentation - used for indenting snippet's structure
 * @returns {String} - request headers in the desired format
 */
function getheaders (request, indentation) {
  var headerArray = request.toJSON().header,
    requestBodyMode = (request.body ? request.body.mode : 'raw'),
    headerMap;

  if (!_.isEmpty(headerArray)) {
    headerArray = _.reject(headerArray, 'disabled');
    headerMap = _.map(headerArray, function (header) {
      return `${indentation}'${sanitize(header.key, 'header', true)}': ` +
            `'${sanitize(header.value, 'header')}'`;
    });
    if (requestBodyMode === 'formdata') {
      headerMap.push(`${indentation}'Content-type': 'multipart/form-data; boundary={}'.format(boundary)`);
    }
    return `headers = {\n${headerMap.join(',\n')}\n}\n`;
  }
  if (requestBodyMode === 'formdata') {
    return `headers = {\n${indentation} 'Content-type': ` +
             '\'multipart/form-data; boundary={}\'.format(boundary) \n}\n';
  }
  return 'headers = {}\n';
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
      }
    ];
  },

  /**
    * Used to convert the postman sdk-request object in python-httpclient reuqest snippet
    *
    * @module convert
    *
    * @param  {Object} request - postman SDK-request object
    * @param  {Object} options - Options to tweak code snippet generated in Python
    * @param  {String} options.indentType - type of indentation eg: Space / Tab (default: Space)
    * @param  {Number} options.indentCount - frequency of indent (default: 4 for indentType: Space,
                                                                    default: 1 for indentType: Tab)
    * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
                                                (default: 0 -> never bail out)
    * @param {Boolean} options.requestBodyTrim : whether to trim request body fields (default: false)
    * @param {Boolean} options.followRedirect : whether to allow redirects of a request
    * @param  {Function} callback - function with parameters (error, snippet)
    */
  convert: function (request, options, callback) {
    var snippet = '',
      indentation = '',
      identity = '',
      url, host, path, query, contentType;

    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }
    else if (!_.isFunction(callback)) {
      throw new Error('Python-Http.Client~convert: Callback is not a function');
    }
    options = sanitizeOptions(options, self.getOptions());

    identity = options.indentType === 'Tab' ? '\t' : ' ';
    indentation = identity.repeat(options.indentCount);

    url = Url.parse(request.url.toString());
    host = url.host ? url.host.join('.') : '';
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

    contentType = request.headers.get('Content-Type');
    snippet += 'import http.client\n';

    // If contentType is json then include the json module for later use
    if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
      snippet += 'import json\n';
    }
    if (request.body && request.body.mode === 'formdata') {
      snippet += 'import mimetypes\n';
      snippet += 'from codecs import encode\n';
    }
    snippet += '\n';
    if (request.url.protocol === 'http') {
      snippet += `conn = http.client.HTTPConnection("${sanitize(host)}"`;
    }
    else {
      snippet += `conn = http.client.HTTPSConnection("${sanitize(host)}"`;
    }
    snippet += url.port ? `, ${request.url.port}` : '';
    snippet += options.requestTimeout !== 0 ? `, timeout = ${options.requestTimeout})\n` : ')\n';

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

    snippet += parseBody(request.toJSON(), indentation, options.requestBodyTrim, contentType);
    if (request.body && !contentType) {
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
    snippet += getheaders(request, indentation);
    snippet += `conn.request("${request.method}",` +
      ` "${sanitize(path)}${sanitize(encodeURI(query))}", payload, headers)\n`;
    snippet += 'res = conn.getresponse()\n';
    snippet += 'data = res.read()\n';
    snippet += 'print(data.decode("utf-8"))';

    return callback(null, snippet);
  }
};
