var _ = require('./lodash'),
  sanitize = require('./util').sanitize,
  sanitizeMultiline = require('./util').sanitizeMultiline,
  sanitizeOptions = require('./util').sanitizeOptions,
  addFormParam = require('./util').addFormParam,
  getUrlStringfromUrlObject = require('./util').getUrlStringfromUrlObject,
  isFile = false,
  self;

/**
 * Parses Raw data to fetch syntax
 *
 * @param {Object} body Raw body data
 * @param {boolean} trim trim body option
 */
function parseRawBody (body, trim) {
  var bodySnippet;
  bodySnippet = `payload := strings.NewReader(\`${sanitizeMultiline(body.toString(), trim)}\`)`;
  return bodySnippet;
}

/**
 * Parses graphql data to golang syntax
 *
 * @param {Object} body Raw body data
 * @param {boolean} trim trim body option
 */
function parseGraphQL (body, trim) {
  let query = body ? body.query : '',
    graphqlVariables,
    bodySnippet;
  try {
    graphqlVariables = JSON.parse(body.variables);
  }
  catch (e) {
    graphqlVariables = {};
  }
  bodySnippet = `payload := strings.NewReader("${sanitize(JSON.stringify({
    query: query || '',
    variables: graphqlVariables
  }), trim)}")`;
  return bodySnippet;
}

/**
 * Parses URLEncoded body from request to fetch syntax
 *
 * @param {Object} body URLEncoded Body
 * @param {boolean} trim trim body option
 */
function parseURLEncodedBody (body, trim) {
  var payload, bodySnippet;
  payload = _.reduce(body, function (accumulator, data) {
    if (!data.disabled) {
      accumulator.push(`${encodeURIComponent(data.key, trim)}=${encodeURIComponent(data.value, trim)}`);
    }
    return accumulator;
  }, []).join('&');

  bodySnippet = `payload := strings.NewReader("${payload}")`;
  return bodySnippet;
}

/**
 * Parses formData body from request to fetch syntax
 *
 * @param {Object} body formData Body
 * @param {boolean} trim trim body option
 * @param {string} indent indent string
 */
function parseFormData (body, trim, indent) {
  var bodySnippet = `payload := &bytes.Buffer{}\n${indent}writer := multipart.NewWriter(payload)\n`;
  _.forEach(body, function (data, index) {
    if (!data.disabled) {
      if (data.type === 'file') {
        isFile = true;
        bodySnippet += `${indent}file, errFile${index + 1} := os.Open("${data.src}")\n`;
        bodySnippet += `${indent}defer file.Close()\n`;
        bodySnippet += `${indent}part${index + 1},
         errFile${index + 1} := writer.CreateFormFile("${sanitize(data.key, trim)}",` +
          `filepath.Base("${data.src}"))\n`;
        bodySnippet += `${indent}_, errFile${index + 1} = io.Copy(part${index + 1}, file)\n`;
        bodySnippet += `${indent}if errFile${index + 1} != nil {` +
          `\n${indent.repeat(2)}fmt.Println(errFile${index + 1})\n` +
          `${indent.repeat(2)}return\n${indent}}\n`;
      }
      else if (data.contentType) {
        bodySnippet += `\n${indent}mimeHeader${index + 1} := make(map[string][]string)\n`;
        bodySnippet += `${indent}mimeHeader${index + 1}["Content-Disposition"] = `;
        bodySnippet += `append(mimeHeader${index + 1}["Content-Disposition"], "form-data; `;
        bodySnippet += `name=\\"${sanitize(data.key, trim)}\\"")\n`;
        bodySnippet += `${indent}mimeHeader${index + 1}["Content-Type"] = append(`;
        bodySnippet += `mimeHeader${index + 1}["Content-Type"], "${data.contentType}")\n`;
        bodySnippet += `${indent}fieldWriter${index + 1}, _ := writer.CreatePart(mimeHeader${index + 1})\n`;
        bodySnippet += `${indent}fieldWriter${index + 1}.Write([]byte("${sanitize(data.value, trim)}"))\n\n`;
      }
      else {
        bodySnippet += `${indent}_ = writer.WriteField("${sanitize(data.key, trim)}",`;
        bodySnippet += ` "${sanitize(data.value, trim)}")\n`;
      }
    }
  });
  bodySnippet += `${indent}err := writer.Close()\n${indent}if err != nil ` +
  `{\n${indent.repeat(2)}fmt.Println(err)\n` +
  `${indent.repeat(2)}return\n${indent}}\n`;
  return bodySnippet;
}

/**
 * Parses file body from the Request
 *
 */
function parseFile () {
  // var bodySnippet = `payload := &bytes.Buffer{}\n${indent}writer := multipart.NewWriter(payload)\n`;
  // isFile = true;
  // bodySnippet += `${indent}// add your file name in the next statement in place of path\n`;
  // bodySnippet += `${indent}file, err := os.Open(path)\n`;
  // bodySnippet += `${indent}defer file.Close()\n`;
  // bodySnippet += `${indent}part, err := writer.CreateFormFile("file", filepath.Base(path))\n`;
  // bodySnippet += `${indent}_, err := io.Copy(part, file)\n`;
  // bodySnippet += `${indent}err := writer.Close()\n${indent}if err != nil {${indent}fmt.Println(err)}\n`;
  var bodySnippet = 'payload := strings.NewReader("<file contents here>")\n';
  return bodySnippet;
}

