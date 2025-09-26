var _ = require('./lodash'),
  sanitize = require('./util').sanitize,
  sanitizeOptions = require('./util').sanitizeOptions,
  addFormParam = require('./util').addFormParam,
  getUrlStringfromUrlObject = require('./util').getUrlStringfromUrlObject,
  self;

/**
 * Parses Raw data from request to fetch syntax
 *
 * @param {Object} body - Raw body data
 * @param {String} mode - Request body type (i.e. raw, urlencoded, formdata, file)
 * @param {boolean} trim - trim body option
 * @returns {String} request body in the desired format
 */
function parseRawBody (body, mode, trim) {
  var bodySnippet;
  bodySnippet = `let postData = ref ${sanitize(body, mode, trim)};;\n\n`;
  return bodySnippet;
}

/**
 * Parses graphql data from request to fetch syntax
 *
 * @param {Object} body - graphql body data
 * @param {String} mode - Request body type (i.e. raw, urlencoded, formdata, file)
 * @param {boolean} trim - trim body option
 * @returns {String} request body in the desired format
 */
function parseGraphQL (body, mode, trim) {
  let query = body.query,
    graphqlVariables,
    bodySnippet;
  try {
    graphqlVariables = JSON.parse(body.variables);
  }
  catch (e) {
    graphqlVariables = {};
  }
  bodySnippet = `let postData = ref ${sanitize(JSON.stringify({
    query: query,
    variables: graphqlVariables
  }), mode, trim)};;\n\n`;
  return bodySnippet;
}

/**
 * Parses URLEncoded body from request to fetch syntax
 *
 * @param {Object} body - URLEncoded Body
 * @param {String} mode - Request body type (i.e. raw, urlencoded, formdata, file)
 * @param {boolean} trim - trim body option
 * @returns {String} request body in the desired format
 */
function parseURLEncodedBody (body, mode, trim) {
  var payload, bodySnippet;
  payload = _.reduce(body, function (accumulator, data) {
    if (!data.disabled) {
      accumulator.push(`${sanitize(data.key, mode, trim)}=${sanitize(data.value, mode, trim)}`);
    }
    return accumulator;
  }, []).join('&');

  bodySnippet = `let postData = ref "${payload}";;\n\n`;
  return bodySnippet;
}

/**
 * Parses formData body from request to fetch syntax
 *
 * @param {Object} body - formData Body
 * @param {boolean} trim - trim body option
 * @param {String} indent - indentation string
 * @returns {String} request body in the desired format
 */
function parseFormData (body, trim, indent) {
  var parameters = '[|\n' + _.reduce(body, (accumalator, data) => {
      if (!data.disabled || data.disabled === false) {
        const key = sanitize(data.key, 'formdata-key', trim);

        if (data.type === 'file') {
          const filename = data.src;
          accumalator.push(`${indent}[| ("name", "${key}"); ("fileName", "${filename}") |]`);
        }
        else {
          const value = sanitize(data.value, 'formdata-value', trim);
          accumalator.push(`${indent}[| ("name", "${key}"); ("value", "${value}")` +
            (data.contentType ? `; ("contentType", "${data.contentType}")` : '') +
            ' |]');
        }
      }
      return accumalator;
    }, []).join(';\n') + '\n|];;',
    bodySnippet = '';

  bodySnippet = `let parameters = ${parameters}\n`;
  bodySnippet += 'let boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";;\n';
  bodySnippet += 'let postData = ref "";;\n\n';
  bodySnippet += 'for x = 0 to Array.length parameters - 1 do\n';
  bodySnippet += `${indent}let (_, paramName) = parameters.(x).(0) in\n`;
  bodySnippet += `${indent}let (paramType, _) = parameters.(x).(1) in\n`;
  bodySnippet += `${indent}let accum = "--" ^ boundary ^ "\\r\\n" ^ "Content-Disposition: form-data; `;
  bodySnippet += 'name=\\"" ^ paramName ^ "\\"" in\n';
  bodySnippet += `${indent}if paramType = "value" then (\n`;
  bodySnippet += `${indent.repeat(2)}let (_, paramValue) = parameters.(x).(1) in\n`;
  bodySnippet += `${indent.repeat(2)}postData := if Array.length parameters.(x) == 3 then (\n`;
  bodySnippet += `${indent.repeat(3)}let (_, contentType) = parameters.(x).(2) in\n`;
  bodySnippet += `${indent.repeat(3)}!postData ^ accum ^ "\\r\\n" ^ "Content-Type: " ^ contentType ^`;
  bodySnippet += ' "\\r\\n\\r\\n" ^ paramValue ^ "\\r\\n"\n';
  bodySnippet += `${indent.repeat(2)}) else (\n`;
  bodySnippet += `${indent.repeat(3)}!postData ^ accum ^ "\\r\\n\\r\\n" ^ paramValue ^ "\\r\\n"\n`;
  bodySnippet += `${indent.repeat(2)});\n`;
  bodySnippet += `${indent})\n`;
  bodySnippet += `${indent}else if paramType = "fileName" then (\n`;
  bodySnippet += `${indent.repeat(2)}let (_, filepath) = parameters.(x).(1) in\n`;
  bodySnippet += `${indent.repeat(2)}postData := !postData ^ accum ^ "; filename=\\""^ filepath ^"\\"\\r\\n";\n`;
  bodySnippet += `${indent.repeat(2)}let ch = open_in filepath in\n`;
  bodySnippet += `${indent.repeat(3)}let fileContent = really_input_string ch (in_channel_length ch) in\n`;
  bodySnippet += `${indent.repeat(3)}close_in ch;\n`;
  bodySnippet += `${indent.repeat(2)}postData := !postData ^ "Content-Type: {content-type header}`;
  bodySnippet += `\\r\\n\\r\\n"^ fileContent ^"\\r\\n";\n${indent})\n`;
  bodySnippet += 'done;;\n';
  bodySnippet += 'postData := !postData ^ "--" ^ boundary ^ "--"\n\n';
  return bodySnippet;
}

