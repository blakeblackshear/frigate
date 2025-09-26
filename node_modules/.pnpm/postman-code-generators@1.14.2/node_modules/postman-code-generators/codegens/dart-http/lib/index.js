var _ = require('./lodash'),
  sanitizeOptions = require('./util').sanitizeOptions,
  sanitize = require('./util').sanitize,
  addFormParam = require('./util').addFormParam,
  self;

/**
 * Parses Url encoded data
 *
 * @param {Object} body body data
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseUrlEncoded (body, indent, trim) {
  var bodySnippet = 'request.bodyFields = {',
    enabledBodyList = _.reject(body, 'disabled'),
    bodyDataMap;
  if (!_.isEmpty(enabledBodyList)) {
    bodyDataMap = _.map(enabledBodyList, function (value) {
      return `${indent}'${sanitize(value.key, trim)}': '${sanitize(value.value, trim)}'`;
    });
    bodySnippet += '\n' + bodyDataMap.join(',\n') + '\n';
  }
  bodySnippet += '};';
  return bodySnippet;
}

/**
 * Parses Raw data
 *
 * @param {Object} body Raw body data
 * @param {Boolean} trim indicates whether to trim string or not
 * @param {String} contentType the content-type of request body
 * @param {Integer} indentCount the number of space to use
 */
function parseRawBody (body, trim, contentType, indentCount) {
  if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
    try {
      let jsonBody = JSON.parse(body);
      return `request.body = json.encode(${JSON.stringify(jsonBody, null, indentCount)});`;

    }
    catch (error) {
      // Do nothing
    }
  }
  return `request.body = '''${sanitize(body, trim)}''';`;
}

/**
 * Parses GraphQL body
 *
 * @param {Object} body GraphQL body
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseGraphQLBody (body, trim) {
  var bodySnippet = '',
    query = body ? body.query : '',
    graphqlVariables;
  try {
    graphqlVariables = JSON.parse(body.variables);
  }
  catch (e) {
    graphqlVariables = {};
  }

  bodySnippet += `request.body = '''${sanitize(JSON.stringify({
    query: query,
    variables: graphqlVariables
  }), trim)}''';\n`;

  return bodySnippet;
}

/**
 * Parses form data body from request
 *
 * @param {Object} body form data Body
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseFormData (body, indent, trim) {
  let bodySnippet = '',
    formDataArray = [],
    formDataFileArray = [],
    key,
    value;

  if (_.isEmpty(body)) {
    return bodySnippet;
  }

  _.forEach(body, function (data) {
    key = trim ? data.key.trim() : data.key;
    value = trim ? data.value.trim() : data.value;
    if (!data.disabled) {
      if (data.type === 'file') {
        formDataFileArray.push(`request.files.add(await http.MultipartFile.fromPath('${key}', '${data.src}'));`);
      }
      else {
        formDataArray.push(`${indent}'${sanitize(key)}': '${sanitize(value, trim)}'`);
      }
    }
  });

  if (formDataArray.length > 0) {
    bodySnippet += 'request.fields.addAll({\n';
    bodySnippet += formDataArray.join(',\n');
    bodySnippet += '\n});\n';
  }

  if (formDataFileArray.length > 0) {
    bodySnippet += formDataFileArray.join('\n');
  }

  return bodySnippet;
}

/**
 * Parses Body from the Request
 *
 * @param {Object} body body object from request.
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 * @param {String} contentType the content-type of the request body
 */
function parseBody (body, indent, trim, contentType) {
  if (!_.isEmpty(body)) {
    switch (body.mode) {
      case 'urlencoded':
        return parseUrlEncoded(body.urlencoded, indent, trim);
      case 'raw':
        return parseRawBody(body.raw, trim, contentType, indent.length);
      case 'formdata':
        return parseFormData(body.formdata, indent, trim);
      case 'graphql':
        return parseGraphQLBody(body.graphql, trim);
      case 'file':
        return 'request.body = r\'<file contents here>\';\n';
      default:
        return '';
    }
  }
  return '';
}

/**
 * Parses headers from the request.
 *
 * @param {Object} headersArray array containing headers
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseHeaders (headersArray, indent, trim) {
  var headerString = '',
    headerDictionary = [];
  if (_.isEmpty(headersArray)) {
    return headerString;
  }

  headerString += 'var headers = {\n';

  _.forEach(headersArray, function (header) {
    if (!header.disabled) {
      headerDictionary.push(indent + '\'' + header.key + '\': \'' + sanitize(header.value, trim) + '\'');
    }
  });

  headerString += headerDictionary.join(',\n');
  headerString += '\n};\n';

  return headerString;
}

self = module.exports = {
  convert: function (request, options, callback) {
    var indent,
      codeSnippet = '',
      headerSnippet = '',
      footerSnippet = '',
      trim,
      timeout,
      followRedirect,
      contentType;
    options = sanitizeOptions(options, self.getOptions());

    trim = options.trimRequestBody;
    indent = options.indentType === 'Tab' ? '\t' : ' ';
    indent = indent.repeat(options.indentCount);
    timeout = options.requestTimeout;
    followRedirect = options.followRedirect;

    if (!_.isFunction(callback)) {
      throw new Error('Callback is not valid function');
    }

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

    contentType = request.headers.get('Content-Type');
    if (options.includeBoilerplate) {
      if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
        headerSnippet = 'import \'dart:convert\';\n';
      }
      headerSnippet += 'import \'package:http/http.dart\' as http;\n\n';
      headerSnippet += 'void main() async {\n';
      footerSnippet = '}\n';
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

    const headers = parseHeaders(request.headers.toJSON(), indent, trim),
      requestBody = request.body ? request.body.toJSON() : {},
      body = parseBody(requestBody, indent, trim, contentType) + '\n';

    codeSnippet += headers;

    if (requestBody && requestBody.mode === 'formdata') {
      codeSnippet += `var request = http.MultipartRequest('${request.method.toUpperCase()}',` +
        ` Uri.parse('${request.url.toString()}'));\n`;
    }
    else {
      codeSnippet += `var request = http.Request('${request.method.toUpperCase()}',` +
      ` Uri.parse('${request.url.toString()}'));\n`;
    }

    if (body !== '') {
      codeSnippet += body;
    }
    if (headers !== '') {
      codeSnippet += 'request.headers.addAll(headers);\n';
    }
    if (!followRedirect) {
      codeSnippet += 'request.followRedirects = false;\n';
    }

    codeSnippet += '\n';

    codeSnippet += 'http.StreamedResponse response = await request.send()';
    if (timeout > 0) {
      codeSnippet += `.timeout(Duration(milliseconds: ${timeout}))`;
    }
    codeSnippet += ';\n\n';
    codeSnippet += 'if (response.statusCode == 200) {\n';
    codeSnippet += `${indent}print(await response.stream.bytesToString());\n`;
    codeSnippet += '}\nelse {\n';
    codeSnippet += `${indent}print(response.reasonPhrase);\n`;
    codeSnippet += '}\n';

    //  if boilerplate is included then two more indent needs to be added in snippet
    (options.includeBoilerplate) &&
    (codeSnippet = indent + codeSnippet.split('\n').join('\n' + indent) + '\n');

    callback(null, headerSnippet + codeSnippet + footerSnippet);
  },
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
      },
      {
        name: 'Include boilerplate',
        id: 'includeBoilerplate',
        type: 'boolean',
        default: false,
        description: 'Include class definition and import statements in snippet'
      },
      {
        name: 'Follow redirects',
        id: 'followRedirect',
        type: 'boolean',
        default: true,
        description: 'Automatically follow HTTP redirects'
      }
    ];
  }
};
