
/**
 * sanitizes input string by handling escape characters eg: converts '''' to '\'\''
 * and trim input if required
 *
 * @param {String} inputString
 * @param {Boolean} [trim] - indicates whether to trim string or not
 * @returns {String}
 */
function sanitize (inputString, trim) {
  if (typeof inputString !== 'string') {
    return '';
  }

  (trim) && (inputString = inputString.trim());
  return inputString.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * sanitizes input options
 *
 * @param {Object} options - Options provided by the user
 * @param {Array} optionsArray - options array received from getOptions function
 *
 * @returns {Object} - Sanitized options object
 */
function sanitizeOptions (options, optionsArray) {
  var result = {},
    defaultOptions = {},
    id;

  optionsArray.forEach((option) => {
    const { id, default: defaultValue, type, availableOptions } = option;
    defaultOptions[id] = { default: defaultValue, type };

    if (type === 'enum') {
      defaultOptions[id].availableOptions = availableOptions;
    }
  });

  /**
   * A type checker object that checks the type of an option value
   *
   * @typedef {Object} typeCheckers
   *
   * @property {function(Object, string): boolean} boolean - checks if the option value is a boolean
   * @property {function(Object, string): number} positiveInteger - checks if the option value is a positive integer
   * @property {function(Object, string): string} enum - checks if the option value is one of the available options
   * @property {function(Object, string): *} default - returns the option value without any type checking
   *
   */
  const typeCheckers = {
    boolean: (options, id) => {
      return typeof options[id] === 'boolean' ? options[id] : defaultOptions[id].default;
    },
    positiveInteger: (options, id) => {
      return typeof options[id] === 'number' && options[id] >= 0 ? options[id] : defaultOptions[id].default;
    },
    enum: (options, id) => {
      return defaultOptions[id].availableOptions.includes(options[id]) ? options[id] : defaultOptions[id].default;
    },
    default: (options, id) => {
      return options[id];
    }
  };

  for (const id in options) {
    if (options.hasOwnProperty(id) && defaultOptions[id] !== undefined) {
      const typeChecker = typeCheckers[defaultOptions[id].type] || typeCheckers.default;
      result[id] = typeChecker(options, id);
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
function addFormParam (array, key, type, val, disabled, contentType) {
  const formParam = {
    key,
    type,
    disabled,
    contentType
  };

  if (type === 'file') {
    formParam.src = val;
  }
  else {
    formParam.value = val;
  }

  array.push(formParam);
}

module.exports = {
  sanitize: sanitize,
  sanitizeOptions: sanitizeOptions,
  addFormParam: addFormParam
};
