const _ = require('lodash'),
  sanitize = require('./util').sanitize;

/**
 * Parses URLEncoded body from request to axios syntax
 *
 * @param {Object} body URLEncoded Body
 * @param {boolean} trim trim body option
 * @param {string} indentString The indentation string
 */
function parseURLEncodedBody (body, trim, indentString) {
  let bodySnippet = 'const qs = require(\'qs\');\n',
    dataArray = [];

  _.forEach(body, function (data) {
    if (!data.disabled) {
      dataArray.push(`'${sanitize(data.key, trim)}': '${sanitize(data.value, trim)}'`);
    }
  });
  bodySnippet += `let data = qs.stringify({\n${indentString}${dataArray.join(',\n' + indentString)} \n});\n`;
  return bodySnippet;
}

/**
 * Parses Formdata from request to axios syntax
 *
 * @param {Object} body FormData body
 * @param {boolean} trim trim body option
 */
function parseFormData (body, trim) {
  let bodySnippet = 'const FormData = require(\'form-data\');\n';
  // check if there's file
  const fileArray = body.filter(function (item) { return !item.disabled && item.type === 'file'; });
  if (fileArray.length > 0) {
    bodySnippet += 'const fs = require(\'fs\');\n';
  }
  bodySnippet += 'let data = new FormData();\n';

  _.forEach(body, function (data) {
    if (!data.disabled) {
      if (data.type === 'file') {
        const fileContent = `fs.createReadStream('${data.src}')`;
        bodySnippet += `data.append('${sanitize(data.key, trim)}', ${fileContent});\n`;
      }
      else {
        bodySnippet += `data.append('${sanitize(data.key, trim)}', '${sanitize(data.value, trim)}'`;
        if (data.contentType) {
          bodySnippet += `, {contentType: '${sanitize(data.contentType, trim)}'}`;
        }
        bodySnippet += ');\n';
      }
    }
  });
  return bodySnippet;
}

/**
 * Parses Raw data to axios syntax
 *
 * @param {Object} body Raw body data
 * @param {boolean} trim trim body option
 * @param {String} contentType Content type of the body being sent
 * @param {String} indentString Indentation string
 */
function parseRawBody (body, trim, contentType, indentString) {
  let bodySnippet = 'let data = ';
  // Match any application type whose underlying structure is json
  // For example application/vnd.api+json
  // All of them have +json as suffix
  if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
    try {
      let jsonBody = JSON.parse(body);
      bodySnippet += `JSON.stringify(${JSON.stringify(jsonBody, null, indentString.length)});\n`;
    }
    catch (error) {
      bodySnippet += `'${sanitize(body.toString(), trim)}';\n`;
    }
  }
  else {
    bodySnippet += `'${sanitize(body.toString(), trim)}';\n`;
  }
  return bodySnippet;
}

/**
 * Parses graphql data to axios syntax
 *
 * @param {Object} body graphql body data
 * @param {boolean} trim trim body option
 * @param {String} indentString indentation to be added to the snippet
 */
function parseGraphQL (body, trim, indentString) {
  let query = body ? body.query : '',
    graphqlVariables = body ? body.variables : '{}',
    bodySnippet;
  try {
    graphqlVariables = JSON.parse(graphqlVariables || '{}');
  }
  catch (e) {
    graphqlVariables = {};
  }
  bodySnippet = 'let data = JSON.stringify({\n';
  bodySnippet += `${indentString}query: \`${query ? query.trim() : ''}\`,\n`;
  bodySnippet += `${indentString}variables: ${JSON.stringify(graphqlVariables)}\n});\n`;
  return bodySnippet;
}


/**
 * parses binary file data
 */
function parseFileData () {
  const bodySnippet = 'let data = \'<file contents here>\';\n';
  return bodySnippet;
}

/**
 * Parses Body from the Request
 *
 * @param {Object} body body object from request.
 * @param {boolean} trim trim body option
 * @param {String} indentString indentation to be added to the snippet
 * @param {String} contentType Content type of the body being sent
 */
function parseBody (body, trim, indentString, contentType) {
  if (body && !_.isEmpty(body)) {
    switch (body.mode) {
      case 'urlencoded':
        return parseURLEncodedBody(body.urlencoded, trim, indentString);
      case 'raw':
        return parseRawBody(body.raw, trim, contentType, indentString);
      case 'graphql':
        return parseGraphQL(body.graphql, trim, indentString);
      case 'formdata':
        return parseFormData(body.formdata, trim);
        /* istanbul ignore next */
      case 'file':
        return parseFileData();
      default:
        return parseRawBody(body[body.mode], trim, contentType);
    }
  }
  return '';
}


/**
 * parses header of request object and returns code snippet of nodejs axios to add headers
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation required in code snippet
 * @returns {String} - code snippet of nodejs request to add header
 */
function parseHeader (request, indentString) {
  let headerObject = request.getHeaders({enabled: true}),
    headerArray = [];

  if (!_.isEmpty(headerObject)) {
    headerArray = _.reduce(Object.keys(headerObject), function (accumalator, key) {
      if (Array.isArray(headerObject[key])) {
        const headerValues = _.map(headerObject[key], (value) => { return `${sanitize(value)}`; });
        accumalator.push(
          indentString.repeat(2) + `'${sanitize(key, true)}': '${headerValues.join(', ')}'`
        );
      }
      else {
        accumalator.push(
          indentString.repeat(2) + `'${sanitize(key, true)}': '${sanitize(headerObject[key])}'`
        );
      }
      return accumalator;
    }, []);
  }

  return headerArray;
}

module.exports = {
  parseBody: parseBody,
  parseHeader: parseHeader,
  parseFormData: parseFormData
};
