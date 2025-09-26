var _ = require('./lodash'),

  sanitize = require('./util').sanitize;

/**
 * Encode param except the following characters- [,],%,+
 * Characters { and } are kept encoded because unirest does not support them
 *
 * @param {String} param
 * @returns {String}
 */
function encodeParam (param) {
  return encodeURIComponent(param)
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%2B/g, '+')
    .replace(/%25/g, '%')
    .replace(/'/g, '%27');
}

/**
 * @param {Object} urlObject
 * @returns {String}
 */
function getQueryString (urlObject) {
  let isFirstParam = true,
    params = _.get(urlObject, 'query.members'),
    result = '';
  if (Array.isArray(params)) {
    result = _.reduce(params, function (result, param) {
      if (param.disabled === true) {
        return result;
      }

      if (isFirstParam) {
        isFirstParam = false;
      }
      else {
        result += '&';
      }

      return result + encodeParam(param.key) + '=' + encodeParam(param.value);
    }, result);
  }

  return result;
}

/**
 *
 * @param {*} urlObject The request sdk request.url object
 * @returns {String} The final string after parsing all the parameters of the url including
 * protocol, auth, host, port, path, query, hash
 * This will be used because the url.toString() method returned the URL with non encoded query string
 * and hence a manual call is made to getQueryString() method with encode option set as true.
 */
function getUrlStringfromUrlObject (urlObject) {
  var url = '';
  if (!urlObject) {
    return url;
  }
  if (urlObject.protocol) {
    url += (urlObject.protocol.endsWith('://') ? urlObject.protocol : urlObject.protocol + '://');
  }
  if (urlObject.auth && urlObject.auth.user) {
    url = url + ((urlObject.auth.password) ?
      // ==> username:password@
      urlObject.auth.user + ':' + urlObject.auth.password : urlObject.auth.user) + '@';
  }
  if (urlObject.host) {
    url += urlObject.getHost();
  }
  if (urlObject.port) {
    url += ':' + urlObject.port.toString();
  }
  if (urlObject.path) {
    url += urlObject.getPath();
  }
  if (urlObject.query && urlObject.query.count()) {
    let queryString = getQueryString(urlObject);
    queryString && (url += '?' + queryString);
  }
  if (urlObject.hash) {
    url += '#' + urlObject.hash;
  }

  return sanitize(url);
}

/**
 * parses form data from request body and returns codesnippet in java unirest
 *
 * @param {Object} requestbody - JSON object acquired by request.body.JSON()
 * @param {String} indentString - value for indentation
 * @param {Boolean} trimField - whether to trim fields of the request body
 * @returns {String} - body string parsed from JSON object
 */
function parseFormData (requestbody, indentString, trimField) {
  return _.reduce(requestbody[requestbody.mode], function (body, data) {
    if (data.disabled) {
      return body;
    }
    if (data.type === 'file') {
      body += indentString + `.field("file", new File("${sanitize(data.src, trimField)}"))\n`;
    }
    else {
      (!data.value) && (data.value = '');
      body += indentString + `.field("${sanitize(data.key, trimField)}", ` +
                                    `"${sanitize(data.value, trimField)}"`;
      if (data.contentType) {
        body += `, "${sanitize(data.contentType, trimField)}"`;
      }
      body += ')\n';
    }
    return body;
  }, '');
}

/**
 * parses body from request object based on mode provided by request body and
 * returns codesnippet in java unirest
 *
 * @param {Object} request - postman request object, more information can be found in postman collection sdk
 * @param {String} indentString - value for indentation
 * @param {Boolean} trimField - whether to trim fields of body of the request
 * @returns {String} - body string parsed from request object
 */
function parseBody (request, indentString, trimField) {
  if (request.body) {
    switch (request.body.mode) {
      case 'urlencoded':
        return parseFormData(request.body.toJSON(), indentString, trimField);
      case 'raw':
        return indentString + `.body(${JSON.stringify(request.body.toString())})\n`;

      case 'graphql':
        // eslint-disable-next-line no-case-declarations
        let query = request.body.graphql ? request.body.graphql.query : '',
          graphqlVariables;
        try {
          graphqlVariables = JSON.parse(request.body.graphql ? request.body.graphql.variables : '{}');
        }
        catch (e) {
          graphqlVariables = {};
        }
        return indentString + `.body("${sanitize(JSON.stringify({
          query: query || '',
          variables: graphqlVariables
        }), trimField)}")\n`;
      case 'formdata':
        var formDataContent = parseFormData(request.body.toJSON(), indentString, trimField);
        if (!formDataContent.includes('.field("file", new File')) {
          formDataContent = indentString + '.multiPartContent()\n' + formDataContent;
        }
        return formDataContent;
      case 'file':
        return indentString + '.body("<file contents here>")\n';
      default:
        return '';
    }
  }
  return '';
}

/**
 * parses header from request and returns codesnippet in java unirest
 *
 * @param {Object} request - postman request object, more information can be found in postman collection sdk
 * @param {String} indentString - value for indentation
 * @returns {String} - body string parsed from request object
 */
function parseHeader (request, indentString) {
  var headerArray = request.toJSON().header,
    headerSnippet = '';
  if (!_.isEmpty(headerArray)) {
    headerArray = _.reject(headerArray, 'disabled');
    headerSnippet += headerArray.reduce(function (accumlator, header) {
      accumlator += indentString + `.header("${sanitize(header.key, true)}", "${sanitize(header.value)}")\n`;
      return accumlator;
    }, '');
  }
  return headerSnippet;
}

module.exports = {
  parseBody: parseBody,
  parseHeader: parseHeader,
  getUrlStringfromUrlObject: getUrlStringfromUrlObject
};
