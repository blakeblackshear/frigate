var _ = require('lodash'),
  parseRequest = require('./parseRequest'),
  sanitize = require('./util').sanitize,
  addFormParam = require('./util').addFormParam,
  sanitizeOptions = require('./util').sanitizeOptions;

//  Since Kotlin OkHttp requires to add extralines of code to handle methods with body
const METHODS_WITHOUT_BODY = ['GET', 'HEAD', 'COPY', 'UNLOCK', 'UNLINK', 'PURGE', 'LINK', 'VIEW'];

/**
 * returns snippet of kotlin okhttp by parsing data from Postman-SDK request object
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation required for code snippet
 * @param {Object} options - Options to tweak code snippet
 * @returns {String} - kotlin okhttp code snippet for given request object
 */
function makeSnippet (request, indentString, options) {
  let isBodyRequired = !(_.includes(METHODS_WITHOUT_BODY, request.method)),
    snippet = 'val client = OkHttpClient',
    hasNoOptions = !(options.requestTimeout || options.followRedirects);

  if (hasNoOptions) {
    snippet += '()\n';
  }
  else {
    snippet += '.Builder()\n';
    if (options.requestTimeout > 0) {
      snippet += indentString + `.connectTimeout(${options.requestTimeout}, TimeUnit.SECONDS)\n`;
    }

    if (_.get(request, 'protocolProfileBehavior.followRedirects', options.followRedirect) === false) {
      snippet += indentString + '.followRedirects(false)\n';
    }

    snippet += indentString + '.build()\n';
  }

  if (isBodyRequired) {
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
        if (type === 'file') {
          if (typeof param.src !== 'string') {
            if (Array.isArray(param.src) && param.src.length) {
              param.src.forEach((filePath) => {
                addFormParam(formdataArray, key, param.type, filePath, disabled, contentType);
              });
            }
            else {
              addFormParam(formdataArray, key, param.type, '/path/to/file', disabled, contentType);
            }
          }
          else {
            addFormParam(formdataArray, key, param.type, param.src, disabled, contentType);
          }
        }
        else {
          addFormParam(formdataArray, key, param.type, param.value, disabled, contentType);
        }
      });
      request.body.update({
        mode: 'formdata',
        formdata: formdataArray
      });
    }

    const contentType = parseRequest.parseContentType(request),
      requestBody = (request.body ? request.body.toJSON() : {});
    //  snippet for creating mediatype object in java based on content-type of request
    snippet += `val mediaType = "${contentType}".toMediaType()\n`;
    snippet += parseRequest.parseBody(requestBody, indentString, options.trimRequestBody, contentType);
  }

  snippet += 'val request = Request.Builder()\n';
  snippet += indentString + `.url("${sanitize(request.url.toString())}")\n`;
  if (isBodyRequired) {
    switch (request.method) {
      case 'POST':
        snippet += indentString + '.post(body)\n';
        break;
      case 'PUT':
        snippet += indentString + '.put(body)\n';
        break;
      case 'PATCH':
        snippet += indentString + '.patch(body)\n';
        break;
      default:
        snippet += indentString + `.method("${request.method}", body)\n`;
    }
  }
  if (request.body && request.body.mode === 'graphql' && !request.headers.has('Content-Type')) {
    request.addHeader({
      key: 'Content-Type',
      value: 'application/json'
    });
  }
  //  kotlin-okhttp snippet for adding headers to request
  snippet += parseRequest.parseHeader(request, indentString);

  snippet += indentString + '.build()\n';
  snippet += 'val response = client.newCall(request).execute()';

  return snippet;
}

/**
 * Used in order to get options for generation of Java okhttp code snippet (i.e. Include Boilerplate code)
 *
 * @module getOptions
 *
 * @returns {Array} Options specific to generation of Java okhttp code snippet
 */
function getOptions () {
  return [{
    name: 'Include boilerplate',
    id: 'includeBoilerplate',
    type: 'boolean',
    default: false,
    description: 'Include class definition and import statements in snippet'
  },
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
    description: 'Set number of milliseconds the request should wait for a response ' +
        'before timing out (use 0 for infinity)'
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
 * Converts Postman sdk request object to java okhttp code snippet
 *
 * @module convert
 *
 * @param {Object} request - postman-SDK request object
 * @param {Object} options - Options to tweak code snippet generated in kotlin-okhttp
 * @param {String} options.indentType - type for indentation eg: Space, Tab
 * @param {String} options.indentCount - number of spaces or tabs for indentation.
 * @param {Boolean} [options.includeBoilerplate] - indicates whether to include class definition in java
 * @param {Boolean} options.followRedirect - whether to enable followredirect
 * @param {Boolean} options.trimRequestBody - whether to trim fields in request body or not
 * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
 * @param {Function} callback - callback function with parameters (error, snippet)
 */
function convert (request, options, callback) {

  if (_.isFunction(options)) {
    callback = options;
    options = {};
  }
  else if (!_.isFunction(callback)) {
    throw new Error('kotlin-okhttp-Converter: callback is not valid function');
  }
  options = sanitizeOptions(options, getOptions());
  //  String representing value of indentation required
  var indentString,

    //  snippets to include java class definition according to options
    headerSnippet = '',
    footerSnippet = '',

    //  snippet to create request in java okhttp
    snippet = '';

  indentString = options.indentType === 'Tab' ? '\t' : ' ';
  indentString = indentString.repeat(options.indentCount);

  if (options.includeBoilerplate) {
    // TODO: optimize imports
    headerSnippet = 'import okhttp3.MediaType.Companion.toMediaType\n' +
      'import okhttp3.MultipartBody\n' +
      'import okhttp3.OkHttpClient\n' +
      'import okhttp3.Request\n' +
      'import okhttp3.RequestBody.Companion.toRequestBody\n' +
      'import okhttp3.RequestBody.Companion.asRequestBody\n' +
      'import java.io.File\n' +
      'import java.util.concurrent.TimeUnit\n\n';

    footerSnippet = '\n\nprintln(response.body!!.string())\n';
  }

  snippet = makeSnippet(request, indentString, options);

  //  if boilerplate is included then two more indentString needs to be added in snippet
  // (options.includeBoilerplate) &&
  // (snippet = indentString.repeat(1) + snippet.split('\n').join('\n' + indentString.repeat(1)) + '\n');

  return callback(null, headerSnippet + snippet + footerSnippet);
}
module.exports = {
  convert: convert,
  getOptions: getOptions
};
