var Sanitize = require('./sanitize'),
  _ = require('../lodash');

const BOUNDARY_HASH = 'e4dgoae5mIkjFjfG',
  URLENCODED = 'urlencoded',
  FORM_DATA = 'formdata',
  RAW = 'raw',
  GRAPHQL = 'graphql';
  // APP_JSON = 'application/json',
  // APP_JS = 'application/javascript',
  // APP_XML = 'application/xml',
  // TEXT_XML = 'text/xml',
  // TEXT_PLAIN = 'text/plain',
  // TEXT_HTML = 'text/html';

/**
 * Used to parse the body of the postman SDK-request and return in the desired format
 *
 * @param  {Object} request - postman SDK-request object
 * @returns {String} - request body
 */
module.exports = {

  boundaryHash: BOUNDARY_HASH,
  contentType: '',

  // function to add headers to the shell snippet
  // returns headerString, comprising of all headers present in the request object
  addHeaders: function (request) {
    var headerString = '';
    if (request.hasOwnProperty('headers')) {
      if (Array.isArray(request.headers.members) && request.headers.members.length) {
        request.headers.members = _.reject(request.headers.members, 'disabled');
        headerString = request.headers.members.map((header) => {
          return ' ' + header.key.trim() + ':' + Sanitize.quote(header.value);
        }).join(' \\\n');
      }
      else {
        headerString = '';
      }
    }

    if (headerString === []) {
      return '';
    }
    return headerString;
  },

  getRequestBody: function (requestBody, contentCategory) {
    var parsedBody;

    switch (contentCategory) {
      case URLENCODED:
        if (Array.isArray(requestBody.members) && requestBody.members.length) {
          parsedBody = requestBody.members.map((param) => {
            if (typeof param.value === 'string') {
              return ' ' + Sanitize.quote(param.key) + '=' + Sanitize.quote(param.value);
            }
            return ' ' + param.key + ':=' + param.value;
          }).join(' \\\n');
        }
        else {
          parsedBody = '';
        }
        break;

      case FORM_DATA:
        if (Array.isArray(requestBody.members) && requestBody.members.length) {
          parsedBody = requestBody.members.map((param) => {
            if (param.type === 'text') {
              if (typeof param.value === 'string') {
                return ' ' + Sanitize.quote(param.key) + '=' + Sanitize.quote(param.value);
              }
              return ' ' + param.key + ':=' + param.value;
            }
            return ' ' + Sanitize.quote(param.key) + '@' + param.src;
          }).join(' \\\n');
        }
        else {
          parsedBody = '';
        }
        break;

      case RAW:
        if (requestBody === undefined) {
          parsedBody = '';
        }
        else {
          parsedBody = requestBody ? `${Sanitize.quote(requestBody, RAW)}` : '';
        }
        break;
      case GRAPHQL:
        // eslint-disable-next-line no-case-declarations
        let query = requestBody.query,
          graphqlVariables;
        try {
          graphqlVariables = JSON.parse(requestBody.variables);
        }
        catch (e) {
          graphqlVariables = {};
        }
        parsedBody = Sanitize.quote(JSON.stringify({
          query: query,
          variables: graphqlVariables
        }), RAW);
        break;
      case 'file':
        parsedBody = requestBody.src;
        break;
      default:
        parsedBody = '';
    }

    return parsedBody ? parsedBody : '';
  }
};
