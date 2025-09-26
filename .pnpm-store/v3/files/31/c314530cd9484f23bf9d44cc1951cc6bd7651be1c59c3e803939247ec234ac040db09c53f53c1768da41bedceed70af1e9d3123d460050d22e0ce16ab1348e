var _ = require('../lodash'),
  sanitize = require('./sanitize').sanitize;

/**
 * Used to parse the body of the postman SDK-request and return in the desired format
 *
 * @param  {Object} request - postman SDK-request object
 * @param  {String} indentation - used for indenting snippet's structure
 * @param  {Boolean} bodyTrim - whether to trim body fields or not
 * @returns {String} - request body
 */
module.exports = function (request, indentation, bodyTrim) {
  // used to check whether body is present in the request or not
  if (request.body) {
    var bodyDataMap = [],
      bodyFileMap = [],
      requestBody = '',
      enabledBodyList;

    switch (request.body.mode) {
      case 'raw':
        if (!_.isEmpty(request.body[request.body.mode])) {
          requestBody += `$body->append('${request.body[request.body.mode]}');\n`;
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
        requestBody += `$body->append('${sanitize(JSON.stringify({
          query: query,
          variables: graphqlVariables
        }), bodyTrim)}');\n`;
        return requestBody;
      case 'urlencoded':
        enabledBodyList = _.reject(request.body[request.body.mode], 'disabled');
        if (!_.isEmpty(enabledBodyList)) {
          bodyDataMap = _.map(enabledBodyList, function (value) {
            return `${indentation}'${sanitize(value.key, bodyTrim)}' => ` +
                            `'${sanitize(value.value, bodyTrim)}'`;
          });
          requestBody = `$body->append(new http\\QueryString(array(\n${bodyDataMap.join(',\n')})));`;
        }
        return requestBody;

      case 'formdata':
        enabledBodyList = _.reject(request.body[request.body.mode], 'disabled');
        if (!_.isEmpty(enabledBodyList)) {
          bodyDataMap = _.map(_.filter(enabledBodyList, {'type': 'text'}), function (value) {
            return (`${indentation}'${sanitize(value.key, bodyTrim)}' => ` +
                            `'${sanitize(value.value, bodyTrim)}'`);
          });
          bodyFileMap = _.map(_.filter(enabledBodyList, {'type': 'file'}), function (value) {
            return (`${indentation.repeat(2)}array('name' => '${sanitize(value.key, bodyTrim)}', ` +
                            '\'type\' => \'<Content-type header>\', ' +
                            `'file' => '${sanitize(value.src, bodyTrim)}', ` +
                            '\'data\' => null)');
          });
          requestBody = `$body->addForm(array(\n${bodyDataMap.join(',\n')}\n), ` +
                        `array(\n${bodyFileMap.join(',\n')}\n));\n`;
        }
        return requestBody;

      case 'file':
        // requestBody = `${indentation.repeat(2)}array('name' => '` +
        //             `${sanitize(request.body[request.body.mode].key, bodyTrim)}', ` +
        //             `'type' => '${sanitize(request.body[request.body.mode].type, bodyTrim)}', ` +
        //             `'file' => '${sanitize(request.body[request.body.mode].src, bodyTrim)}', ` +
        //             '\'data\' => null)';
        // return `$body->addForm(array(), array(${requestBody}));\n`;
        requestBody = '$body->append(\'<file contents here>\');\n';
        return requestBody;
      default:
        return requestBody;
    }
  }
  return '';
};
