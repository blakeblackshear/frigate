/**
 * sanitizes input string by handling escape characters eg: converts '''' to '\'\'' and trim input if required
 *
 * @param {String} inputString - Input string to sanitize
 * @param {Boolean} [trim] - Indicates whether to trim string or not
 * @returns {String} Sanitized String handling escape characters
 */
function sanitize (inputString, trim) {
  /* instanbul ignore test */
  if (typeof inputString !== 'string') {
    return '';
  }
  inputString = inputString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return trim ? inputString.trim() : inputString;
}

/**
 *
 * @param {String} inputString - The string to return in a C# style
 * @returns {String} The string in a C# style
 */
function csharpify (inputString) {
  if (typeof inputString !== 'string') {
    return '';
  }

  inputString = inputString.toLowerCase();

  return inputString.charAt(0).toUpperCase() + inputString.slice(1);
}

/**
 * sanitizes input options
 *
 * @param {Object} options
 * @param {Array} optionsArray
 *
 * @returns {Object} - Sanitized options object
 */
function sanitizeOptions (options, optionsArray) {
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

module.exports = {
  sanitize: sanitize,
  csharpify: csharpify,
  sanitizeOptions: sanitizeOptions
};