/**
 * Parses Body from the Request
 *
 * @param {Object} body body object from request.
 * @param {boolean} trim trim body option
 * @param {string} indent indent string
 */
function parseBody (body, trim, indent) {
  if (!_.isEmpty(body)) {
    switch (body.mode) {
      case 'urlencoded':
        return parseURLEncodedBody(body.urlencoded, trim);
      case 'raw':
        return parseRawBody(body.raw, trim);
      case 'graphql':
        return parseGraphQL(body.graphql, trim);
      case 'formdata':
        return parseFormData(body.formdata, trim, indent);
      case 'file':
        return parseFile(body.file, trim, indent);
      default:
        return '';
    }
  }
  return '';
}

/**
 * Parses headers from the request.
 *
 * @param {Object} headers headers from the request.
 * @param {string} indent indent string
 */
function parseHeaders (headers, indent) {
  var headerSnippet = '';
  if (!_.isEmpty(headers)) {
    headers = _.reject(headers, 'disabled');
    _.forEach(headers, function (header) {
      headerSnippet += `${indent}req.Header.Add("${sanitize(header.key, true)}", "${sanitize(header.value)}")\n`;
    });
  }
  return headerSnippet;
}

self = module.exports = {
  convert: function (request, options, callback) {

    if (!_.isFunction(callback)) {
      throw new Error('GoLang-Converter: callback is not valid function');
    }
    options = sanitizeOptions(options, self.getOptions());

    var codeSnippet, indent, trim, timeout, followRedirect,
      bodySnippet = '',
      responseSnippet = '',
      headerSnippet = '';

    indent = options.indentType === 'Tab' ? '\t' : ' ';
    indent = indent.repeat(options.indentCount);
    timeout = options.requestTimeout;
    followRedirect = options.followRedirect;
    trim = options.trimRequestBody;

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
    if (request.body) {
      bodySnippet = parseBody(request.body.toJSON(), trim, indent);
    }

    codeSnippet = 'package main\n\n';
    codeSnippet += `import (\n${indent}"fmt"\n`;
    if (timeout > 0) {
      codeSnippet += `${indent}"time"\n`;
    }
    if (request.body && request.body.toJSON().mode === 'formdata') {
      codeSnippet += `${indent}"bytes"\n${indent}"mime/multipart"\n`;
    }
    else if (bodySnippet !== '') {
      codeSnippet += `${indent}"strings"\n`;
    }
    if (isFile) {
      codeSnippet += `${indent}"os"\n${indent}"path/filepath"\n`;

      // Setting isFile as false for further calls to this function
      isFile = false;
    }
    codeSnippet += `${indent}"net/http"\n${indent}"io"\n)\n\n`;

    codeSnippet += `func main() {\n\n${indent}url := "${getUrlStringfromUrlObject(request.url)}"\n`;
    codeSnippet += `${indent}method := "${request.method}"\n\n`;

    if (bodySnippet !== '') {
      codeSnippet += indent + bodySnippet + '\n\n';
    }

    if (timeout > 0) {
      codeSnippet += `${indent}timeout := time.Duration(${timeout / 1000} * time.Second)\n`;
    }

    codeSnippet += indent + 'client := &http.Client {\n';
    if (!followRedirect) {
      codeSnippet += indent.repeat(2) + 'CheckRedirect: func(req *http.Request, via []*http.Request) ';
      codeSnippet += 'error {\n';
      codeSnippet += `${indent.repeat(3)}return http.ErrUseLastResponse\n${indent.repeat(2)}},\n`;
    }
    if (timeout > 0) {
      codeSnippet += indent.repeat(2) + 'Timeout: timeout,\n';
    }
    codeSnippet += indent + '}\n';
    if (bodySnippet !== '') {
      codeSnippet += `${indent}req, err := http.NewRequest(method, url, payload)\n\n`;
    }
    else {
      codeSnippet += `${indent}req, err := http.NewRequest(method, url, nil)\n\n`;
    }
    codeSnippet += `${indent}if err != nil {\n${indent.repeat(2)}fmt.Println(err)\n`;
    codeSnippet += `${indent.repeat(2)}return\n${indent}}\n`;
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
    headerSnippet = parseHeaders(request.toJSON().header, indent);
    if (headerSnippet !== '') {
      codeSnippet += headerSnippet + '\n';
    }
    if (request.body && (request.body.toJSON().mode === 'formdata')) {
      codeSnippet += `${indent}req.Header.Set("Content-Type", writer.FormDataContentType())\n`;
    }
    responseSnippet = `${indent}res, err := client.Do(req)\n`;
    responseSnippet += `${indent}if err != nil {\n${indent.repeat(2)}fmt.Println(err)\n`;
    responseSnippet += `${indent.repeat(2)}return\n${indent}}\n`;
    responseSnippet += `${indent}defer res.Body.Close()\n\n${indent}body, err := io.ReadAll(res.Body)\n`;
    responseSnippet += `${indent}if err != nil {\n${indent.repeat(2)}fmt.Println(err)\n`;
    responseSnippet += `${indent.repeat(2)}return\n${indent}}\n`;
    responseSnippet += `${indent}fmt.Println(string(body))\n}`;

    codeSnippet += responseSnippet;
    callback(null, codeSnippet);
  },
  getOptions: function () {
    return [{
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
      description: 'Set number of milliseconds the request should wait for a ' +
        'response before timing out (use 0 for infinity)'
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
  }
};
