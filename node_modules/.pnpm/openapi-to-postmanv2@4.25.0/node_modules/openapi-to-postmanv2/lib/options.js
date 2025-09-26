const { filterOptionsByVersion } = require('./common/versionUtils');

const _ = require('lodash'),
  VALID_MODES = ['document', 'use'],
  VERSION30 = '3.0',
  VERSION31 = '3.1',
  VERSION20 = '2.0',
  SUPPORTED_VERSIONS = [VERSION20, VERSION30, VERSION31],
  MODULE_VERSION = {
    V1: 'v1',
    V2: 'v2'
  };

/**
 * Takes a list of arguments and resolve them acording its content
 * @param {array} args The arguments that will be resolved
 * @returns {array} The list of arguments after have been resolved
 */
function handleArguments(args) {
  let mode = 'document',
    criteria = { version: VERSION30 };
  args.forEach((argument) => {
    if (typeof argument === 'object' && Object.keys(argument).length > 0) {
      criteria = argument.hasOwnProperty('version') && SUPPORTED_VERSIONS.includes(argument.version) ?
        Object.assign(criteria, argument) :
        Object.assign(argument, criteria);
    }
    else if (VALID_MODES.includes(argument)) {
      mode = argument;
    }
  });
  return { mode, criteria };
}

module.exports = {
  // default options
  // if mode=document, returns an array of name/id/default etc.
  /**
   * name - human-readable name for the option
   * id - key to pass the option with
   * type - boolean or enum for now
   * default - the value that's assumed if not specified
   * availableOptions - allowed values (only for type=enum)
   * description - human-readable description of the item
   * external - whether the option is settable via the API
   * usage - array of supported types of usage (i.e. CONVERSION, VALIDATION)
   *
   * @param {string} [mode='document'] Describes use-case. 'document' will return an array
   * with all options being described. 'use' will return the default values of all options
   * @param {Object} criteria Decribes required criteria for options to be returned.
   * @param {string} criteria.version The version of the OpenAPI spec to be converted
   *  (can be one of '2.0', '3.0', '3.1')
   * @param {string} criteria.moduleVersion The version of the module (can be one of 'v1' or 'v2')
   * @param {Array<string>} criteria.usage The usage of the option (values can be one of 'CONVERSION', 'VALIDATION')
   * @param {boolean} criteria.external Whether the option is exposed to Postman App UI or not
   * @returns {mixed} An array or object (depending on mode) that describes available options
   */
  getOptions: function(mode = 'document', criteria = {}) {
    // Override mode & criteria if first arg is criteria (objects)
    const resolvedArguments = handleArguments([mode, criteria]);
    mode = resolvedArguments.mode;
    criteria = resolvedArguments.criteria;

    let optsArray = [
      {
        name: 'Naming requests',
        id: 'requestNameSource',
        type: 'enum',
        default: 'Fallback',
        availableOptions: ['URL', 'Fallback'],
        description: 'Determines how the requests inside the generated collection will be named.' +
        ' If “Fallback” is selected, the request will be named after one of the following schema' +
        ' values: `summary`, `operationId`, `description`, `url`.',
        external: true,
        usage: ['CONVERSION', 'VALIDATION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Set indent character',
        id: 'indentCharacter',
        type: 'enum',
        default: 'Space',
        availableOptions: ['Space', 'Tab'],
        description: 'Option for setting indentation character.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Collapse redundant folders',
        id: 'collapseFolders',
        type: 'boolean',
        default: true,
        description: 'Importing will collapse all folders that have only one child element and lack ' +
        'persistent folder-level data.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V1]
      },
      {
        name: 'Optimize conversion',
        id: 'optimizeConversion',
        type: 'boolean',
        default: true,
        description: 'Optimizes conversion for large specification, disabling this option might affect' +
          ' the performance of conversion.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V1]
      },
      {
        name: 'Request parameter generation',
        id: 'requestParametersResolution',
        type: 'enum',
        default: 'Schema',
        availableOptions: ['Example', 'Schema'],
        description: 'Select whether to generate the request parameters based on the' +
        ' [schema](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) or the' +
        ' [example](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject)' +
        ' in the schema.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V1]
      },
      {
        name: 'Response parameter generation',
        id: 'exampleParametersResolution',
        type: 'enum',
        default: 'Example',
        availableOptions: ['Example', 'Schema'],
        description: 'Select whether to generate the response parameters based on the' +
        ' [schema](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) or the' +
        ' [example](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject)' +
        ' in the schema.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V1]
      },
      {
        name: 'Disabled Parameter validation',
        id: 'disabledParametersValidation',
        type: 'boolean',
        default: true,
        description: 'Whether disabled parameters of collection should be validated',
        external: false,
        usage: ['VALIDATION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Parameter generation',
        id: 'parametersResolution',
        type: 'enum',
        default: 'Schema',
        availableOptions: ['Example', 'Schema'],
        description: 'Select whether to generate the request and response parameters based on the' +
        ' [schema](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) or the' +
        ' [example](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject)' +
        ' in the schema.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Folder organization',
        id: 'folderStrategy',
        type: 'enum',
        default: 'Paths',
        availableOptions: ['Paths', 'Tags'],
        description: 'Select whether to create folders according to the spec’s paths or tags.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Enable Schema Faking',
        id: 'schemaFaker',
        type: 'boolean',
        default: true,
        description: 'Whether or not schemas should be faked.',
        external: false,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Schema resolution nesting limit',
        id: 'stackLimit',
        type: 'integer',
        default: 10,
        description: 'Number of nesting limit till which schema resolution will happen. Increasing this limit may' +
          ' result in more time to convert collection depending on complexity of specification. (To make sure this' +
          ' option works correctly "optimizeConversion" option needs to be disabled)',
        external: false,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Include auth info in example requests',
        id: 'includeAuthInfoInExample',
        type: 'boolean',
        default: true,
        description: 'Select whether to include authentication parameters in the example request.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Short error messages during request <> schema validation',
        id: 'shortValidationErrors',
        type: 'boolean',
        default: false,
        description: 'Whether detailed error messages are required for request <> schema validation operations.',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Properties to ignore during validation',
        id: 'validationPropertiesToIgnore',
        type: 'array',
        default: [],
        description: 'Specific properties (parts of a request/response pair) to ignore during validation.' +
          ' Must be sent as an array of strings. Valid inputs in the array: PATHVARIABLE, QUERYPARAM,' +
          ' HEADER, BODY, RESPONSE_HEADER, RESPONSE_BODY',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Whether MISSING_IN_SCHEMA mismatches should be returned',
        id: 'showMissingInSchemaErrors',
        type: 'boolean',
        default: false,
        description: 'MISSING_IN_SCHEMA indicates that an extra parameter was included in the request. For most ' +
          'use cases, this need not be considered an error.',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Show detailed body validation messages',
        id: 'detailedBlobValidation',
        type: 'boolean',
        default: false,
        description: 'Determines whether to show detailed mismatch information for application/json content ' +
          'in the request/response body.',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Suggest fixes if available',
        id: 'suggestAvailableFixes',
        type: 'boolean',
        default: false,
        description: 'Whether to provide fixes for patching corresponding mismatches.',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Show Metadata validation messages',
        id: 'validateMetadata',
        type: 'boolean',
        default: false,
        description: 'Whether to show mismatches for incorrect name and description of request',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Ignore mismatch for unresolved postman variables',
        id: 'ignoreUnresolvedVariables',
        type: 'boolean',
        default: false,
        description: 'Whether to ignore mismatches resulting from unresolved variables in the Postman request',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Enable strict request matching',
        id: 'strictRequestMatching',
        type: 'boolean',
        default: false,
        description: 'Whether requests should be strictly matched with schema operations. Setting to true will not ' +
          'include any matches where the URL path segments don\'t match exactly.',
        external: true,
        usage: ['VALIDATION'],
        supportedIn: [VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Allow matching of Path variables present in URL',
        id: 'allowUrlPathVarMatching',
        type: 'boolean',
        default: false,
        description: 'Whether to allow matching path variables that are available as part of URL itself ' +
          'in the collection request',
        external: true,
        supportedIn: [VERSION30, VERSION31],
        usage: ['VALIDATION'],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Enable optional parameters',
        id: 'enableOptionalParameters',
        type: 'boolean',
        default: true,
        description: 'Optional parameters aren\'t selected in the collection. ' +
          'Once enabled they will be selected in the collection and request as well.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Keep implicit headers',
        id: 'keepImplicitHeaders',
        type: 'boolean',
        default: false,
        description: 'Whether to keep implicit headers from the OpenAPI specification, which are removed by default.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Include webhooks',
        id: 'includeWebhooks',
        type: 'boolean',
        default: false,
        description: 'Select whether to include Webhooks in the generated collection',
        external: false,
        usage: ['CONVERSION'],
        supportedIn: [VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Include Reference map',
        id: 'includeReferenceMap',
        type: 'boolean',
        default: false,
        description: 'Whether or not to include reference map or not as part of output',
        external: false,
        usage: ['BUNDLE'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Include deprecated properties',
        id: 'includeDeprecated',
        type: 'boolean',
        default: true,
        description: 'Select whether to include deprecated operations, parameters,' +
          ' and properties in generated collection or not',
        external: true,
        usage: ['CONVERSION', 'VALIDATION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Always inherit authentication',
        id: 'alwaysInheritAuthentication',
        type: 'boolean',
        default: false,
        description: 'Whether authentication details should be included on every request, or always inherited from ' +
          'the collection.',
        external: true,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2, MODULE_VERSION.V1]
      },
      {
        name: 'Select request body type',
        id: 'preferredRequestBodyType',
        type: 'enum',
        default: 'first-listed',
        availableOptions: ['x-www-form-urlencoded', 'form-data', 'raw', 'first-listed'],
        description: 'When there are multiple content-types defined in the request body of OpenAPI, the conversion ' +
          'selects the preferred option content-type as request body.If "first-listed" is set, the first ' +
          'content-type defined in the OpenAPI spec will be selected.',
        external: false,
        usage: ['CONVERSION'],
        supportedIn: [VERSION20, VERSION30, VERSION31],
        supportedModuleVersion: [MODULE_VERSION.V2]
      }
    ];

    optsArray = _.filter(optsArray, (option) => {
      if (option.disabled) { return false; }

      if (_.isObject(criteria)) {
        if (typeof criteria.external === 'boolean' && option.external !== criteria.external) {
          return false;
        }

        if (_.isArray(criteria.usage)) {
          /**
           * We return return a option if any of the criteria.usage value matches with what is
           * available in option.usage
           */
          if (_.difference(criteria.usage, option.usage).length === criteria.usage.length) {
            return false;
          }
        }

        // Setting default value
        criteria.moduleVersion = _.has(criteria, 'moduleVersion') ? criteria.moduleVersion : MODULE_VERSION.V2;

        if (!_.includes(option.supportedModuleVersion, criteria.moduleVersion)) {
          return false;
        }
      }

      return true;
    });

    if (mode === 'use') {
      // options to be used as default kv-pairs
      let defOptions = {};
      optsArray = filterOptionsByVersion(optsArray, criteria.version);
      _.each(optsArray, (opt) => {
        // special handling for indent character as in documentation it states `Tab` and `Space`
        // but for the generation mode, we need actual values
        if (opt.id === 'indentCharacter') {
          defOptions[opt.id] = opt.default === 'tab' ? '\t' : '  ';
        }
        else {
          defOptions[opt.id] = opt.default;
        }
      });
      return defOptions;
    }

    return optsArray;
  }
};
