var _ = require('./lodash'),

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
    /* istanbul ignore next */
    if (item.type === 'file') {
      /**
             * creating snippet to send file in nodejs request
             * for example:
             *  'fieldname': {
             *      'value': fs.createStream('filename.ext'),
             *      'options': {
             *          'filename': 'filename.ext',
             *          'contentType: null
             *          }
             *      }
             *  }
             */
      if (Array.isArray(item.src) && item.src.length) {
        let fileSnippet = '',
          fileArray = [];
        _.forEach(item.src, (filePath) => {
          fileArray.push(`${indentString.repeat(3)}fs.createReadStream('${sanitize(filePath, trimBody)}')`);
        });
        if (fileArray.length) {
          fileSnippet += `${indentString.repeat(2)}'${sanitize(item.key, trimBody)}': ` +
          `[\n${fileArray.join(',\n')}\n${indentString.repeat(2)}]`;
          accumalator.push(fileSnippet);
        }
        else {
          return accumalator;
        }
      }
      else if (typeof item.src !== 'string') {
        accumalator.push([
          indentString.repeat(2) + `'${sanitize(item.key, trimBody)}': {`,
          indentString.repeat(3) + '\'value\': fs.createReadStream(\'/path/to/file\'),',
          indentString.repeat(3) + '\'options\': {',
          indentString.repeat(4) + '\'filename\': \'filename\'',
          indentString.repeat(4) + '\'contentType\': null',
          indentString.repeat(3) + '}',
          indentString.repeat(2) + '}'
        ].join('\n'));
      }
      else {
        var pathArray = item.src.split(path.sep),
          fileName = pathArray[pathArray.length - 1];
        accumalator.push([
          indentString.repeat(2) + `'${sanitize(item.key, trimBody)}': {`,
          indentString.repeat(3) + `'value': fs.createReadStream('${sanitize(item.src, trimBody)}'),`,
          indentString.repeat(3) + '\'options\': {',
          indentString.repeat(4) + `'filename': '${sanitize(fileName, trimBody)}',`,
          indentString.repeat(4) + '\'contentType\': null',
          indentString.repeat(3) + '}',
          indentString.repeat(2) + '}'
        ].join('\n'));
      }
    }
    else {
      accumalator.push(
        indentString.repeat(2) +
                `'${sanitize(item.key, trimBody)}': '${sanitize(item.value, trimBody)}'`
      );
    }
    return accumalator;
  }, []);
  return snippetString.join(',\n') + '\n';
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
  return 'body: JSON.stringify({\n' +
    `${indentString.repeat(2)}query: \`${query ? query.trim() : ''}\`,\n` +
    `${indentString.repeat(2)}variables: ${JSON.stringify(graphqlVariables)}\n` +
    `${indentString}})`;
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
            return `body: JSON.stringify(${JSON.stringify(jsonBody, null,
              indentString.length).replace(/\n/g, '\n' + indentString)})\n`;
          }
          catch (error) {
            return `body: '${sanitize(requestbody[requestbody.mode])}'\n`;
          }
        }
        return `body: '${sanitize(requestbody[requestbody.mode])}'\n`;
      case 'graphql':
        return parseGraphql(requestbody[requestbody.mode], indentString);
      case 'formdata':
        return `formData: {\n${extractFormData(requestbody[requestbody.mode], indentString, trimBody)}` +
                        indentString + '}';
      case 'urlencoded':
        return `form: {\n${extractFormData(requestbody[requestbody.mode], indentString, trimBody)}` +
                        indentString + '}';
        /* istanbul ignore next */
      case 'file':
        // return 'formData: {\n' +
        //                 extractFormData(requestbody[requestbody.mode], indentString, trimBody) +
        //                 indentString + '}';
        return 'body: "<file contents here>"\n';
      default:
        return '';
    }
  }
  return '';
}

/**
 * parses header of request object and returns code snippet of nodejs request to add header
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation required in code snippet
 * @returns {String} - code snippet of nodejs request to add header
 */
function parseHeader (request, indentString) {
  var headerObject = request.getHeaders({enabled: true}),
    headerSnippet = indentString + '\'headers\': {\n';

  if (!_.isEmpty(headerObject)) {
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
    }, []).join(',\n') + '\n';
  }

  headerSnippet += indentString + '}';
  return headerSnippet;
}

module.exports = {
  parseBody: parseBody,
  parseHeader: parseHeader
};
