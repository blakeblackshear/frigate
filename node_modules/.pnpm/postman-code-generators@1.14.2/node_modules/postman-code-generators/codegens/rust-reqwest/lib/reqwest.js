const _ = require('lodash'),
  sanitizeOptions = require('./util/sanitize').sanitizeOptions,
  { parseHeader, parseBody } = require('./util/parseRequest'),
  { addDefaultContentType, formatFormData } = require('./util/formatRequest'),
  ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'PATH', 'TRACE'];

/**
 * Returns snippet for Rust reqwest by parsing data from Postman-SDK request object
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentation - indentation required for code snippet
 * @param {Object} options - Options for code generation
 *
 * @returns {String} - Rust reqwest code snippet for given request object
 */
function makeSnippet (request, indentation, options) {
  // Build the client - set timeout and redirect policy
  let snippet = '#[tokio::main]\n';
  snippet += 'async fn main() -> Result<(), Box<dyn std::error::Error>> {\n';
  snippet += `${indentation}let client = reqwest::Client::builder()\n`;

  // Disable redirects if option is set
  if (_.get(request, 'protocolProfileBehavior.followRedirects', options.followRedirect) === false) {
    snippet += `${indentation.repeat(2)}.redirect(reqwest::redirect::Policy::none())\n`;
  }

  snippet += `${indentation.repeat(2)}.build()?;\n\n`;

  addDefaultContentType(request);
  request.body && request.body.mode === 'formdata' && formatFormData(request);

  const body = request.body && request.body.toJSON(),
    contentType = request.headers.get('Content-Type'),
    { headerSnippet, requestHeaderSnippet } = parseHeader(request, indentation),
    { bodySnippet, requestBodySnippet } = parseBody(body, options.trimRequestBody, indentation, contentType);

  snippet += headerSnippet;
  snippet += bodySnippet;

  // Use short method name if possible
  let requestSnippet = '';
  if (ALLOWED_METHODS.includes(request.method)) {
    requestSnippet += `${indentation}let request = client.request(reqwest::Method::${request.method}, `;
  }
  else {
    requestSnippet += `${indentation}let method = "${request.method}";\n`;
    requestSnippet += `${indentation}let request = client.request(reqwest::Method::from_bytes(method.as_bytes())?, `;
  }

  // Add headers and body
  requestSnippet += `"${request.url.toString()}")\n`;
  requestSnippet += requestHeaderSnippet;
  requestSnippet += requestBodySnippet;

  // Set request timeout
  if (options.requestTimeout !== 0) {
    requestSnippet += `${indentation.repeat(2)}.timeout(std::time::Duration::from_millis(${options.requestTimeout}))\n`;
  }

  requestSnippet = requestSnippet.slice(0, -1) + ';\n\n';

  snippet += requestSnippet;
  snippet += `${indentation}let response = request.send().await?;\n`;
  snippet += `${indentation}let body = response.text().await?;\n\n`;

  snippet += `${indentation}println!("{}", body);\n\n`;
  snippet += `${indentation}Ok(())\n}`;

  return snippet;
}

const self = module.exports = {
  /**
     * Used to return options which are specific to a particular plugin
     *
     * @returns {Array}
     */
  getOptions: function () {
    return [
      {
        name: 'Set indentation count',
        id: 'indentCount',
        type: 'positiveInteger',
        default: 4,
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
      }];
  },

  /**
    * Used to convert the postman sdk-request object to rust snippet
    *
    * @param  {Object} request - postman SDK-request object
    * @param  {Object} options
    * @param  {String} options.indentType - type of indentation eg: Space / Tab (default: Space)
    * @param  {Number} options.indentCount - frequency of indent (default: 4 for indentType: Space,
                                                                    default: 1 for indentType: Tab)
    * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
                                                (default: 0 -> never bail out)
    * @param {Boolean} options.trimRequestBody : whether to trim request body fields (default: false)
    * @param {Boolean} options.followRedirect : whether to allow redirects of a request
    * @param  {Function} callback - function with parameters (error, snippet)
    */
  convert: function (request, options, callback) {
    if (!_.isFunction(callback)) {
      throw new Error('Rust~reqwest-convert: Callback is not a function');
    }
    options = sanitizeOptions(options, self.getOptions());

    //  String representing value of indentation required
    let indentString;

    indentString = options.indentType === 'Tab' ? '\t' : ' ';
    indentString = indentString.repeat(options.indentCount);

    return callback(null, makeSnippet(request, indentString, options));
  }
};
