
var _ = require('lodash'),
  sanitize = require('./util').sanitize,
  path = require('path');

/**
 * parses body of request and returns urlencoded string
 *
 * @param {Object} requestBody - json object respresenting body of request
 * @param {Boolean} trimFields - indicates whether to trim fields of body
 * @returns {String} - urlencoded string for request body
 */
function parseUrlencode (requestBody, trimFields) {
  //  reducing array of urlencoded form data to array of strings
  return _.reduce(requestBody[requestBody.mode], function (accumalator, data) {
    if (!data.disabled) {
      accumalator.push(`${sanitize(data.key, trimFields)}=${sanitize(data.value, trimFields)}`.replace(/&/g, '%26'));
    }
    return accumalator;
  }, []).join('&');
}

/**
 * parses body of request and creates java okhttp code snippet for adding form data
 *
 * @param {Object} requestBody - JSON object representing body of request
 * @param {String} indentString - string for indentation
 * @param {Boolean} trimFields - indicates whether to trim fields of body
 * @returns {String} - code snippet of java okhttp for multipart formdata
 */
function parseFormData (requestBody, indentString, trimFields) {
  return _.reduce(requestBody[requestBody.mode], function (body, data) {
    if (data.disabled) {
      return body;
    }
    /* istanbul ignore next */
    if (data.type === 'file') {
      var pathArray = data.src.split(path.sep),
        fileName = pathArray[pathArray.length - 1];
      body += indentString + '.addFormDataPart' +
                    `("${sanitize(data.key, trimFields)}","${sanitize(fileName, trimFields)}",\n` +
                    indentString.repeat(2) + `File("${sanitize(data.src)}")` +
                    '.asRequestBody("application/octet-stream".toMediaType()))\n';
    }
    else {
      !data.value && (data.value = '');
      body += `${indentString}.addFormDataPart("${sanitize(data.key, trimFields)}",`;
      if (data.contentType) {
        body += ` null,\n${indentString.repeat(2)}`;
        body += ` "${sanitize(data.value, trimFields)}".toRequestBody("${data.contentType}".toMediaType()))\n`;
      }
      else {
        body += `"${sanitize(data.value, trimFields)}")\n`;
      }
    }

    return body;
  }, '') + indentString + '.build()';
}

/**
 * Parses request object and returns kotlin okhttp code snippet for raw body
 *
 * @param {Object} requestBody - JSON object representing body of request
 * @param {Boolean} trimFields - indicates whether to trim fields of body
 * @param {String} contentType - content type of request body
 */
function parseRawBody (requestBody, trimFields, contentType) {
  if (contentType && contentType.startsWith('application/json')) {
    return `val body = ${JSON.stringify(requestBody[requestBody.mode])}.toRequestBody(mediaType)\n`;
  }

  return `val body = "${sanitize(requestBody[requestBody.mode], trimFields)}".toRequestBody(mediaType)\n`;
}

/**
 * parses request object and returns java okhttp code snippet for adding request body
 *
 * @param {Object} requestBody - JSON object representing body of request
 * @param {String} indentString - string for indentation
 * @param {Boolean} trimFields - indicates whether to trim fields of body
 * @param {String} contentType - content type of request body
 *
 * @returns {String} - code snippet of java okhttp parsed from request object
 */
function parseBody (requestBody, indentString, trimFields, contentType) {
  if (!_.isEmpty(requestBody)) {
    switch (requestBody.mode) {
      case 'urlencoded':
        return `val body = "${parseUrlencode(requestBody, trimFields)}".toRequestBody(mediaType)\n`;
      case 'raw':
        return parseRawBody(requestBody, trimFields, contentType);
      case 'graphql':
        // eslint-disable-next-line no-case-declarations
        let query = requestBody[requestBody.mode].query,
          graphqlVariables;
        try {
          graphqlVariables = JSON.parse(requestBody[requestBody.mode].variables);
        }
        catch (e) {
          graphqlVariables = {};
        }
        return 'val body = ' +
        `"${sanitize(JSON.stringify({
          query: query,
          variables: graphqlVariables
        }), trimFields)}".toRequestBody(mediaType)\n`;
      case 'formdata':
        return requestBody.formdata.length ?
          'val body = MultipartBody.Builder().setType(MultipartBody.FORM)\n' +
            `${parseFormData(requestBody, indentString, trimFields)}\n` :
          'val body = "{}".toRequestBody("application/json; charset=utf-8".toMediaType())\n';
      /* istanbul ignore next */
      case 'file':
        return `val body = File("${requestBody[requestBody.mode].src}")` +
          '.asRequestBody("application/octet-stream".toMediaType())\n';
      default:
        return 'val body = "".toRequestBody(mediaType)\n';
    }
  }
  return 'val body = "".toRequestBody(mediaType)\n';
}

/**
 * Parses header in Postman-SDK request and returns code snippet of java okhttp for adding headers
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation for code snippet
 * @returns {String} - code snippet for adding headers in kotlin-okhttp
 */
function parseHeader (request, indentString) {
  var headerArray = request.toJSON().header,
    headerSnippet = '';

  if (!_.isEmpty(headerArray)) {
    headerArray = _.reject(headerArray, 'disabled');
    headerSnippet += _.reduce(headerArray, function (accumalator, header) {
      accumalator += indentString + `.addHeader("${sanitize(header.key, true)}", ` +
        `"${sanitize(header.value)}")\n`;
      return accumalator;
    }, '');
  }
  return headerSnippet;
}

/**
 * returns content-type of request body if available else returns text/plain as default
 *
 * @param {Object} request - Postman SDK request object
 * @returns {String}- content-type of request body
 */
function parseContentType (request) {
  if (request.body && request.body.mode === 'graphql') {
    return 'application/json';
  }
  return request.getHeaders({enabled: true, ignoreCase: true})['content-type'] || 'text/plain';
}

module.exports = {
  parseBody: parseBody,
  parseHeader: parseHeader,
  parseContentType: parseContentType
};