/**
 * Parses file body from the Request
 *
 * @returns {String} request body in the desired format
 */
function parseFile () {
  // var bodySnippet = 'let load_file f =\n';
  // bodySnippet += `${indent}let ic = open_in f in\n`;
  // bodySnippet += `${indent}let n = in_channel_length ic in\n`;
  // bodySnippet += `${indent}let s = Bytes.create n in\n`;
  // bodySnippet += `${indent}really_input ic s 0 n;\n`;
  // bodySnippet += `${indent}close_in ic;\n${indent}(s)\n\n`;
  // bodySnippet += 'let postData = ref "";;\n';
  // bodySnippet += 'postData := load_file("{Insert_File_Name}");;\n\n';
  var bodySnippet = 'let postData = ref "<file contents here>";;\n\n';
  return bodySnippet;
}

/**
 * Parses Body from the Request using
 *
 * @param {Object} body - body object from request.
 * @param {boolean} trim - trim body option
 * @param {String} indent - indentation string
 * @returns {String} utility function for getting request body in the desired format
 */
function parseBody (body, trim, indent) {
  if (!_.isEmpty(body) && (!_.isEmpty(body[body.mode]))) {
    switch (body.mode) {
      case 'urlencoded':
        return parseURLEncodedBody(body.urlencoded, body.mode, trim);
      case 'raw':
        return parseRawBody(body.raw, body.mode, trim);
      case 'graphql':
        return parseGraphQL(body.graphql, 'raw', trim);
      case 'formdata':
        return parseFormData(body.formdata, trim, indent);
        /* istanbul ignore next */
      case 'file':
        return parseFile(indent);
      default:
        return '';
    }
  }
  return '';
}

/**
 * Parses headers from the request.
 *
 * @param {String} bodyMode - request body type i.e. formdata, file etc.
 * @param {Object} headers - headers from the request.
 * @param {String} indent - indent indent string
 * @returns {String} request headers in the desired format
 */
function parseHeaders (bodyMode, headers, indent) {
  var headerSnippet = '';
  if (!_.isEmpty(headers)) {
    headers = _.reject(headers, 'disabled');
    headerSnippet += `${indent}let headers = Header.init ()\n`;
    _.forEach(headers, function (header) {
      headerSnippet += `${indent.repeat(2)}|> fun h -> Header.add h "${sanitize(header.key, 'header', true)}" `;
      headerSnippet += `"${sanitize(header.value, 'header')}"\n`;
    });
  }
  if (bodyMode === 'formdata') {
    if (headerSnippet === '') {
      headerSnippet += `${indent}let headers = Header.init ()\n`;
    }
    headerSnippet += `${indent.repeat(2)}|> fun h -> Header.add h "content-type" "multipart/form-data;`;
    headerSnippet += ' boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW"\n';
  }
  return headerSnippet;
}

