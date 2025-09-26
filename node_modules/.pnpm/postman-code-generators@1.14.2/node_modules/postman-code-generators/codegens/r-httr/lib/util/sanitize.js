module.exports = {
  /**
    * used to sanitize eg: trim, handle escape characters
    *
    * @param {String} inputString - input
    * @param {Boolean} inputTrim - whether to trim the input
    * @returns {String}
   */
  sanitizeString: function (inputString, inputTrim) {
    if (typeof inputString !== 'string') {
      return '';
    }
    inputString = inputTrim && typeof inputTrim === 'boolean' ? inputString.trim() : inputString;
    return inputString
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\\\'');
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
  }

};
