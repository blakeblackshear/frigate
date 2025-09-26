const _ = require('./lodash'),

  sanitize = require('./util').sanitize,
  path = require('path');

/**
 * parses body of request when type of the request body is formdata or urlencoded and
 * returns code snippet for nodejs to add body
 *
 * @param {Array<Object>} dataArray - array containing body elements of request
 * @param {String} indentString - string required for indentation
 * @param {Boolean} trimBody - indicates whether to trim body or not
 */
function extractFormData (dataArray, indentString, trimBody) {
  if (!dataArray) {
    return '';
  }
  var snippetString = _.reduce(dataArray, (accumalator, item) => {
    if (item.disabled) {
      return accumalator;
    }

    accumalator.push(
      indentString + `'${sanitize(item.key, trimBody)}': '${sanitize(item.value, trimBody)}'`
    );

    return accumalator;
  }, []);
  return snippetString.join(',\n');
}

/**
 * Generates multipart form data snippet
 *
 * @param {*} requestbody
 */
function generateMultipartFormData (requestbody) {
  const boundary = '------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; ',
    dataArray = requestbody[requestbody.mode];
  var postData = '';

  if (dataArray.length) {
    postData = '"' + boundary + _.reduce(dataArray, (accumalator, dataArrayElement) => {
      if (!dataArrayElement.disabled || dataArrayElement.disabled === false) {
        const key = dataArrayElement.key.replace(/"/g, '\'');

        if (dataArrayElement.type === 'file') {
          var pathArray = dataArrayElement.src.split(path.sep),
            fileName = pathArray[pathArray.length - 1];
          const filename = `filename=\\"${fileName}\\"`,
            contentType = 'Content-Type: \\"{Insert_File_Content_Type}\\"',
            fileContent = `fs.readFileSync('${dataArrayElement.src}')`;

          // eslint-disable-next-line max-len
          accumalator.push(`name=\\"${key}\\"; ${filename}\\r\\n${contentType}\\r\\n\\r\\n" + ${fileContent} + "\\r\\n`);
        }
        else {
          // eslint-disable-next-line no-useless-escape
          const value = dataArrayElement.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          let field = `name=\\"${key}\\"\\r\\n`;
          if (dataArrayElement.contentType) {
            field += `Content-Type: ${dataArrayElement.contentType}\\r\\n`;
          }
          field += `\\r\\n${value}\\r\\n`;
          accumalator.push(field);
        }
      }
      return accumalator;
      // eslint-disable-next-line no-useless-escape
    }, []).join(`${boundary}`) + '------WebKitFormBoundary7MA4YWxkTrZu0gW--\"';
  }

  return postData;
}

/** generate graphql code snippet
 *
 * @param body GraphQL body
 * @param indentString string defining indentation
 */
function parseGraphql (body, indentString) {
  let query = body ? body.query : '',
    graphqlVariables = body ? body.variables : '{}';
  try {
    graphqlVariables = JSON.parse(graphqlVariables || '{}');
  }
  catch (e) {
    graphqlVariables = {};
  }
  return 'JSON.stringify({\n' +
  `${indentString}query: \`${query ? query.trim() : ''}\`,\n` +
  `${indentString}variables: ${JSON.stringify(graphqlVariables)}\n})`;
}

/**
 * Parses body object based on mode of body and returns code snippet
 *
 * @param {Object} requestbody - json object for body of request
 * @param {String} indentString - string for indentation
 * @param {Boolean} trimBody - indicates whether to trim body fields or not
 * @param {String} contentType Content type of the body being sent
 */
function parseBody (requestbody, indentString, trimBody, contentType) {
  if (requestbody) {
    switch (requestbody.mode) {
      case 'raw':
        // Match any application type whose underlying structure is json
        // For example application/vnd.api+json
        // All of them have +json as suffix
        if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
          try {
            let jsonBody = JSON.parse(requestbody[requestbody.mode]);
            return `JSON.stringify(${JSON.stringify(jsonBody, null, indentString.length)})`;
          }
          catch (error) {
            return ` ${JSON.stringify(requestbody[requestbody.mode])}`;
          }
        }
        return ` ${JSON.stringify(requestbody[requestbody.mode])}`;
      case 'graphql':
        return parseGraphql(requestbody[requestbody.mode], indentString);
      case 'formdata':
        return generateMultipartFormData(requestbody);
      case 'urlencoded':
        return `qs.stringify({\n${extractFormData(requestbody[requestbody.mode], indentString, trimBody)}` +
                    '\n})';
      case 'file':
        return '"<file contents here>"';
      default:
        return '';
    }
  }
  return '';
}

/**
 * parses header of request object and returns code snippet of nodejs native to add header
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation required in code snippet
 * @returns {String} - code snippet of nodejs native to add header
 */
function parseHeader (request, indentString) {
  var headerObject = request.getHeaders({enabled: true}),
    headerSnippet = indentString + '\'headers\': {\n';

  if (headerObject) {
    headerSnippet += _.reduce(Object.keys(headerObject), function (accumalator, key) {
      if (Array.isArray(headerObject[key])) {
        var headerValues = [];
        _.forEach(headerObject[key], (value) => {
          headerValues.push(`'${sanitize(value)}'`);
        });
        accumalator.push(
          indentString.repeat(2) + `'${sanitize(key, true)}': [${headerValues.join(', ')}]`
        );
      }
      else {
        accumalator.push(
          indentString.repeat(2) + `'${sanitize(key, true)}': '${sanitize(headerObject[key])}'`
        );
      }
      return accumalator;
    }, []).join(',\n');
  }

  if (headerObject && !_.isEmpty(headerObject)) {
    headerSnippet += '\n';
  }

  headerSnippet += indentString + '}';
  return headerSnippet;
}


module.exports = {
  parseBody: parseBody,
  parseHeader: parseHeader
};