/**
 * Gets request method argument to pass for ocaml call function
 *
 * @param {String} method - method type of request
 * @returns {String} Method argument for ocaml call function
 */
function getMethodArg (method) {
  var methodArg = '',
    supportedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
    flag = false;

  _.forEach(supportedMethods, (value) => {
    if (value === method) {
      flag = true;
    }
  });

  if (flag) {
    methodArg = '`' + method;
  }
  else {
    methodArg = `(Code.method_of_string "${method}")`;
  }
  return methodArg;
}

self = module.exports = {
  /**
     * Used in order to get options for generation of OCaml code snippet
     *
     * @module getOptions
     *
     * @returns {Array} Options specific to generation of OCaml-Cohttp code snippet
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
        availableOptions: ['Tab', 'Space'],
        default: 'Space',
        description: 'Select the character used to indent lines of code'
      },
      {
        name: 'Trim request body fields',
        id: 'trimRequestBody',
        type: 'boolean',
        default: false,
        description: 'Remove white space and additional lines that may affect the server\'s response'
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
      }
    ];
  },

  /**
    * Used to convert the postman sdk-request object in OCaml-Cohttp request snippet
    *
    * @module convert
    *
    * @param  {Object} request - postman SDK-request object
    * @param  {Object} options
    * @param  {String} options.indentType - type of indentation eg: Space / Tab (default: Space)
    * @param  {Number} options.indentCount - frequency of indent (default: 4 for indentType: Space,
                                                                    default: 1 for indentType: Tab)
    * @param {Number} options.requestTimeout - time in milli-seconds after which request will bail out
                                                (default: 0 -> never bail out)
    * @param {Boolean} options.trimRequestBody - whether to trim request body fields (default: false)
    * @param {Boolean} options.followRedirect - whether to allow redirects of a request
    * @param  {Function} callback - function with parameters (error, snippet)
    * @returns {String} - returns generated Ocaml snippet via callback
    */
  convert: function (request, options, callback) {

    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }
    else if (!_.isFunction(callback)) {
      throw new Error('OCaml-Cohttp-Converter: callback is not valid function');
    }
    options = sanitizeOptions(options, self.getOptions());

    var codeSnippet, indent, trim, finalUrl, methodArg, // timeout, followRedirect,
      bodySnippet = '',
      headerSnippet = '',
      requestBody,
      requestBodyMode = (request.body ? request.body.mode : 'raw');

    indent = options.indentType === 'Tab' ? '\t' : ' ';
    indent = indent.repeat(options.indentCount);
    // timeout = options.requestTimeout;
    // followRedirect = options.followRedirect;
    trim = options.trimRequestBody;
    finalUrl = getUrlStringfromUrlObject(request.url);
    methodArg = getMethodArg(request.method);
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
    headerSnippet += parseHeaders(requestBodyMode, request.toJSON().header, indent);

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

    requestBody = (request.body ? request.body.toJSON() : {});
    bodySnippet = parseBody(requestBody, trim, indent);

    // Starting to add in codeSnippet
    codeSnippet = 'open Lwt\nopen Cohttp\nopen Cohttp_lwt_unix\n\n';
    if (bodySnippet !== '') {
      codeSnippet += bodySnippet;
    }
    codeSnippet += 'let reqBody = \n';
    codeSnippet += `${indent}let uri = Uri.of_string "${finalUrl}" in\n`;
    if (headerSnippet !== '') {
      codeSnippet += headerSnippet;
      codeSnippet += `${indent}in\n`;
    }
    if (bodySnippet !== '') {
      codeSnippet += `${indent}let body = Cohttp_lwt.Body.of_string !postData in\n\n`;
    }
    codeSnippet += `${indent}Client.call `;
    if (headerSnippet !== '') {
      codeSnippet += '~headers ';
    }
    if (bodySnippet !== '') {
      codeSnippet += '~body ';
    }
    codeSnippet += `${methodArg} uri >>= fun (_resp, body) ->\n`;
    codeSnippet += `${indent}body |> Cohttp_lwt.Body.to_string >|= fun body -> body\n\n`;
    codeSnippet += 'let () =\n';
    codeSnippet += `${indent}let respBody = Lwt_main.run reqBody in\n`;
    codeSnippet += `${indent}print_endline (respBody)`;
    return callback(null, codeSnippet);
  }
};
