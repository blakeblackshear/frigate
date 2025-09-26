
var _ = require('./lodash'),
  sanitize = require('./util').sanitize;

/**
 * Parses body of request specific requests having form data
 *
 * @param {Object} requestBody - JSON object representing body of request
 * @param {Boolean} trimFields - indicates whether to trim fields of body
 * @returns {String} code snippet of csharp-restsharp for multipart formdata
 */
function parseFormData (requestBody, trimFields) {
  if (!Array.isArray(requestBody[requestBody.mode])) {
    return '';
  }

  return requestBody[requestBody.mode].reduce((body, data) => {
    if (data.disabled) {
      return body;
    }
    if (data.type === 'file') {
      body += `request.AddFile("${sanitize(data.key, trimFields)}", "${sanitize(data.src, trimFields)}");\n`;
    }
    else {
      (!data.value) && (data.value = '');
      body += `request.AddParameter("${sanitize(data.key, trimFields)}", ` +
                `"${sanitize(data.value, trimFields)}");\n`;
    }

    return body;
  }, '');
}

/**
 * Returns content-type of request body if available else returns text/plain as default
 *
 * @param {Object} request - Postman SDK request object
 * @returns {String} content-type of request body
 */
function parseContentType (request) {
  return request.getHeaders({enabled: true, ignoreCase: true})['content-type'] || 'text/plain';
}

/**
 * Generates a parameter using AddStringBody method
 *
 * @param {Object} requestBody - JSON object representing body of request
 * @param {string} dataFormat - the data format to use "DataFormat.Json" or "DataFormat.Xml"
 * @returns {String} snippet of the parameter generation
 */
function getAddStringBodyParam (requestBody, dataFormat) {
  return `var body = ${requestBody[requestBody.mode]
    .split('\n')
    .map((line) => { return '@"' + line.replace(/"/g, '""') + '"'; })
    .join(' + "\\n" +\n')};\n` +
    `request.AddStringBody(body, ${dataFormat});\n`;
}

/**
 * Parses Raw data
 *
 * @param {Object} request - JSON object representing body of request
 * @param {Object} requestBody - JSON object representing body of request
 * @returns {String} snippet of the body generation
 */
function parseRawBody (request, requestBody) {
  let bodySnippet = '',
    contentType = parseContentType(request);
  if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
    bodySnippet = getAddStringBodyParam(requestBody, 'DataFormat.Json');
  }
  else if (contentType && (contentType === 'text/xml' || contentType.match(/\+xml$/))) {
    bodySnippet = getAddStringBodyParam(requestBody, 'DataFormat.Xml');
  }
  else {
    bodySnippet = `var body = ${requestBody[requestBody.mode]
      .split('\n')
      .map((line) => { return '@"' + line.replace(/"/g, '""') + '"'; })
      .join(' + "\\n" +\n')};\n` +
      `request.AddParameter("${contentType}", ` +
      'body,  ParameterType.RequestBody);\n';
  }

  return bodySnippet;
}

/**
 *
 * @param {Object} requestBody - JSON object representing body of request
 * @param {boolean} trimFields - Boolean denoting whether to trim body fields
 * @returns {String} code snippet for graphql body
 */
function parseGraphQL (requestBody, trimFields) {
  let query = requestBody.graphql ? requestBody.graphql.query : '',
    graphqlVariables = requestBody.graphql ? requestBody.graphql.variables : '{}';
  try {
    graphqlVariables = JSON.parse(graphqlVariables || '{}');
  }
  catch (e) {
    graphqlVariables = {};
  }
  return 'request.AddParameter("application/json", ' +
          `"${sanitize(JSON.stringify({query: query || '', variables: graphqlVariables}), trimFields)}",
           ParameterType.RequestBody);\n`;

}

/**
 * Parses request object and returns csharp-restsharp code snippet for adding request body
 *
 * @param {Object} request - JSON object representing body of request
 * @param {Boolean} trimFields - indicates whether to trim fields of body
 * @returns {String} code snippet of csharp-restsharp parsed from request object
 */
function parseBody (request, trimFields) {
  var requestBody = request.body ? request.body.toJSON() : {};
  if (!_.isEmpty(requestBody)) {
    switch (requestBody.mode) {
      case 'urlencoded':
        return parseFormData(requestBody, trimFields);
      case 'formdata':
        return parseFormData(requestBody, trimFields);
      case 'raw':
        return parseRawBody(request, requestBody);
      case 'graphql':
        return parseGraphQL(requestBody, trimFields);
        /* istanbul ignore next */
      case 'file':
        return `request.AddParameter("${parseContentType(request)}", ` +
                    '"<file contents here>", ParameterType.RequestBody);\n';
      default:
        return '';
    }
  }
  return '';
}

/**
 * Parses header in Postman-SDK request and returns code snippet of csharp-restsharp for adding headers
 *
 * @param {Object} requestJson - Postman SDK request object
 * @returns {String} code snippet for adding headers in csharp-restsharp
 */
function parseHeader (requestJson) {
  if (!Array.isArray(requestJson.header)) {
    return '';
  }

  return requestJson.header.reduce((headerSnippet, header) => {
    if (!header.disabled) {
      if (sanitize(header.key, true).toLowerCase() !== 'user-agent') {
        headerSnippet += `request.AddHeader("${sanitize(header.key, true)}", "${sanitize(header.value)}");\n`;
      }
    }
    return headerSnippet;
  }, '');
}

module.exports = {
  parseBody: parseBody,
  parseHeader: parseHeader,
  parseContentType: parseContentType
};
