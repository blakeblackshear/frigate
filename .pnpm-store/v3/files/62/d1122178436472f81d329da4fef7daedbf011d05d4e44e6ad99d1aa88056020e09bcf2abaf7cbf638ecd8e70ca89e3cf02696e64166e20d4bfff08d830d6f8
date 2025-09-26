const _ = require('./lodash');

const self = module.exports = {
  /**
     * sanitizes input string by handling escape characters eg: converts '''' to '\'\''
     * and trim input if required
     *
     * @param {String} inputString
     * @param {Boolean} [trim] - indicates whether to trim string or not
     * @returns {String}
     */
  sanitize: function (inputString, trim) {
    if (typeof inputString !== 'string') {
      return '';
    }
    inputString = inputString.replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    return trim ? inputString.trim() : inputString;

  },

  /**
    * sanitizes input options
    *
    * @param {Object} options - Options provided by the user
    * @param {Array} optionsArray - options array received from getOptions function
    *
    * @returns {Object} - Sanitized options object
    */
  sanitizeOptions: function (options, optionsArray) {
    var result = {},
      defaultOptions = {},
      id;
    optionsArray.forEach((option) => {
      defaultOptions[option.id] = {
        default: option.default,
        type: option.type
      };
      if (option.type === 'enum') {
        defaultOptions[option.id].availableOptions = option.availableOptions;
      }
    });

    for (id in options) {
      if (options.hasOwnProperty(id)) {
        if (defaultOptions[id] === undefined) {
          continue;
        }
        switch (defaultOptions[id].type) {
          case 'boolean':
            if (typeof options[id] !== 'boolean') {
              result[id] = defaultOptions[id].default;
            }
            else {
              result[id] = options[id];
            }
            break;
          case 'positiveInteger':
            if (typeof options[id] !== 'number' || options[id] < 0) {
              result[id] = defaultOptions[id].default;
            }
            else {
              result[id] = options[id];
            }
            break;
          case 'enum':
            if (!defaultOptions[id].availableOptions.includes(options[id])) {
              result[id] = defaultOptions[id].default;
            }
            else {
              result[id] = options[id];
            }
            break;
          default:
            result[id] = options[id];
        }
      }
    }

    for (id in defaultOptions) {
      if (defaultOptions.hasOwnProperty(id)) {
        if (result[id] === undefined) {
          result[id] = defaultOptions[id].default;
        }
      }
    }
    return result;
  },

  /**
   *
   * @param {Object} urlObject The request sdk request.url object
   * @returns {String} The final string after parsing all the parameters of the url including
   * protocol, auth, host, port, path, query, hash
   * This will be used because the url.toString() method returned the URL with non encoded query string
   * and hence a manual call is made to getQueryString() method with encode option set as true.
   */
  getUrlStringfromUrlObject: function (urlObject) {
    var url = '';
    if (!urlObject) {
      return url;
    }
    if (urlObject.protocol) {
      url += (urlObject.protocol.endsWith('://') ? urlObject.protocol : urlObject.protocol + '://');
    }
    if (urlObject.auth && urlObject.auth.user) {
      url = url + ((urlObject.auth.password) ?
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
      let queryString = self.getQueryString(urlObject);
      queryString && (url += '?' + queryString);
    }
    if (urlObject.hash) {
      url += '#' + urlObject.hash;
    }

    return self.sanitize(url, false);
  },

  /**
     * @param {Object} urlObject
     * @returns {String}
     */
  getQueryString: function (urlObject) {
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

        return result + self.encodeParam(param.key) + '=' + self.encodeParam(param.value);
      }, result);
    }

    return result;
  },

  /**
   * Encode param except the following characters- [,{,},],%,+
   *
   * @param {String} param
   * @returns {String}
   */
  encodeParam: function (param) {
    return encodeURIComponent(param)
      .replace(/%5B/g, '[')
      .replace(/%7B/g, '{')
      .replace(/%5D/g, ']')
      .replace(/%7D/g, '}')
      .replace(/%2B/g, '+')
      .replace(/%25/g, '%')
      .replace(/'/g, '%27');
  },

  /**
 *
 * @param {Array} array - form data array
 * @param {String} key - key of form data param
 * @param {String} type - type of form data param(file/text)
 * @param {String} val - value/src property of form data param
 * @param {String} disabled - Boolean denoting whether the param is disabled or not
 * @param {String} contentType - content type header of the param
 *
 * Appends a single param to form data array
 */
  addFormParam: function (array, key, type, val, disabled, contentType) {
    if (type === 'file') {
      array.push({
        key: key,
        type: type,
        src: val,
        disabled: disabled,
        contentType: contentType
      });
    }
    else {
      array.push({
        key: key,
        type: type,
        value: val,
        disabled: disabled,
        contentType: contentType
      });
    }
  }
};
