const _ = require('./lodash');

var self = module.exports = {
  /**
     * sanitizes input string by handling escape characters eg: converts '''' to '\'\'', (" to \"  and \ to \\ )
     * and trim input if required
     *
     * @param {String} inputString
     * @param {Boolean} [trim] - indicates whether to trim string or not
     * @param {String} [quoteType] - indicates which quoteType has to be escaped
     * @param {Boolean} [backSlash] - indicates whether to escape backslash(\\)
     * @param {Boolean} [urlEncode] - indicates whether to url-encode inputString
     * @returns {String}
     */
  sanitize: function (inputString, trim, quoteType, backSlash = false, urlEncode = false) {
    if (typeof inputString !== 'string') {
      return '';
    }

    if (urlEncode) {
      inputString = encodeURIComponent(inputString);
    }

    if (backSlash) {
      inputString = inputString.replace(/\\/g, '\\\\');
    }

    if (quoteType === '"') {
      inputString = inputString.replace(/"/g, '\\"');
      // Escape backslash if double quote was already escaped before call to sanitize
      inputString = inputString.replace(/(?<!\\)\\\\"/g, '\\\\\\"');

      // Escape special characters to preserve their literal meaning within double quotes
      inputString = inputString
        .replace(/`/g, '\\`')
        .replace(/#/g, '\\#')
        .replace(/\$/g, '\\$')
        .replace(/!/g, '\\!');
    }
    else if (quoteType === '\'') {
      // for curl escaping of single quotes inside single quotes involves changing of ' to '\''
      inputString = inputString.replace(/'/g, "'\\''"); // eslint-disable-line quotes
    }

    return trim ? inputString.trim() : inputString;
  },

  form: function (option, format) {
    if (format) {
      switch (option) {
        case '-s':
          return '--silent';
        case '-L':
          return '--location';
        case '-m':
          return '--max-time';
        case '-I':
          return '--head';
        case '-X':
          return '--request';
        case '-H':
          return '--header';
        case '-d':
          return '--data';
        case '-F':
          return '--form';
        case '-g':
          return '--globoff';
        default:
          return '';
      }
    }
    else {
      return option;
    }
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
   * Generates args required for NTLM authentication to happen
   *
   * @param {*} auth - The request sdk request.auth object
   * @param {string} quoteType - user provided option to decide whether to use single or double quotes
   * @param {string} format - user provided option to decide whether to use long format or not
   * @returns {string} - The string to be added if NTLM auth is required
   */
  getNtlmAuthInfo: function (auth, quoteType, format) {
    const ntlmAuth = auth && auth.ntlm;

    if (!auth || auth.type !== 'ntlm' || !ntlmAuth || !ntlmAuth.count || !ntlmAuth.count()) {
      return '';
    }

    const username = ntlmAuth.has('username') && ntlmAuth.get('username'),
      password = ntlmAuth.has('password') && ntlmAuth.get('password'),
      domain = ntlmAuth.has('domain') && ntlmAuth.get('domain');

    if (!username && !password) {
      return '';
    }

    var userArg = format ? '--user ' : '-u ',
      ntlmString = ' --ntlm ' + userArg + quoteType;

    if (domain) {
      ntlmString += self.sanitize(domain, true, quoteType) + '\\';
    }
    ntlmString += self.sanitize(username, true, quoteType) + ':' + self.sanitize(password, true, quoteType);
    ntlmString += quoteType;

    return ntlmString;
  },

  /**
   *
   * @param {*} urlObject The request sdk request.url object
   * @param {boolean} quoteType The user given quoteType
   * @returns {String} The final string after parsing all the parameters of the url including
   * protocol, auth, host, port, path, query, hash
   * This will be used because the url.toString() method returned the URL with non encoded query string
   * and hence a manual call is made to getQueryString() method with encode option set as true.
   */
  getUrlStringfromUrlObject: function (urlObject, quoteType) {
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
      let queryString = self.getQueryString(urlObject);
      queryString && (url += '?' + queryString);
    }
    if (urlObject.hash) {
      url += '#' + urlObject.hash;
    }

    return self.sanitize(url, false, quoteType);
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
  },

  /**
   * @param {Object} body
   * @returns {boolean}
   *
   * Determines if a request body is actually empty.
   * This is needed because body.isEmpty() returns false for formdata
   * and urlencoded when they contain only disabled params which will not
   * be a part of the curl request.
   */
  isBodyEmpty (body) {
    if (!body) {
      return true;
    }

    if (body.isEmpty()) {
      return true;
    }

    if (body.mode === 'formdata' || body.mode === 'urlencoded') {
      let memberCount = 0;
      body[body.mode] && body[body.mode].members && body[body.mode].members.forEach((param) => {
        if (!param.disabled) {
          memberCount += 1;
        }
      });

      return memberCount === 0;
    }

    return false;
  },

  /**
   * Decide whether we should add the HTTP method explicitly to the cURL command.
   *
   * @param {Object} request
   * @param {Object} options
   *
   * @returns {Boolean}
   */
  shouldAddHttpMethod: function (request, options) {
    let followRedirect = options.followRedirect,
      followOriginalHttpMethod = options.followOriginalHttpMethod,
      disableBodyPruning = true,
      isBodyEmpty = self.isBodyEmpty(request.body);

    // eslint-disable-next-line lodash/prefer-is-nil
    if (request.protocolProfileBehavior !== null && request.protocolProfileBehavior !== undefined) {
      followRedirect = _.get(request, 'protocolProfileBehavior.followRedirects', followRedirect);
      followOriginalHttpMethod =
        _.get(request, 'protocolProfileBehavior.followOriginalHttpMethod', followOriginalHttpMethod);
      disableBodyPruning = _.get(request, 'protocolProfileBehavior.disableBodyPruning', true);
    }

    if (followRedirect && followOriginalHttpMethod) {
      return true;
    }

    switch (request.method) {
      case 'HEAD':
        return false;
      case 'GET':
        // disableBodyPruning will generally not be present in the request
        // the only time it will be present, its value will be _false_
        // i.e. the user wants to prune the request body despite it being present
        if (!isBodyEmpty && disableBodyPruning) {
          return true;
        }

        return false;
      case 'POST':
        return isBodyEmpty;
      case 'DELETE':
      case 'PUT':
      case 'PATCH':
      default:
        return true;
    }
  }
};
