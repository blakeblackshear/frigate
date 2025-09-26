var _ = require('./lodash'),

  parseRequest = require('./parseRequest'),
  sanitize = require('./util').sanitize,
  addFormParam = require('./util').addFormParam,
  sanitizeOptions = require('./util').sanitizeOptions;

//  Since Java OkHttp requires to add extralines of code to handle methods with body
const METHODS_WITHOUT_BODY = ['HEAD', 'COPY', 'UNLOCK', 'UNLINK', 'PURGE', 'LINK', 'VIEW'];

/**
 * returns snippet of java okhttp by parsing data from Postman-SDK request object
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation required for code snippet
 * @param {Object} options - Options to tweak code snippet
 * @returns {String} - java okhttp code snippet for given request object
 */
function makeSnippet (request, indentString, options) {

  var isBodyRequired = !(_.includes(METHODS_WITHOUT_BODY, request.method)),
    snippet = 'OkHttpClient client = new OkHttpClient().newBuilder()\n',
    requestBody;

  if (options.requestTimeout > 0) {
    snippet += indentString + `.setConnectTimeout(${options.requestTimeout}, TimeUnit.MILLISECONDS)\n`;
  }

  if (!options.followRedirect) {
    snippet += indentString + '.followRedirects(false)\n';
  }

  snippet += indentString + '.build();\n';

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
    requestBody = (request.body ? request.body.toJSON() : {});
    //  snippet for creating mediatype object in java based on content-type of request
    snippet += `MediaType mediaType = MediaType.parse("${parseRequest.parseContentType(request)}");\n`;
    snippet += parseRequest.parseBody(requestBody, indentString, options.trimRequestBody);
  }

  snippet += 'Request request = new Request.Builder()\n';
  snippet += indentString + `.url("${sanitize(request.url.toString())}")\n`;
  snippet += indentString + `.method("${request.method}", ${isBodyRequired ? 'body' : 'null'})\n`;
  if (request.body && request.body.mode === 'graphql' && !request.headers.has('Content-Type')) {
    request.addHeader({
      key: 'Content-Type',
      value: 'application/json'
    });
  }
  //  java-okhttp snippet for adding headers to request
  snippet += parseRequest.parseHeader(request, indentString);

  snippet += indentString + '.build();\n';
  snippet += 'Response response = client.newCall(request).execute();';

  return snippet;
}

/**
 * Used in order to get options for generation of Java okhattp code snippet (i.e. Include Boilerplate code)
 *
 * @module getOptions
 *
 * @returns {Array} Options specific to generation of Java okhattp code snippet
 */
function getOptions () {
  return [
    {
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
 * @param {Object} options - Options to tweak code snippet generated in Java-OkHttp
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
    throw new Error('Java-OkHttp-Converter: callback is not valid function');
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
    headerSnippet = 'import java.io.*;\n' +
                        'import okhttp3.*;\n' +
                        'public class Main {\n' +
                        indentString + 'public static void main(String []args) throws IOException{\n';
    footerSnippet = indentString.repeat(2) + 'System.out.println(response.body().string());\n' +
                        indentString + '}\n}\n';
  }

  snippet = makeSnippet(request, indentString, options);

  //  if boilerplate is included then two more indentString needs to be added in snippet
  (options.includeBoilerplate) &&
    (snippet = indentString.repeat(2) + snippet.split('\n').join('\n' + indentString.repeat(2)) + '\n');

  return callback(null, headerSnippet + snippet + footerSnippet);
}
module.exports = {
  convert: convert,
  getOptions: getOptions
};
