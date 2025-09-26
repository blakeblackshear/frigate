var _ = require('../lodash'),
  sanitize = require('./sanitize').sanitize;

/**
     * Used to parse the body of the postman SDK-request and return in the desired format
     *
     * @param  {Object} request - postman SDK-request object
     * @param  {Boolean} trimRequestBody - whether to trim request body fields
     * @param  {String} indentation - used for indenting snippet's structure
     * @param {String} contentType Content type of the body being sent
     * @returns {String} - request body
     */
module.exports = function (request, trimRequestBody, indentation, contentType) {
  // used to check whether body is present in the request and return accordingly
  if (request.body) {
    var requestBody = '',
      bodyMap,
      enabledBodyList;

    switch (request.body.mode) {
      case 'raw':
        if (!_.isEmpty(request.body[request.body.mode])) {
          // Match any application type whose underlying structure is json
          // For example application/vnd.api+json
          // All of them have +json as suffix
          if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
            // eslint-disable-next-line max-depth
            try {
              let jsonBody = JSON.parse(request.body[request.body.mode]);
              requestBody += `${indentation}"data": JSON.stringify(${JSON.stringify(jsonBody,
                null, indentation.length).replace(/\n/g, `\n${indentation}`)}),\n`;
            }
            catch (error) {
              requestBody += `${indentation}"data": ` +
                        `${sanitize(request.body[request.body.mode], request.body.mode, trimRequestBody)},\n`;
            }
          }
          else {
            requestBody += `${indentation}"data": ` +
            `${sanitize(request.body[request.body.mode], request.body.mode, trimRequestBody)},\n`;
          }
        }
        return requestBody;
      case 'graphql':
        // eslint-disable-next-line no-case-declarations
        let query = request.body[request.body.mode].query,
          graphqlVariables;
        try {
          graphqlVariables = JSON.parse(request.body[request.body.mode].variables);
        }
        catch (e) {
          graphqlVariables = {};
        }
        requestBody += `${indentation}"data": ` +
          'JSON.stringify({\n' +
          `${indentation.repeat(2)}query: ${sanitize(query, 'raw', trimRequestBody)},\n` +
          `${indentation.repeat(2)}variables: ${JSON.stringify(graphqlVariables)}\n` +
          `${indentation}})\n`;
        return requestBody;
      case 'urlencoded':
        enabledBodyList = _.reject(request.body[request.body.mode], 'disabled');
        if (!_.isEmpty(enabledBodyList)) {
          bodyMap = _.map(enabledBodyList, function (value) {
            return `${indentation.repeat(2)}"${sanitize(value.key, request.body.mode, trimRequestBody)}":` +
                            ` "${sanitize(value.value, request.body.mode, trimRequestBody)}"`;
          });
          requestBody = `${indentation}"data": {\n${bodyMap.join(',\n')}\n${indentation}}\n`;
        }
        return requestBody;
      case 'formdata':
        requestBody = `${indentation}"processData": false,\n` +
                        `${indentation}"mimeType": "multipart/form-data",\n` +
                        `${indentation}"contentType": false,\n` +
                        `${indentation}"data": form\n`;
        return requestBody;
      case 'file':
        requestBody = `${indentation} "data": "<file contents here>"\n`;
        return requestBody;
      default:
        return requestBody;

    }
  }
  return '';
};
