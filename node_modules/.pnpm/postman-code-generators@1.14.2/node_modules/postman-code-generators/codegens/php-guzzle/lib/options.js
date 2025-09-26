const options = [
  {
    name: 'Set indentation count',
    id: 'indentCount',
    type: 'positiveInteger',
    default: 2,
    description:
      'Set the number of indentation characters to add per code level'
  },
  {
    name: 'Set indentation type',
    id: 'indentType',
    type: 'enum',
    availableOptions: ['Tab', 'Space'],
    default: 'Space',
    description: 'Select the character used to indent lines of code'
  },
  {
    name: 'Trim request body fields',
    id: 'trimRequestBody',
    type: 'boolean',
    default: false,
    description:
      'Remove white space and additional lines that may affect the server\'s response'
  },
  {
    name: 'Set request timeout',
    id: 'requestTimeout',
    type: 'positiveInteger',
    default: 0,
    description:
      'Set number of milliseconds the request should wait for a response' +
      ' before timing out (use 0 for infinity)'
  },
  {
    name: 'Follow redirects',
    id: 'followRedirect',
    type: 'boolean',
    default: true,
    description: 'Automatically follow HTTP redirects'
  },
  {
    name: 'Set communication type',
    id: 'asyncType',
    type: 'enum',
    availableOptions: ['async', 'sync'],
    default: 'async',
    description: 'Set if the requests will be asynchronous or synchronous'
  },
  {
    name: 'Include boilerplate',
    id: 'includeBoilerplate',
    type: 'boolean',
    default: false,
    description: 'Include class definition and import statements in snippet'
  }
];

/**
 * Used in order to get options for generation of PHP-Guzzle code snippet
 *
 * @module getOptions
 *
 * @returns {Array} Options specific to generation of PHP-Guzzlep code snippet
 */
function getOptions () {
  return options;
}

module.exports = {
  /**
   * Used in order to get options for generation of PHP-Guzzle code snippet
   *
   * @module getOptions
   *
   * @returns {Array} Options specific to generation of PHP-Guzzle code snippet
   */
  getOptions
};
