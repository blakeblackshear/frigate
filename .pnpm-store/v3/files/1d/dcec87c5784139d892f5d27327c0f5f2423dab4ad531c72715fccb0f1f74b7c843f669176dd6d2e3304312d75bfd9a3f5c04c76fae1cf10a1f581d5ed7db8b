var _ = require('./lodash'),
  Helpers = require('./util/helpers'),
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  quote = require('./util/sanitize').quote,
  addFormParam = require('./util/sanitize').addFormParam,
  self;

const GAP = ' ',
  URLENCODED = 'urlencoded',
  FORM_DATA = 'formdata',
  RAW = 'raw',
  GRAPHQL = 'graphql',
  FILE = 'file';

self = module.exports = {
  /**
   * Used to return options which are specific to a particular plugin
   *
   * @returns {Array}
   */
  getOptions: function () {
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
      }
    ];
  },

  /**
    * Used to convert the postman sdk-request object in shell-httpie reuqest snippet
    *
    * @param  {Object} request - postman SDK-request object
    * @param  {Object} options
    * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
                                                (default: 0 -> never bail out)
    * @param {Boolean} options.followRedirect : whether to allow redirects of a request
    * @param  {Function} callback - function with parameters (error, snippet)
    */
  convert: function (request, options, callback) {
    var snippet = '',
      parsedBody,
      parsedHeaders,
      bodyMode,
      timeout,
      url,
      handleRedirect = (enableRedirect) => { if (enableRedirect) { return GAP + '--follow' + GAP; } return GAP; },
      handleRequestTimeout = (time) => {
        if (time) {
          return '--timeout ' + (time / 1000) + GAP;
        }
        return '--timeout 3600' + GAP;
      };

    // check whether options was passed or not
    if (_.isFunction(options)) {
      callback = options;
      options = null;
    }
    else if (!_.isFunction(callback)) { // check whether callback is a function
      throw new Error('Shell-Httpie~convert: Callback not a function');
    }

    options = sanitizeOptions(options, self.getOptions());

    url = quote(request.url.toString());
    timeout = options.requestTimeout;
    if (request.body && request.body.mode === 'graphql' && !request.headers.has('Content-Type')) {
      request.addHeader({
        key: 'Content-Type',
        value: 'application/json'
      });
    }
    parsedHeaders = Helpers.addHeaders(request);

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
    // snippet construction based on the request body
    if (request.hasOwnProperty('body')) {
      if (request.body.hasOwnProperty('mode')) {
        bodyMode = request.body.mode;
        parsedBody = Helpers.getRequestBody(request.body[bodyMode], bodyMode);
        // handling every type of content-disposition
        switch (bodyMode) {
          case URLENCODED:
            snippet += 'http --ignore-stdin --form' + handleRedirect(options.followRedirect);
            snippet += handleRequestTimeout(timeout);
            snippet += request.method + GAP + url + ' \\\n';
            snippet += parsedBody + (parsedHeaders ? (' \\\n' + parsedHeaders) : '');
            break;

          case FORM_DATA:
            snippet += 'http --ignore-stdin --form' + handleRedirect(options.followRedirect);
            snippet += handleRequestTimeout(timeout);
            snippet += request.method + GAP + url + ' \\\n';
            snippet += parsedBody + (parsedHeaders ? (' \\\n' + parsedHeaders) : '');
            break;

          case RAW:
            if (parsedBody) {
              snippet += 'printf ' + parsedBody + '| ';
            }
            snippet += 'http ' + handleRedirect(options.followRedirect) + handleRequestTimeout(timeout);
            snippet += request.method + GAP + url + (parsedHeaders ? (' \\\n' + parsedHeaders) : '');
            break;
          case GRAPHQL:
            if (parsedBody) {
              snippet += 'printf ' + parsedBody + '| ';
            }
            snippet += 'http ' + handleRedirect(options.followRedirect) + handleRequestTimeout(timeout);
            snippet += request.method + GAP + url + (parsedHeaders ? (' \\\n' + parsedHeaders) : '');
            break;
          case FILE:
            snippet += `cat ${parsedBody} | `;
            snippet += 'http ' + handleRedirect(options.followRedirect) + handleRequestTimeout(timeout);
            snippet += request.method + GAP + url + (parsedHeaders ? (' \\\n' + parsedHeaders) : '');
            break;
          default:
            return callback('Shell-Httpie~convert: Not a valid Content-Type in request body', null);
        }
      }
      else {
        snippet += 'http' + handleRedirect(options.followRedirect) + handleRequestTimeout(timeout);
        snippet += request.method + GAP + url + (parsedHeaders ? (' \\\n' + parsedHeaders) : '');
      }
    }
    else { // forming a request without a body
      snippet += 'http' + handleRedirect(options.followRedirect) + handleRequestTimeout(timeout);
      snippet += request.method + GAP + url + (parsedHeaders ? (' \\\n' + parsedHeaders) : '');
    }

    callback(null, snippet);
  }
};

