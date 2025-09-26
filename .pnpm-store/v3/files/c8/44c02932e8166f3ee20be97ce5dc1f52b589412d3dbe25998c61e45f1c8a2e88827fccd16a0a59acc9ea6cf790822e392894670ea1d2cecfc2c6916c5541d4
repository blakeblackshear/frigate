var _ = require('./lodash'),

  sanitize = require('./util').sanitize;


/**
 * parses body of request when mode of body is formdata and
 * returns code snippet for nodejs to send body
 *
 * @param {Array<Object>} bodyArray - array containing body elements of request
 * @param {String} indentString - string required for indentation
 * @param {Boolean} trimBody - indicates whether to trim body fields or not
 */
function parseMultipart (bodyArray, indentString, trimBody) {
  return _.reduce(bodyArray, function (bodyString, item) {
    if (item.disabled) {
      return bodyString;
    }
    /* istanbul ignore next */
    if (item.type === 'file') {
      bodyString += indentString + `.attach('file', '${sanitize(item.src, trimBody)}')\n`;
    }
    else {
      bodyString += indentString +
                          `.field('${sanitize(item.key, trimBody)}', '${sanitize(item.value, trimBody)}')\n`;
    }
    return bodyString;
  }, '');
}

/**
 * parses body of request when mode of body is urlencoded and
 * returns code snippet for nodejs to send body
 *
 * @param {Array<Object>} bodyArray - data containing body elements of request
 * @param {String} indentString - string required for indentation
 * @param {Boolean} trimBody - indicates whether to trim body fields or not
 */
function parseFormdata (bodyArray, indentString, trimBody) {
  return _.reduce(bodyArray, function (bodyString, item) {
    if (item.disabled) {
      return bodyString;
    }
    bodyString += indentString +
      '.send(' + `'${sanitize(item.key, trimBody)}=${sanitize(item.value, trimBody)}'`.replace(/&/g, '%26') + ')\n';
    return bodyString;
  }, '');
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
  return indentString + '.send(JSON.stringify({\n' +
    `${indentString.repeat(2)}query: \`${query ? query.trim() : ''}\`,\n` +
    `${indentString.repeat(2)}variables: ${JSON.stringify(graphqlVariables)}\n` +
    `${indentString}}))\n`;
}

/**
 * Parses body object based on mode of body and converts into nodejs(unirest) code snippet
 *
 * @param {Object} requestbody - json object representing body of request
 * @param {String} indentString - string required for indentation
 * @param {Boolean} trimBody - indicates whether to trim body fields or not
 * @param {String} contentType Content type of the body being sent
 * @returns {String} - code snippet for adding body in request
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
            return `${indentString}.send(JSON.stringify(${JSON.stringify(jsonBody, null,
              indentString.length).replace(/\n/g, '\n' + indentString)}))\n`;
          }
          catch (error) {
            return indentString + '.send(' + JSON.stringify(requestbody[requestbody.mode]) + ')\n';
          }
        }
        return indentString + '.send(' + JSON.stringify(requestbody[requestbody.mode]) + ')\n';
      case 'graphql':
        return parseGraphql(requestbody[requestbody.mode], indentString);
      case 'urlencoded':
        return parseFormdata(requestbody[requestbody.mode], indentString, trimBody);
      case 'formdata':
        return parseMultipart(requestbody[requestbody.mode], indentString, trimBody);
        /* istanbul ignore next */
      case 'file':
        return '.send("<file contents here>")\n';
      default:
        return '';
    }
  }
  return '';
}

/**
 * parses header of request object and returns code snippet of nodejs unirest to add header
 *
 * @param {Object} request - Postman SDK request object
 * @param {String} indentString - indentation required in code snippet
 * @returns {String} - code snippet of nodejs unirest to add header
 */
function parseHeader (request, indentString) {
  var headerObject = request.getHeaders({enabled: true}),
    headerSnippet = '';

  if (!_.isEmpty(headerObject)) {
    headerSnippet += indentString + '.headers({\n';

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

    headerSnippet += indentString + '})\n';
  }
  return headerSnippet;
}

module.exports = {
  parseBody: parseBody,
  parseHeader: parseHeader
};
