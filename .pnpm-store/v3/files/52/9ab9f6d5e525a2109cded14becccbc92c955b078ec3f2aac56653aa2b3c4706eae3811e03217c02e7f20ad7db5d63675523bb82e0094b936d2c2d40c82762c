var _ = require('../lodash'),
  sanitize = require('./sanitize').sanitize;

/**
 * Used to parse the body of the postman SDK-request and return in the desired format
 *
 * @param  {Object} request - postman SDK-request object
 * @param  {Boolean} trimRequestBody - whether to trim request body fields
 * @param  {String} indentation - used for indenting snippet's structure
 * @returns {String} - request body
 */
module.exports = function (request, trimRequestBody, indentation) {
  // used to check whether body is present in the request and return accordingly
  if (request.body) {
    var requestBody = '',
      bodyMap,
      enabledBodyList;

    switch (request.body.mode) {
      case 'raw':
        if (!_.isEmpty(request.body[request.body.mode])) {
          requestBody += `${indentation}CURLOPT_POSTFIELDS =>` +
                        `'${sanitize(request.body[request.body.mode], request.body.mode, trimRequestBody)}',\n`;
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
        requestBody += `${indentation}CURLOPT_POSTFIELDS =>` +
          `'${sanitize(JSON.stringify({
            query: query,
            variables: graphqlVariables
          }), 'raw', trimRequestBody)}',\n`;
        return requestBody;
      case 'urlencoded':
        enabledBodyList = _.reject(request.body[request.body.mode], 'disabled');
        if (!_.isEmpty(enabledBodyList)) {
          bodyMap = _.map(enabledBodyList, function (value) {
            return `${sanitize(value.key, request.body.mode, trimRequestBody)}=` +
                            `${sanitize(value.value, request.body.mode, trimRequestBody)}`;
          });
          requestBody = `${indentation}CURLOPT_POSTFIELDS => '${bodyMap.join('&')}',\n`;
        }
        return requestBody;
      case 'formdata':
        enabledBodyList = _.reject(request.body[request.body.mode], 'disabled');
        if (!_.isEmpty(enabledBodyList)) {
          bodyMap = _.map(enabledBodyList, function (value) {
            if (value.type === 'text') {
              return (`'${sanitize(value.key, request.body.mode, trimRequestBody)}' => '` +
                                `${sanitize(value.value, request.body.mode, trimRequestBody)}'`);
            }
            else if (value.type === 'file') {
              return `'${sanitize(value.key, request.body.mode, trimRequestBody)}'=> ` +
                            `new CURLFILE('${sanitize(value.src, request.body.mode, trimRequestBody)}')`;
            }
          });
          requestBody = `${indentation}CURLOPT_POSTFIELDS => array(${bodyMap.join(',')}),\n`;
        }
        return requestBody;
      case 'file':
        // requestBody = `${indentation}CURLOPT_POSTFIELDS => array('file' => '@'`;
        // requestBody += `${sanitize(request.body[request.body.mode].src,
        //   request.body.mode, trimRequestBody)}'),\n`;
        requestBody = `${indentation}CURLOPT_POSTFIELDS => "<file contents here>",\n`;
        return requestBody;
      default:
        return requestBody;

    }
  }
  return '';
};
