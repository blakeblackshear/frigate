/**
 * This file contains util functions that need OAS-awareness
 * utils.js contains other util functions
 */
const { formatDataPath, checkIsCorrectType, isKnownType } = require('./common/schemaUtilsCommon.js'),
  { getConcreteSchemaUtils, isSwagger, validateSupportedVersion } = require('./common/versionUtils.js'),
  async = require('async'),
  { Variable } = require('postman-collection/lib/collection/variable'),
  { QueryParam } = require('postman-collection/lib/collection/query-param'),
  { Header } = require('postman-collection/lib/collection/header'),
  { ItemGroup } = require('postman-collection/lib/collection/item-group'),
  { Item } = require('postman-collection/lib/collection/item'),
  { FormParam } = require('postman-collection/lib/collection/form-param'),
  { RequestAuth } = require('postman-collection/lib/collection/request-auth'),
  { Response } = require('postman-collection/lib/collection/response'),
  { RequestBody } = require('postman-collection/lib/collection/request-body'),
  schemaFaker = require('../assets/json-schema-faker.js'),
  deref = require('./deref.js'),
  _ = require('lodash'),
  xmlFaker = require('./xmlSchemaFaker.js'),
  openApiErr = require('./error.js'),
  ajvValidationError = require('./ajValidation/ajvValidationError'),
  utils = require('./utils.js'),
  { Node, Trie } = require('./trie.js'),
  { validateSchema } = require('./ajValidation/ajvValidation'),
  inputValidation = require('./30XUtils/inputValidation'),
  traverseUtility = require('neotraverse/legacy'),
  { ParseError } = require('./common/ParseError.js'),
  SCHEMA_FORMATS = {
    DEFAULT: 'default', // used for non-request-body data and json
    XML: 'xml' // used for request-body XMLs
  },
  URLENCODED = 'application/x-www-form-urlencoded',
  APP_JSON = 'application/json',
  APP_JS = 'application/javascript',
  TEXT_XML = 'text/xml',
  APP_XML = 'application/xml',
  TEXT_PLAIN = 'text/plain',
  TEXT_HTML = 'text/html',
  FORM_DATA = 'multipart/form-data',
  REQUEST_TYPE = {
    EXAMPLE: 'EXAMPLE',
    ROOT: 'ROOT'
  },
  PARAMETER_SOURCE = {
    REQUEST: 'REQUEST',
    RESPONSE: 'RESPONSE'
  },
  HEADER_TYPE = {
    JSON: 'json',
    XML: 'xml',
    INVALID: 'invalid'
  },
  PREVIEW_LANGUAGE = {
    JSON: 'json',
    XML: 'xml',
    TEXT: 'text',
    HTML: 'html'
  },
  authMap = {
    basicAuth: 'basic',
    bearerAuth: 'bearer',
    digestAuth: 'digest',
    hawkAuth: 'hawk',
    oAuth1: 'oauth1',
    oAuth2: 'oauth2',
    ntlmAuth: 'ntlm',
    awsSigV4: 'awsv4',
    normal: null
  },
  propNames = {
    QUERYPARAM: 'query parameter',
    PATHVARIABLE: 'path variable',
    HEADER: 'header',
    BODY: 'request body',
    RESPONSE_HEADER: 'response header',
    RESPONSE_BODY: 'response body'
  },
  // Specifies types of processing Refs
  PROCESSING_TYPE = {
    VALIDATION: 'VALIDATION',
    CONVERSION: 'CONVERSION'
  },
  FLOW_TYPE = {
    authorizationCode: 'authorization_code',
    implicit: 'implicit',
    password: 'password_credentials',
    clientCredentials: 'client_credentials'
  },

  // These are the methods supported in the PathItem schema
  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject
  METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'],

  // These headers are to be validated explicitly
  // As these are not defined under usual parameters object and need special handling
  IMPLICIT_HEADERS = [
    'content-type', // 'content-type' is defined based on content/media-type of req/res body,
    'accept',
    'authorization'
  ],

  crypto = require('crypto'),
  DEFAULT_SCHEMA_UTILS = require('./30XUtils/schemaUtils30X'),
  { getRelatedFiles } = require('./relatedFiles'),
  { compareVersion } = require('./common/versionUtils.js'),
  parse = require('./parse'),
  { getBundleContentAndComponents, parseFileOrThrow } = require('./bundle.js'),
  MULTI_FILE_API_TYPE_ALLOWED_VALUE = 'multiFile',
  MEDIA_TYPE_ALL_RANGES = '*/*';
  /* eslint-enable */

// See https://github.com/json-schema-faker/json-schema-faker/tree/master/docs#available-options
schemaFaker.option({
  requiredOnly: false,
  optionalsProbability: 1.0, // always add optional fields
  maxLength: 256,
  minItems: 1, // for arrays
  maxItems: 20, // limit on maximum number of items faked for (type: arrray)
  useDefaultValue: true,
  ignoreMissingRefs: true,
  avoidExampleItemsLength: true // option to avoid validating type array schema example's minItems and maxItems props.
});

/**
 *
 * @param {*} input - input string that needs to be hashed
 * @returns {*} sha1 hash of the string
 */
function hash(input) {
  return crypto.createHash('sha1').update(input).digest('base64');
}

/**
 * Remove or keep the deprecated properties according to the option
 * @param {object} resolvedSchema - the schema to verify properties
 * @param {boolean} includeDeprecated - Whether to include the deprecated properties
 * @returns {undefined} undefined
 */
function verifyDeprecatedProperties(resolvedSchema, includeDeprecated) {
  traverseUtility(resolvedSchema.properties).forEach(function (property) {
    if (property && typeof property === 'object') {
      if (property.deprecated === true && includeDeprecated === false) {
        this.delete();
      }
    }
  });
}

/**
 * Adds XML version content for XML specific bodies.
 *
 * @param {*} bodyContent - XML Body content
 * @returns {*} - Body with correct XML version content
 */
function getXmlVersionContent (bodyContent) {
  bodyContent = (typeof bodyContent === 'string') ? bodyContent : '';
  const regExp = new RegExp('([<\\?xml]+[\\s{1,}]+[version="\\d.\\d"]+[\\sencoding="]+.{1,15}"\\?>)');
  let xmlBody = bodyContent;

  if (!bodyContent.match(regExp)) {
    const versionContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlBody = versionContent + xmlBody;
  }
  return xmlBody;
}

/**
* Safe wrapper for schemaFaker that resolves references and
* removes things that might make schemaFaker crash
* @param {*} oldSchema the schema to fake
* @param {string} resolveTo The desired JSON-generation mechanism (schema: prefer using the JSONschema to
   generate a fake object, example: use specified examples as-is). Default: schema
* @param {*} resolveFor - resolve refs for flow validation/conversion (value to be one of VALIDATION/CONVERSION)
* @param {string} parameterSourceOption Specifies whether the schema being faked is from a request or response.
* @param {*} components list of predefined components (with schemas)
* @param {string} schemaFormat default or xml
* @param {object} schemaCache - object storing schemaFaker and schemaResolution caches
* @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
* @returns {object} fakedObject
*/
function safeSchemaFaker (oldSchema, resolveTo, resolveFor, parameterSourceOption, components,
  schemaFormat, schemaCache, options) {
  var prop, key, resolvedSchema, fakedSchema,
    schemaFakerCache = _.get(schemaCache, 'schemaFakerCache', {});
  let concreteUtils = components && components.hasOwnProperty('concreteUtils') ?
    components.concreteUtils :
    DEFAULT_SCHEMA_UTILS;
  const indentCharacter = options.indentCharacter,
    includeDeprecated = options.includeDeprecated;

  resolvedSchema = deref.resolveRefs(oldSchema, parameterSourceOption, components, {
    resolveFor,
    resolveTo,
    stackLimit: options.stackLimit,
    analytics: _.get(schemaCache, 'analytics', {})
  });

  resolvedSchema = concreteUtils.fixExamplesByVersion(resolvedSchema);
  key = JSON.stringify(resolvedSchema);

  if (resolveTo === 'schema') {
    key = 'resolveToSchema ' + key;
    schemaFaker.option({
      useExamplesValue: false,
      useDefaultValue: true
    });
  }
  else if (resolveTo === 'example') {
    key = 'resolveToExample ' + key;
    schemaFaker.option({
      useExamplesValue: true
    });
  }

  if (resolveFor === PROCESSING_TYPE.VALIDATION) {
    schemaFaker.option({
      useDefaultValue: false,
      avoidExampleItemsLength: false
    });
  }

  if (schemaFormat === 'xml') {
    key += ' schemaFormatXML';
  }
  else {
    key += ' schemaFormatDEFAULT';
  }

  key = hash(key);
  if (schemaFakerCache[key]) {
    return schemaFakerCache[key];
  }

  if (resolvedSchema.properties) {
    // If any property exists with format:binary (and type: string) schemaFaker crashes
    // we just delete based on format=binary
    for (prop in resolvedSchema.properties) {
      if (resolvedSchema.properties.hasOwnProperty(prop)) {
        if (resolvedSchema.properties[prop].format === 'binary') {
          delete resolvedSchema.properties[prop].format;
        }
      }
    }
    verifyDeprecatedProperties(resolvedSchema, includeDeprecated);
  }

  try {
    if (schemaFormat === SCHEMA_FORMATS.XML) {
      fakedSchema = xmlFaker(null, resolvedSchema, indentCharacter, resolveTo);
      schemaFakerCache[key] = fakedSchema;
      return fakedSchema;
    }
    // for JSON, the indentCharacter will be applied in the JSON.stringify step later on
    fakedSchema = schemaFaker(resolvedSchema, null, _.get(schemaCache, 'schemaValidationCache'));
    schemaFakerCache[key] = fakedSchema;
    return fakedSchema;
  }
  catch (e) {
    console.warn(
      'Error faking a schema. Not faking this schema. Schema:', resolvedSchema,
      'Error', e
    );
    return null;
  }
}

/**
 * Verifies if the deprecated operations should be added
 *
 * @param {object} operation - openAPI operation object
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
 * @returns {boolean} whether to add or not the deprecated operation
 */
function shouldAddDeprecatedOperation (operation, options) {
  if (typeof operation === 'object') {
    return !operation.deprecated ||
      (operation.deprecated === true && options.includeDeprecated === true);
  }
  return false;
}


module.exports = {

  safeSchemaFaker: safeSchemaFaker,

  /**
   * Analyzes the spec to determine the size of the spec,
   * number of request that will be generated out this spec, and
   * number or references present in the spec.
   *
   * @param {Object} spec JSON
   * @return {Object} returns number of requests that will be generated,
   *  number of refs present and size of the spec.
   */
  analyzeSpec: function (spec) {
    var size,
      numberOfRefs = 0,
      numberOfExamples = 0,
      specString,
      numberOfRequests = 0;

    // Stringify and add whitespaces as there would be in a normal file
    // To get accurate disk size
    specString = JSON.stringify(spec);
    // Size in MB
    size = Buffer.byteLength(specString, 'utf8') / (1024 * 1024);

    // No need to check for number of requests or refs if the size is greater than 8 MB
    // The complexity is 10.
    if (size < 8) {
      // Finds the number of requests that would be generated from this spec
      if (_.isObject(spec.paths)) {
        Object.values(spec.paths).forEach((value) => {
          _.keys(value).forEach((key) => {
            if (METHODS.includes(key)) {
              numberOfRequests++;
            }
          });
        });
      }

      // Number of times the term $ref is repeated in the spec.
      numberOfRefs = (specString.match(/\$ref/g) || []).length;

      // Number of times `example` is present
      numberOfExamples = (specString.match(/example/g) || []).length;
    }

    return {
      size,
      numberOfRefs,
      numberOfRequests,
      numberOfExamples
    };
  },

  /** Determines the complexity score and stackLimit
   *
   * @param {Object} analysis the object returned by analyzeSpec function
   * @param {Object} options Current options
   *
   * @returns {Object} computedOptions - contains two new options i.e. stackLimit and complexity score
   */
  determineOptions: function (analysis, options) {
    let size = analysis.size,
      numberOfRefs = analysis.numberOfRefs,
      numberOfRequests = analysis.numberOfRequests;

    var computedOptions = _.clone(options);

    computedOptions.stackLimit = 10;
    // This is the score that is given to each spec on the basis of the
    // number of references present in spec and the number of requests that will be generated.
    // This ranges from 0-10.
    computedOptions.complexityScore = 0;

    // Anything above the size of 8MB will be considered a big spec and given the
    // least stack limit and the highest complexity score.
    if (size >= 8) {
      console.warn('Complexity score = 10');
      computedOptions.stackLimit = 2;
      computedOptions.complexityScore = 10;
      return computedOptions;
    }

    else if (size >= 5 || numberOfRequests > 1500 || numberOfRefs > 1500) {
      computedOptions.stackLimit = 3;
      computedOptions.complexityScore = 9;
      return computedOptions;
    }
    else if (size >= 1 && (numberOfRequests > 1000 || numberOfRefs > 1000)) {
      computedOptions.stackLimit = 5;
      computedOptions.complexityScore = 8;
      return computedOptions;
    }
    else if (numberOfRefs > 500 || numberOfRequests > 500) {
      computedOptions.stackLimit = 6;
      computedOptions.complexityScore = 6;
      return computedOptions;
    }

    return computedOptions;

  },

  /**
  * Changes the {} around scheme and path variables to :variable
  * @param {string} url - the url string
  * @returns {string} string after replacing /{pet}/ with /:pet/
  */
  fixPathVariablesInUrl: function (url) {
    // URL should always be string so update value if non-string value is found
    if (typeof url !== 'string') {
      return '';
    }

    // All complicated logic removed
    // This simply replaces all instances of {text} with {{text}}
    // text cannot have any of these 3 chars: /{}
    // {{text}} will not be converted

    let replacer = function (match, p1, offset, string) {
      if (string[offset - 1] === '{' && string[offset + match.length + 1] !== '}') {
        return match;
      }
      return '{' + p1 + '}';
    };
    return _.isString(url) ? url.replace(/(\{[^\/\{\}]+\})/g, replacer) : '';
  },

  /**
   * Changes path structure that contains {var} to :var and '/' to '_'
   * This is done so generated collection variable is in correct format
   * i.e. variable '{{item/{itemId}}}' is considered separates variable in URL by collection sdk
   * @param {string} path - path defined in openapi spec
   * @returns {string} - string after replacing {itemId} with :itemId
   */
  fixPathVariableName: function (path) {
    // Replaces structure like 'item/{itemId}' into 'item-itemId-Url'
    return path.replace(/\//g, '-').replace(/[{}]/g, '') + '-Url';
  },

  /**
   * Returns a description that's usable at the collection-level
   * Adds the collection description and uses any relevant contact info
   * @param {*} openapi The JSON representation of the OAS spec
   * @returns {string} description
   */
  getCollectionDescription: function (openapi) {
    let description = _.get(openapi, 'info.description', '');
    if (_.get(openapi, 'info.contact')) {
      let contact = [];
      if (openapi.info.contact.name) {
        contact.push(' Name: ' + openapi.info.contact.name);
      }
      if (openapi.info.contact.email) {
        contact.push(' Email: ' + openapi.info.contact.email);
      }
      if (contact.length > 0) {
        // why to add unnecessary lines if there is no description
        if (description !== '') {
          description += '\n\n';
        }
        description += 'Contact Support:\n' + contact.join('\n');
      }
    }
    return description;
  },

  /**
  * Get the format of content type header
  * @param {string} cTypeHeader - the content type header string
  * @returns {string} type of content type header
  */
  getHeaderFamily: function(cTypeHeader) {
    let mediaType = this.parseMediaType(cTypeHeader);

    if (mediaType.type === 'application' &&
      (mediaType.subtype === 'json' || _.endsWith(mediaType.subtype, '+json'))) {
      return HEADER_TYPE.JSON;
    }
    if ((mediaType.type === 'application' || mediaType.type === 'text') &&
      (mediaType.subtype === 'xml' || _.endsWith(mediaType.subtype, '+xml'))) {
      return HEADER_TYPE.XML;
    }
    return HEADER_TYPE.INVALID;
  },

  /**
   * Gets the description of the parameter.
   * If the parameter is required, it prepends a `(Requried)` before the parameter description
   * If the parameter type is enum, it appends the possible enum values
   * @param {object} parameter - input param for which description needs to be returned
   * @returns {string} description of the parameters
   */
  getParameterDescription: function(parameter) {
    if (!_.isObject(parameter)) {
      return '';
    }
    return (parameter.required ? '(Required) ' : '') + (parameter.description || '') +
      (parameter.enum ? ' (This can only be one of ' + parameter.enum + ')' : '');
  },

  /**
   * Given parameter objects, it assigns example/examples of parameter object as schema example.
   *
   * @param {Object} parameter - parameter object
   * @returns {null} - null
   */
  assignParameterExamples: function (parameter) {
    let example = _.get(parameter, 'example'),
      examples = _.values(_.get(parameter, 'examples'));

    if (example !== undefined) {
      _.set(parameter, 'schema.example', example);
    }
    else if (examples) {
      let exampleToUse = _.get(examples, '[0].value');

      !_.isUndefined(exampleToUse) && (_.set(parameter, 'schema.example', exampleToUse));
    }
  },

  /**
   * Converts the necessary server variables to the
   * something that can be added to the collection
   * TODO: Figure out better description
   * @param {object} serverVariables - Object containing the server variables at the root/path-item level
   * @param {string} keyName - an additional key to add the serverUrl to the variable list
   * @param {string} serverUrl - URL from the server object
   * @returns {object} modified collection after the addition of the server variables
   */
  convertToPmCollectionVariables: function(serverVariables, keyName, serverUrl = '') {
    var variables = [];
    if (serverVariables) {
      _.forOwn(serverVariables, (value, key) => {
        let description = this.getParameterDescription(value);
        variables.push(new Variable({
          key: key,
          value: value.default || '',
          description: description
        }));
      });
    }
    if (keyName) {
      variables.push(new Variable({
        key: keyName,
        value: serverUrl,
        type: 'string'
      }));
    }
    return variables;
  },

  /**
   * Returns params applied to specific operation with resolved references. Params from parent
   * blocks (collection/folder) are merged, so that the request has a flattened list of params needed.
   * OperationParams take precedence over pathParams
   * @param {array} operationParam operation (Postman request)-level params.
   * @param {array} pathParam are path parent-level params.
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {*} combined requestParams from operation and path params.
   */
  getRequestParams: function(operationParam, pathParam, components, options) {
    if (!Array.isArray(operationParam)) {
      operationParam = [];
    }
    if (!Array.isArray(pathParam)) {
      pathParam = [];
    }
    pathParam.forEach((param, index, arr) => {
      if (_.has(param, '$ref')) {
        arr[index] = this.getRefObject(param.$ref, components, options);
      }
    });

    operationParam.forEach((param, index, arr) => {
      if (_.has(param, '$ref')) {
        arr[index] = this.getRefObject(param.$ref, components, options);
      }
    });

    if (_.isEmpty(pathParam)) {
      return operationParam;
    }
    else if (_.isEmpty(operationParam)) {
      return pathParam;
    }

    // If both path and operation params exist,
    // we need to de-duplicate
    // A param with the same name and 'in' value from operationParam
    // will get precedence
    var reqParam = operationParam.slice();
    pathParam.forEach((param) => {
      var dupParam = operationParam.find(function(element) {
        return element.name === param.name && element.in === param.in &&
        // the below two conditions because undefined === undefined returns true
          element.name && param.name &&
          element.in && param.in;
      });
      if (!dupParam) {
        // if there's no duplicate param in operationParam,
        // use the one from the common pathParam list
        // this ensures that operationParam is given precedence
        reqParam.push(param);
      }
    });
    return reqParam;
  },

  /**
   * Generates a Trie-like folder structure from the root path object of the OpenAPI specification.
   * @param {Object} spec - specification in json format
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {boolean} fromWebhooks - true when we are creating the webhooks group trie - default: false
   * @returns {Object} - The final object consists of the tree structure
   */
  generateTrieFromPaths: function (spec, options, fromWebhooks = false) {
    let concreteUtils = getConcreteSchemaUtils({ type: 'json', data: spec }),
      specComponentsAndUtils = {
        concreteUtils
      };
    var paths = fromWebhooks ? spec.webhooks : spec.paths, // the first level of paths
      currentPath = '',
      currentPathObject = '',
      commonParams = '',
      collectionVariables = {},
      operationItem,
      pathLevelServers = '',
      pathLength,
      currentPathRequestCount,
      currentNode,
      i,
      summary,
      path,
      pathMethods = [],
      // creating a root node for the trie (serves as the root dir)
      trie = new Trie(new Node({
        name: '/'
      })),

      // returns a list of methods supported at each pathItem
      // some pathItem props are not methods
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject
      getPathMethods = function(pathKeys) {
        var methods = [];
        // TODO: Show warning for incorrect schema if !pathKeys
        pathKeys && pathKeys.forEach(function(element) {
          if (METHODS.includes(element)) {
            methods.push(element);
          }
        });
        return methods;
      };
    Object.assign(specComponentsAndUtils, concreteUtils.getRequiredData(spec));

    for (path in paths) {
      if (paths.hasOwnProperty(path) && typeof paths[path] === 'object' && paths[path]) {
        currentPathObject = paths[path];

        // discard the leading slash, if it exists
        if (path[0] === '/') {
          path = path.substring(1);
        }

        if (fromWebhooks) {
          // When we work with webhooks the path value corresponds to the webhook's name
          // and it won't be treated as path
          currentPath = path === '' ? ['(root)'] : [path];
        }
        else {
          // split the path into indiv. segments for trie generation
          // unless path it the root endpoint
          currentPath = path === '' ? ['(root)'] : path.split('/').filter((pathItem) => {
            // remove any empty pathItems that might have cropped in
            // due to trailing or double '/' characters
            return pathItem !== '';
          });
        }

        pathLength = currentPath.length;

        // get method names available for this path
        pathMethods = getPathMethods(_.keys(currentPathObject));

        // the number of requests under this node
        currentPathRequestCount = pathMethods.length;
        currentNode = trie.root;

        // adding children for the nodes in the trie
        // start at the top-level and do a DFS
        for (i = 0; i < pathLength; i++) {
          /**
           * Use hasOwnProperty to determine if property exists as certain JS fuction are present
           * as part of each object. e.g. `constructor`.
           */
          if (!(typeof currentNode.children === 'object' && currentNode.children.hasOwnProperty(currentPath[i]))) {
            // if the currentPath doesn't already exist at this node,
            // add it as a folder
            currentNode.addChildren(currentPath[i], new Node({
              name: currentPath[i],
              requestCount: 0,
              requests: [],
              children: {},
              type: 'item-group',
              childCount: 0
            }));

            // We are keeping the count children in a folder which can be a request or folder
            // For ex- In case of /pets/a/b, pets has 1 childCount (i.e a)
            currentNode.childCount += 1;
          }
          // requestCount increment for the node we just added
          currentNode.children[currentPath[i]].requestCount += currentPathRequestCount;
          currentNode = currentNode.children[currentPath[i]];
        }

        // extracting common parameters for all the methods in the current path item
        if (currentPathObject.hasOwnProperty('parameters')) {
          commonParams = currentPathObject.parameters;
        }

        // storing common path/collection vars from the server object at the path item level
        if (currentPathObject.hasOwnProperty('servers')) {
          pathLevelServers = currentPathObject.servers;
          collectionVariables[this.fixPathVariableName(path)] = pathLevelServers[0];
          delete currentPathObject.servers;
        }

        // add methods to node
        // eslint-disable-next-line no-loop-func
        _.each(pathMethods, (method) => {
          // base operationItem
          operationItem = currentPathObject[method] || {};
          // params - these contain path/header/body params
          operationItem.parameters = this.getRequestParams(operationItem.parameters, commonParams,
            specComponentsAndUtils, options);
          summary = operationItem.summary || operationItem.description;
          _.isFunction(currentNode.addMethod) && currentNode.addMethod({
            name: summary,
            method: method,
            path: path,
            properties: operationItem,
            type: 'item',
            servers: pathLevelServers || undefined
          });
          currentNode.childCount += 1;
        });
        pathLevelServers = undefined;
        commonParams = [];
      }
    }

    return {
      tree: trie,
      variables: collectionVariables // server variables that are to be converted into collection variables.
    };
  },

  addCollectionItemsFromWebhooks: function(spec, generatedStore, components, options, schemaCache) {
    let webhooksObj = this.generateTrieFromPaths(spec, options, true),
      webhooksTree = webhooksObj.tree,
      webhooksFolder = new ItemGroup({ name: 'Webhooks' }),
      variableStore = {},
      webhooksVariables = [];

    if (_.keys(webhooksTree.root.children).length === 0) {
      return;
    }

    for (let child in webhooksTree.root.children) {
      if (
        webhooksTree.root.children.hasOwnProperty(child) &&
        webhooksTree.root.children[child].requestCount > 0
      ) {
        webhooksVariables.push(new Variable({
          key: this.cleanWebhookName(child),
          value: '/',
          type: 'string'
        }));
        webhooksFolder.items.add(
          this.convertChildToItemGroup(
            spec,
            webhooksTree.root.children[child],
            components,
            options,
            schemaCache,
            variableStore,
            true
          ),
        );
      }
    }
    generatedStore.collection.items.add(webhooksFolder);
    webhooksVariables.forEach((variable) => {
      generatedStore.collection.variables.add(variable);
    });
  },

  /**
   * Adds Postman Collection Items using paths.
   * Folders are grouped based on trie that's generated using all paths.
   *
   * @param {object} spec - openAPI spec object
   * @param {object} generatedStore - the store that holds the generated collection. Modified in-place
   * @param {object} components - components defined in the OAS spec. These are used to
   *  resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {void} - generatedStore is modified in-place
   */
  addCollectionItemsUsingPaths: function (spec, generatedStore, components, options, schemaCache) {
    var folderTree,
      folderObj,
      child,
      key,
      variableStore = {};

    /**
      We need a trie because the decision of whether or not a node
      is a folder or request can only be made once the whole trie is generated
      This has a .trie and a .variables prop
    */
    folderObj = this.generateTrieFromPaths(spec, options);
    folderTree = folderObj.tree;

    /*
      * these are variables identified at the collection level
      * they need to be added explicitly to collection variables
      * deeper down in the trie, variables will be added directly to folders
      * If the folderObj.variables have their own variables, we add
      * them to the collectionVars
    */
    if (folderObj.variables) {
      _.forOwn(folderObj.variables, (server, key) => {
        // TODO: Figure out what this does
        this.convertToPmCollectionVariables(
          server.variables, // these are path variables in the server block
          key, // the name of the variable
          this.fixPathVariablesInUrl(server.url)
        ).forEach((element) => {
          generatedStore.collection.variables.add(element);
        });
      });
    }

    // Adds items from the trie into the collection that's in the store
    for (child in folderTree.root.children) {
      // A Postman request or folder is added if atleast one request is present in that sub-child's tree
      // requestCount is a property added to each node (folder/request) while constructing the trie
      if (folderTree.root.children.hasOwnProperty(child) && folderTree.root.children[child].requestCount > 0) {
        generatedStore.collection.items.add(
          this.convertChildToItemGroup(spec, folderTree.root.children[child],
            components, options, schemaCache, variableStore)
        );
      }
    }
    for (key in variableStore) {
      // variableStore contains all the kinds of variable created.
      // Add only the variables with type 'collection' to generatedStore.collection.variables
      if (variableStore[key].type === 'collection') {
        const collectionVar = new Variable(variableStore[key]);
        generatedStore.collection.variables.add(collectionVar);
      }
    }
  },

  /**
   * Adds Postman Collection Items using tags.
   * Each tag from OpenAPI tags object is mapped to a collection item-group (Folder), and all operation that has
   * corresponding tag in operation object's tags array is included in mapped item-group.
   *
   * @param {object} spec - openAPI spec object
   * @param {object} generatedStore - the store that holds the generated collection. Modified in-place
   * @param {object} components - components defined in the OAS spec. These are used to
   *  resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {object} returns an object containing objects of tags and their requests
   */
  addCollectionItemsUsingTags: function(spec, generatedStore, components, options, schemaCache) {
    var globalTags = spec.tags || [],
      paths = spec.paths || {},
      pathMethods,
      variableStore = {},
      tagFolders = {};

    // adding globalTags in the tagFolder object that are defined at the root level
    _.forEach(globalTags, (globalTag) => {
      tagFolders[globalTag.name] = {
        description: _.get(globalTag, 'description', ''),
        requests: []
      };
    });

    _.forEach(paths, (currentPathObject, path) => {
      var commonParams = [],
        collectionVariables,
        pathLevelServers = '';

      // discard the leading slash, if it exists
      if (path[0] === '/') {
        path = path.substring(1);
      }

      // extracting common parameters for all the methods in the current path item
      if (currentPathObject.hasOwnProperty('parameters')) {
        commonParams = currentPathObject.parameters;
      }

      // storing common path/collection vars from the server object at the path item level
      if (currentPathObject.hasOwnProperty('servers')) {
        pathLevelServers = currentPathObject.servers;

        // add path level server object's URL as collection variable
        collectionVariables = this.convertToPmCollectionVariables(
          pathLevelServers[0].variables, // these are path variables in the server block
          this.fixPathVariableName(path), // the name of the variable
          this.fixPathVariablesInUrl(pathLevelServers[0].url)
        );

        _.forEach(collectionVariables, (collectionVariable) => {
          generatedStore.collection.variables.add(collectionVariable);
        });
        delete currentPathObject.servers;
      }

      // get available method names for this path (path item object can have keys apart from operations)
      pathMethods = _.filter(_.keys(currentPathObject), (key) => {
        return _.includes(METHODS, key);
      });

      _.forEach(pathMethods, (pathMethod) => {
        var summary,
          operationItem = currentPathObject[pathMethod] || {},
          localTags = operationItem.tags;

        // params - these contain path/header/body params
        operationItem.parameters = this.getRequestParams(operationItem.parameters, commonParams,
          components, options);

        summary = operationItem.summary || operationItem.description;

        // add the request which has not any tags
        if (_.isEmpty(localTags)) {
          let tempRequest = {
            name: summary,
            method: pathMethod,
            path: path,
            properties: operationItem,
            type: 'item',
            servers: pathLevelServers || undefined
          };
          if (shouldAddDeprecatedOperation(tempRequest.properties, options)) {
            generatedStore.collection.items.add(this.convertRequestToItem(
              spec, tempRequest, components, options, schemaCache, variableStore));
          }
        }
        else {
          _.forEach(localTags, (localTag) => {
            // add undefined tag object with empty description
            if (!_.has(tagFolders, localTag)) {
              tagFolders[localTag] = {
                description: '',
                requests: []
              };
            }

            tagFolders[localTag].requests.push({
              name: summary,
              method: pathMethod,
              path: path,
              properties: operationItem,
              type: 'item',
              servers: pathLevelServers || undefined
            });
          });
        }
      });
    });

    // Add all folders created from tags and corresponding operations
    // Iterate from bottom to top order to maintain tag order in spec
    _.forEachRight(tagFolders, (tagFolder, tagName) => {
      var itemGroup = new ItemGroup({
        name: tagName,
        description: tagFolder.description
      });

      _.forEach(tagFolder.requests, (request) => {
        if (shouldAddDeprecatedOperation(request.properties, options)) {
          itemGroup.items.add(
            this.convertRequestToItem(spec, request, components, options, schemaCache, variableStore));
        }
      });

      // Add folders first (before requests) in generated collection
      generatedStore.collection.items.prepend(itemGroup);
    });

    // variableStore contains all the kinds of variable created.
    // Add only the variables with type 'collection' to generatedStore.collection.variables
    _.forEach(variableStore, (variable) => {
      if (variable.type === 'collection') {
        const collectionVar = new Variable(variable);
        generatedStore.collection.variables.add(collectionVar);
      }
    });
  },

  /**
   * Generates an array of SDK Variables from the common and provided path vars
   * @param {string} type - Level at the tree root/path level. Can be method/root/param.
   * method: request(operation)-level, root: spec-level,  param: url-level
   * @param {Array<object>} providedPathVars - Array of path variables
   * @param {object|array} commonPathVars - Object of path variables taken from the specification
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {Array<object>} returns an array of Collection SDK Variable
   */
  convertPathVariables: function(type, providedPathVars, commonPathVars, components, options, schemaCache) {
    var variables = [];
    // converting the base uri path variables, if any
    // commonPathVars is an object for type = root/method
    // array otherwise
    if (type === 'root' || type === 'method') {
      _.forOwn(commonPathVars, (value, key) => {
        let description = this.getParameterDescription(value);
        variables.push({
          key: key,
          value: type === 'root' ? '{{' + key + '}}' : value.default,
          description: description
        });
      });
    }
    else {
      _.forEach(commonPathVars, (variable) => {
        let fakedData,
          convertedPathVar;

        this.assignParameterExamples(variable);

        fakedData = options.schemaFaker ?
          safeSchemaFaker(variable.schema || {}, options.requestParametersResolution, PROCESSING_TYPE.CONVERSION,
            PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options) : '';

        convertedPathVar = this.convertParamsWithStyle(variable, fakedData, PARAMETER_SOURCE.REQUEST,
          components, schemaCache, options);

        variables = _.concat(variables, convertedPathVar);
      });
    }

    // keep already provided varables (server variables) at last
    return _.concat(variables, providedPathVars);
  },

  /**
   * convert childItem from OpenAPI to Postman itemGroup if requestCount(no of requests inside childitem)>1
   * otherwise return postman request
   * @param {*} openapi object with root-level data like pathVariables baseurl
   * @param {*} child object is of type itemGroup or request
   * resolve references while generating params.
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @param {object} variableStore - array for storing collection variables
   * @param {boolean} fromWebhooks - true if we are processing the webhooks group, false by default
   * @returns {*} Postman itemGroup or request
   * @no-unit-test
   */
  convertChildToItemGroup: function (openapi, child, components, options,
    schemaCache, variableStore, fromWebhooks = false) {

    var resource = child,
      itemGroup,
      subChild,
      i,
      requestCount;

    // 3 options:

    // 1. folder with more than one request in its subtree
    // (immediate children or otherwise)
    if (resource.requestCount > 1) {
      // only return a Postman folder if this folder has>1 children in its subtree
      // otherwise we can end up with 10 levels of folders with 1 request in the end
      itemGroup = new ItemGroup({
        name: resource.name
        // TODO: have to add auth here (but first, auth to be put into the openapi tree)
      });
      // If a folder has only one child which is a folder then we collapsed the child folder
      // with parent folder.
      /* eslint-disable max-depth */
      if (resource.childCount === 1 && options.collapseFolders) {
        let subChild = _.keys(resource.children)[0],
          resourceSubChild = resource.children[subChild];

        resourceSubChild.name = resource.name + '/' + resourceSubChild.name;
        return this.convertChildToItemGroup(openapi, resourceSubChild, components, options,
          schemaCache, variableStore, fromWebhooks);
      }
      /* eslint-enable */
      // recurse over child leaf nodes
      // and add as children to this folder
      for (i = 0, requestCount = resource.requests.length; i < requestCount; i++) {

        if (shouldAddDeprecatedOperation(resource.requests[i].properties, options)) {
          itemGroup.items.add(
            this.convertRequestToItem(openapi, resource.requests[i], components, options,
              schemaCache, variableStore, fromWebhooks)
          );
        }
      }

      // recurse over child folders
      // and add as child folders to this folder
      /* eslint-disable max-depth*/
      for (subChild in resource.children) {
        if (resource.children.hasOwnProperty(subChild) && resource.children[subChild].requestCount > 0) {
          itemGroup.items.add(
            this.convertChildToItemGroup(openapi, resource.children[subChild], components, options, schemaCache,
              variableStore, fromWebhooks)
          );
        }
      }
      /* eslint-enable */

      return itemGroup;
    }

    // 2. it has only 1 direct request of its own
    if (resource.requests.length === 1) {
      if (shouldAddDeprecatedOperation(resource.requests[0].properties, options)) {
        return this.convertRequestToItem(openapi, resource.requests[0], components, options,
          schemaCache, variableStore, fromWebhooks);
      }
    }

    // 3. it's a folder that has no child request
    // but one request somewhere in its child folders
    for (subChild in resource.children) {
      if (resource.children.hasOwnProperty(subChild) && resource.children[subChild].requestCount === 1) {
        return this.convertChildToItemGroup(openapi, resource.children[subChild], components, options, schemaCache,
          variableStore, fromWebhooks);
      }
    }
  },

  /**
   * Gets helper object based on the root spec and the operation.security object
   * @param {*} openapi - the json object representing the OAS spec
   * @param {Array<object>} securitySet - the security object at an operation level
   * @returns {object} The authHelper to use while constructing the Postman Request. This is
   * not directly supported in the SDK - the caller needs to determine the header/body based on the return
   * value
   * @no-unit-test
   */
  getAuthHelper: function(openapi, securitySet) {
    var securityDef,
      helper;

    // return false if security set is not defined
    // or is an empty array
    // this will set the request's auth to null - which is 'inherit from parent'
    if (!securitySet || (Array.isArray(securitySet) && securitySet.length === 0)) {
      return null;
    }

    _.forEach(securitySet, (security) => {
      if (_.isObject(security) && _.isEmpty(security)) {
        helper = {
          type: 'noauth'
        };
        return false;
      }
      securityDef = _.get(openapi, ['securityDefs', _.keys(security)[0]]);
      if (!_.isObject(securityDef)) {
        return;
      }
      else if (securityDef.type === 'http') {
        if (_.toLower(securityDef.scheme) === 'basic') {
          helper = {
            type: 'basic',
            basic: [
              { key: 'username', value: '{{basicAuthUsername}}' },
              { key: 'password', value: '{{basicAuthPassword}}' }
            ]
          };
        }
        else if (_.toLower(securityDef.scheme) === 'bearer') {
          helper = {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{bearerToken}}' }]
          };
        }
        else if (_.toLower(securityDef.scheme) === 'digest') {
          helper = {
            type: 'digest',
            digest: [
              { key: 'username', value: '{{digestAuthUsername}}' },
              { key: 'password', value: '{{digestAuthPassword}}' },
              { key: 'realm', value: '{{realm}}' }
            ]
          };
        }
        else if (_.toLower(securityDef.scheme) === 'oauth' || _.toLower(securityDef.scheme) === 'oauth1') {
          helper = {
            type: 'oauth1',
            oauth1: [
              { key: 'consumerSecret', value: '{{consumerSecret}}' },
              { key: 'consumerKey', value: '{{consumerKey}}' },
              { key: 'addParamsToHeader', value: true }
            ]
          };
        }
      }
      else if (securityDef.type === 'oauth2') {
        let flowObj, currentFlowType;

        helper = {
          type: 'oauth2',
          oauth2: []
        };

        if (_.isObject(securityDef.flows) && FLOW_TYPE[_.keys(securityDef.flows)[0]]) {
          /*

          //===================[]========================\\
          ||  OAuth2 Flow Name || Key name in collection ||
          |]===================[]========================[|
          || clientCredentials || client_credentials     ||
          || password          || password_credentials   ||
          || implicit          || implicit               ||
          || authorizationCode || authorization_code     ||
          \\===================[]========================//
          Ref : https://swagger.io/docs/specification/authentication/oauth2/

          In case of multiple flow types, the first one will be preferred
          and passed on to the collection.

          Other flow types in collection which are not explicitly present in OA 3
          • "authorization_code_with_pkce"

          */
          currentFlowType = FLOW_TYPE[_.keys(securityDef.flows)[0]];
          flowObj = _.get(securityDef, `flows.${_.keys(securityDef.flows)[0]}`);
        }

        if (currentFlowType) { // Means the flow is of supported type

          // Fields supported by all flows -> refreshUrl, scopes
          if (!_.isEmpty(flowObj.scopes)) {
            helper.oauth2.push({
              key: 'scope',
              value: _.keys(flowObj.scopes).join(' ')
            });
          }

          /* refreshURL is indicated by key 'redirect_uri' in collection
          Ref : https://stackoverflow.com/a/42131366/19078409 */
          if (!_.isEmpty(flowObj.refreshUrl)) {
            helper.oauth2.push({
              key: 'redirect_uri',
              value: _.isString(flowObj.refreshUrl) ? flowObj.refreshUrl : '{{oAuth2CallbackURL}}'
            });
          }

          // Fields supported by all flows except implicit -> tokenUrl
          if (currentFlowType !== FLOW_TYPE.implicit) {
            if (!_.isEmpty(flowObj.tokenUrl)) {
              helper.oauth2.push({
                key: 'accessTokenUrl',
                value: _.isString(flowObj.tokenUrl) ? flowObj.tokenUrl : '{{oAuth2AccessTokenURL}}'
              });
            }
          }

          // Fields supported by all flows all except password, clientCredentials -> authorizationUrl
          if (currentFlowType !== FLOW_TYPE.password && currentFlowType !== FLOW_TYPE.clientCredentials) {
            if (!_.isEmpty(flowObj.authorizationUrl)) {
              helper.oauth2.push({
                key: 'authUrl',
                value: _.isString(flowObj.authorizationUrl) ? flowObj.authorizationUrl : '{{oAuth2AuthURL}}'
              });
            }
          }

          helper.oauth2.push({
            key: 'grant_type',
            value: currentFlowType
          });
        }
      }
      else if (securityDef.type === 'apiKey') {
        helper = {
          type: 'apikey',
          apikey: [
            {
              key: 'key',
              value: _.isString(securityDef.name) ? securityDef.name : '{{apiKeyName}}'
            },
            { key: 'value', value: '{{apiKey}}' },
            {
              key: 'in',
              value: _.includes(['query', 'header'], securityDef.in) ? securityDef.in : 'header'
            }
          ]
        };
      }

      // stop searching for helper if valid auth scheme is found
      if (!_.isEmpty(helper)) {
        return false;
      }
    });
    return helper;
  },

  /**
   * Generates appropriate collection element based on parameter location
   *
   * @param {Object} param - Parameter object habing key, value and description (optional)
   * @param {String} location - Parameter location ("in" property of OAS defined parameter object)
   * @returns {Object} - SDK element
   */
  generateSdkParam: function (param, location) {
    const sdkElementMap = {
      'query': QueryParam,
      'header': Header,
      'path': Variable
    };

    let generatedParam = {
      key: param.key,
      value: param.value
    };

    _.has(param, 'disabled') && (generatedParam.disabled = param.disabled);

    // use appropriate sdk element based on location parmaeter is in for param generation
    if (sdkElementMap[location]) {
      generatedParam = new sdkElementMap[location](generatedParam);
    }
    param.description && (generatedParam.description = param.description);
    return generatedParam;
  },

  /**
   * Generates Auth helper for response, params (query, headers) in helper object is added in
   * request (originalRequest) part of example.
   *
   * @param {*} requestAuthHelper - Auth helper object of corresponding request
   * @returns {Object} - Response Auth helper object containing params to be added
   */
  getResponseAuthHelper: function (requestAuthHelper) {
    var responseAuthHelper = {
        query: [],
        header: []
      },
      getValueFromHelper = function (authParams, keyName) {
        return _.find(authParams, { key: keyName }).value;
      },
      paramLocation,
      description;

    if (!_.isObject(requestAuthHelper)) {
      return responseAuthHelper;
    }
    description = 'Added as a part of security scheme: ' + requestAuthHelper.type;

    switch (requestAuthHelper.type) {
      case 'apikey':
        // find location of parameter from auth helper
        paramLocation = getValueFromHelper(requestAuthHelper.apikey, 'in');
        responseAuthHelper[paramLocation].push({
          key: getValueFromHelper(requestAuthHelper.apikey, 'key'),
          value: '<API Key>',
          description
        });
        break;
      case 'basic':
        responseAuthHelper.header.push({
          key: 'Authorization',
          value: 'Basic <credentials>',
          description
        });
        break;
      case 'bearer':
        responseAuthHelper.header.push({
          key: 'Authorization',
          value: 'Bearer <token>',
          description
        });
        break;
      case 'digest':
        responseAuthHelper.header.push({
          key: 'Authorization',
          value: 'Digest <credentials>',
          description
        });
        break;
      case 'oauth1':
        responseAuthHelper.header.push({
          key: 'Authorization',
          value: 'OAuth <credentials>',
          description
        });
        break;
      case 'oauth2':
        responseAuthHelper.header.push({
          key: 'Authorization',
          value: '<token>',
          description
        });
        break;
      default:
        break;
    }
    return responseAuthHelper;
  },

  /**
   * Converts a 'content' object into Postman response body. Any content-type header determined
   * from the body is returned as well
   * @param {*} contentObj response content - this is the content property of the response body
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
  * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @return {object} responseBody, contentType header needed
   */
  convertToPmResponseBody: function(contentObj, components, options, schemaCache) {
    var responseBody, cTypeHeader, hasComputedType, cTypes, headerFamily,
      isJsonLike = false;
    if (!contentObj) {
      return {
        contentTypeHeader: null,
        responseBody: ''
      };
    }
    let headers = _.keys(contentObj);

    for (let i = 0; i < headers.length; i++) {
      let headerFamily = this.getHeaderFamily(headers[i]);
      if (headerFamily !== HEADER_TYPE.INVALID) {
        cTypeHeader = headers[i];
        hasComputedType = true;
        if (headerFamily === HEADER_TYPE.JSON) {
          break;
        }
      }
    }

    // if no JSON or XML, take whatever we have
    if (!hasComputedType) {
      cTypes = _.keys(contentObj);
      if (cTypes.length > 0) {
        cTypeHeader = cTypes[0];
        hasComputedType = true;
      }
      else {
        // just an empty object - can't convert anything
        return {
          contentTypeHeader: null,
          responseBody: ''
        };
      }
    }

    headerFamily = this.getHeaderFamily(cTypeHeader);
    responseBody = this.convertToPmBodyData(contentObj[cTypeHeader], REQUEST_TYPE.EXAMPLE, cTypeHeader,
      PARAMETER_SOURCE.RESPONSE, options.indentCharacter, components, options, schemaCache);

    if (headerFamily === HEADER_TYPE.JSON) {
      responseBody = JSON.stringify(responseBody, null, options.indentCharacter);
    }
    else if (cTypeHeader === TEXT_XML || cTypeHeader === APP_XML || headerFamily === HEADER_TYPE.XML) {
      responseBody = getXmlVersionContent(responseBody);
    }
    else if (typeof responseBody !== 'string') {
      if (cTypeHeader === MEDIA_TYPE_ALL_RANGES) {
        if (!_.isObject(responseBody) && _.isFunction(_.get(responseBody, 'toString'))) {
          responseBody = responseBody.toString();
        }
        else {
          responseBody = JSON.stringify(responseBody, null, options.indentCharacter);
          isJsonLike = true;
        }
      }
      else {
        responseBody = '';
      }
    }

    return {
      contentTypeHeader: cTypeHeader,
      responseBody: responseBody,
      isJsonLike
    };
  },

  /**
   * Create parameters specific for a request
   * @param {*} localParams parameters array
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {Object} with three arrays of query, header and path as keys.
   * @no-unit-test
   */
  getParametersForPathItem: function(localParams, options) {
    let tempParam,
      params = {
        query: [],
        header: [],
        path: []
      },
      includeDeprecated = options.includeDeprecated !== false;

    _.forEach(localParams, (param) => {
      if (!_.isObject(param)) {
        return;
      }

      tempParam = param;
      let verifyAddDeprecated = (includeDeprecated ||
        includeDeprecated === false && tempParam.deprecated !== true);
      if (verifyAddDeprecated) {
        if (tempParam.in === 'query') {
          params.query.push(tempParam);
        }
        else if (tempParam.in === 'header') {
          params.header.push(tempParam);
        }
        else if (tempParam.in === 'path') {
          params.path.push(tempParam);
        }
      }
    });

    return params;
  },

  /**
   * returns first example in the input map
   * @param {*} exampleObj map[string, exampleObject]
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {*} first example in the input map type
   */
  getExampleData: function(exampleObj, components, options) {
    var example,
      exampleKey;

    if (!exampleObj || typeof exampleObj !== 'object') {
      return '';
    }

    exampleKey = _.keys(exampleObj)[0];
    example = exampleObj[exampleKey];
    // return example value if present else example is returned

    if (_.has(example, '$ref')) {
      example = this.getRefObject(example.$ref, components, options);
    }

    if (_.has(example, 'value')) {
      example = example.value;
    }

    return example;
  },

  /**
   * converts one of the eamples or schema in Media Type object to postman data
   * @param {*} bodyObj is MediaTypeObject
   * @param {*} requestType - Specifies whether the request body is of example request or root request
   * @param {*} contentType - content type header
   * @param {string} parameterSourceOption tells that the schema object is of request or response
   * @param {string} indentCharacter is needed for XML/JSON bodies only
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
  * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {*} postman body data
   */
  // TODO: We also need to accept the content type
  // and generate the body accordingly
  // right now, even if the content-type was XML, we'll generate
  // a JSON example/schema
  convertToPmBodyData: function(bodyObj, requestType, contentType, parameterSourceOption,
    indentCharacter, components, options, schemaCache) {

    var bodyData = '',
      schemaFormat = SCHEMA_FORMATS.DEFAULT,
      schemaType,
      resolveTo = this.resolveToExampleOrSchema(requestType, options.requestParametersResolution,
        options.exampleParametersResolution);
    let concreteUtils = components && components.hasOwnProperty('concreteUtils') ?
        components.concreteUtils :
        DEFAULT_SCHEMA_UTILS,
      headerFamily = this.getHeaderFamily(contentType);

    if (_.isEmpty(bodyObj)) {
      return bodyData;
    }

    if (bodyObj.example && (resolveTo === 'example' || !bodyObj.schema)) {
      if (bodyObj.example.hasOwnProperty('$ref')) {
        bodyObj.example = this.getRefObject(bodyObj.example.$ref, components, options);
        if (headerFamily === HEADER_TYPE.JSON) {
          // try to parse the example as JSON. OK if this fails

          // eslint-disable-next-line max-depth
          try {
            bodyObj.example = JSON.parse(bodyObj.example);
          }
          // eslint-disable-next-line no-empty
          catch (e) {}
        }
      }
      bodyData = bodyObj.example;

      // Convert example into XML if present as JSON data
      if (contentType === TEXT_XML || contentType === APP_XML || headerFamily === HEADER_TYPE.XML) {
        let bodySchemaWithExample = bodyObj.schema;

        // Assign example at schema level to be faked by xmlSchemaFaker
        if (typeof bodyObj.schema === 'object') {
          bodySchemaWithExample = Object.assign({}, bodyObj.schema, { example: bodyData });
        }
        bodyData = xmlFaker(null, bodySchemaWithExample, indentCharacter, resolveTo);
      }
    }
    else if (!_.isEmpty(bodyObj.examples) && (resolveTo === 'example' || !bodyObj.schema)) {
      // take one of the examples as the body and not all
      bodyData = this.getExampleData(bodyObj.examples, components, options);

      if (contentType === TEXT_XML || contentType === APP_XML || headerFamily === HEADER_TYPE.XML) {
        let bodySchemaWithExample = bodyObj.schema;

        // Assign example at schema level to be faked by xmlSchemaFaker
        if (typeof bodyObj.schema === 'object') {
          bodySchemaWithExample = Object.assign({}, bodyObj.schema, { example: bodyData });
        }
        bodyData = xmlFaker(null, bodySchemaWithExample, indentCharacter, resolveTo);
      }
    }
    else if (bodyObj.schema) {
      if (bodyObj.schema.hasOwnProperty('$ref')) {
        let outerProps = concreteUtils.getOuterPropsIfIsSupported(bodyObj.schema),
          resolvedSchema;

        // skip beforehand resolution for OAS 3.0
        if (outerProps) {
          resolvedSchema = this.getRefObject(bodyObj.schema.$ref, components, options);
          bodyObj.schema = concreteUtils.addOuterPropsToRefSchemaIfIsSupported(resolvedSchema, outerProps);
        }
        else {
          bodyObj.schema = this.getRefObject(bodyObj.schema.$ref, components, options);
        }
      }
      if (options.schemaFaker) {
        if (this.getHeaderFamily(contentType) === HEADER_TYPE.XML) {
          schemaFormat = SCHEMA_FORMATS.XML;
        }
        // Do not fake schemas if the complexity score is 10
        if (options.complexityScore === 10) {
          schemaType = _.get(this.getRefObject(bodyObj.schema.$ref, components, options), 'type');
          if (schemaType === 'object') {
            return {
              value: '<Error: Spec size too large, skipping faking of schemas>'
            };
          }
          if (schemaType === 'array') {
            return [
              '<Error: Spec size too large, skipping faking of schemas>'
            ];
          }
          return '<Error: Spec size too large, skipping faking of schemas>';
        }

        bodyData = safeSchemaFaker(bodyObj.schema || {}, resolveTo, PROCESSING_TYPE.CONVERSION, parameterSourceOption,
          components, schemaFormat, schemaCache, options);
      }
      else {
        // do not fake if the option is false
        bodyData = '';
      }
    }
    return bodyData;
  },

  /**
   * returns whether to resolve to example or schema
   * @param {string} requestType - Specifies whether the request body is of example request or root request
   * @param {string} requestParametersResolution - the option value of requestParametersResolution
   * @param {string} exampleParametersResolution - the option value of exampleParametersResolution
   * @returns {string} Whether to resolve to example or schema
   */
  resolveToExampleOrSchema(requestType, requestParametersResolution, exampleParametersResolution) {
    if (requestType === REQUEST_TYPE.ROOT) {
      if (requestParametersResolution === 'example') {
        return 'example';
      }
      else if (requestParametersResolution === 'schema') {
        return 'schema';
      }
    }

    if (requestType === REQUEST_TYPE.EXAMPLE) {
      if (exampleParametersResolution === 'example') {
        return 'example';
      }
      else if (exampleParametersResolution === 'schema') {
        return 'schema';
      }
    }

    return 'schema';
  },

  /**
   * convert param with in='query' to string considering style and type
   * @param {*} param with in='query'
   * @param {*} requestType Specifies whether the request body is of example request or root request
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
  * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {array} converted queryparam
   */
  convertToPmQueryParameters: function(param, requestType, components, options, schemaCache) {
    var pmParams = [],
      paramValue,
      resolveTo = this.resolveToExampleOrSchema(requestType, options.requestParametersResolution,
        options.exampleParametersResolution);

    if (!param) {
      return [];
    }
    // check for existence of schema
    if (param.hasOwnProperty('schema')) {
      this.assignParameterExamples(param);

      // fake data generated
      paramValue = options.schemaFaker ?
        safeSchemaFaker(param.schema, resolveTo, PROCESSING_TYPE.CONVERSION, PARAMETER_SOURCE.REQUEST,
          components, SCHEMA_FORMATS.DEFAULT, schemaCache, options) : '';

      if (typeof paramValue === 'number' || typeof paramValue === 'boolean') {
        // the SDK will keep the number-ness,
        // which will be rejected by the collection v2 schema
        // converting to string to prevent issues like
        // https://github.com/postmanlabs/postman-app-support/issues/6500
        paramValue = paramValue.toString();
      }
      return this.convertParamsWithStyle(param, paramValue, PARAMETER_SOURCE.REQUEST, components, schemaCache, options);
    }

    let description = this.getParameterDescription(param);
    // since no schema present add the parameter with no value
    pmParams.push({
      key: param.name,
      value: '',
      description: description
    });


    return pmParams;
  },

  /**
   * Recursively extracts key-value pair from deep objects.
   *
   * @param {*} deepObject - Deep object
   * @param {*} objectKey - key associated with deep object
   * @returns {Array} array of param key-value pairs
   */
  extractDeepObjectParams: function (deepObject, objectKey) {
    let extractedParams = [];

    _.keys(deepObject).forEach((key) => {
      let value = deepObject[key];
      if (value && typeof value === 'object') {
        extractedParams = _.concat(extractedParams, this.extractDeepObjectParams(value, objectKey + '[' + key + ']'));
      }
      else {
        extractedParams.push({ key: objectKey + '[' + key + ']', value });
      }
    });
    return extractedParams;
  },

  /**
   * Returns an array of parameters
   * Handles array/object/string param types
   * @param {*} param - the param object, as defined in
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject
   * @param {any} paramValue - the value to use (from schema or example) for the given param.
   * This will be exploded/parsed according to the param type
   * @param  {*} parameterSource — Specifies whether the schema being faked is from a request or response.
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {array} parameters. One param with type=array might lead to multiple params
   * in the return value
   * The styles are documented at
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#style-values
   */
  convertParamsWithStyle: function(param, paramValue, parameterSource, components, schemaCache, options) {
    var paramName = _.get(param, 'name'),
      pmParams = [],
      serialisedValue = '',
      description = this.getParameterDescription(param),
      disabled = false;

    // for invalid param object return null
    if (!_.isObject(param)) {
      return null;
    }

    let { style, explode, startValue, propSeparator, keyValueSeparator, isExplodable } =
      this.getParamSerialisationInfo(param, parameterSource, components);

    if (options && !options.enableOptionalParameters) {
      disabled = !param.required;
    }

    // decide explodable params, starting value and separators between key-value and properties for serialisation
    switch (style) {
      case 'form':
        if (explode && _.isObject(paramValue)) {
          _.forEach(paramValue, (value, key) => {
            pmParams.push(this.generateSdkParam({
              key: _.isArray(paramValue) ? paramName : key,
              value: (value === undefined ? '' : value),
              description,
              disabled
            }, _.get(param, 'in')));
          });
          return pmParams;
        }

        // handle free-form parameter correctly
        if (explode && (_.get(param, 'schema.type') === 'object') && _.isEmpty(_.get(param, 'schema.properties'))) {
          return pmParams;
        }
        break;
      case 'deepObject':
        if (_.isObject(paramValue)) {
          let extractedParams = this.extractDeepObjectParams(paramValue, paramName);

          _.forEach(extractedParams, (extractedParam) => {
            pmParams.push(this.generateSdkParam({
              key: extractedParam.key,
              value: extractedParam.value || '',
              description,
              disabled
            }, _.get(param, 'in')));
          });
        }
        return pmParams;
      default:
        break;
    }

    // for array and object, serialize value
    if (_.isObject(paramValue)) {
      _.forEach(paramValue, (value, key) => {
        // add property separator for all index/keys except first
        !_.isEmpty(serialisedValue) && (serialisedValue += propSeparator);

        // append key for param that can be exploded
        isExplodable && (serialisedValue += (key + keyValueSeparator));
        serialisedValue += (value === undefined ? '' : value);
      });
    }
    // for non-object and non-empty value append value as is to string
    else if (!_.isNil(paramValue)) {
      serialisedValue += paramValue;
    }

    // prepend starting value to serialised value (valid for empty value also)
    serialisedValue = startValue + serialisedValue;
    pmParams.push(this.generateSdkParam({
      key: paramName,
      value: serialisedValue,
      description,
      disabled
    }, _.get(param, 'in')));

    return pmParams;
  },

  /**
   * converts params with in='header' to a Postman header object
   * @param {*} header param with in='header'
   * @param {*} requestType Specifies whether the request body is of example request or root request
   * @param  {*} parameterSource — Specifies whether the schema being faked is from a request or response.
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
  * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {Object} instance of a Postman SDK Header
   */
  convertToPmHeader: function(header, requestType, parameterSource, components, options, schemaCache) {
    var fakeData,
      convertedHeader,
      reqHeader,
      resolveTo = this.resolveToExampleOrSchema(requestType, options.requestParametersResolution,
        options.exampleParametersResolution);

    if (header.hasOwnProperty('schema')) {
      if (!options.schemaFaker) {
        fakeData = '';
      }
      else {
        this.assignParameterExamples(header);

        fakeData = safeSchemaFaker(header.schema || {}, resolveTo, PROCESSING_TYPE.CONVERSION, parameterSource,
          components, SCHEMA_FORMATS.DEFAULT, schemaCache, options);
      }
    }
    else {
      fakeData = '';
    }

    convertedHeader = _.get(this.convertParamsWithStyle(header, fakeData, parameterSource,
      components, schemaCache, options), '[0]');

    reqHeader = new Header(convertedHeader);
    reqHeader.description = this.getParameterDescription(header);

    return reqHeader;
  },

  /**
   * converts operation item requestBody to a Postman request body
   * @param {*} requestBody in operationItem
   * @param {*} requestType - Specifies whether the request body is of example request or root request
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
  * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {Object} - Postman requestBody and Content-Type Header
   */
  convertToPmBody: function(requestBody, requestType, components, options, schemaCache) {
    var contentObj, // content is required
      bodyData,
      param,
      originalParam,
      paramArray = [],
      updateOptions = {},
      reqBody = new RequestBody(),
      contentHeader,
      contentTypes = {},
      rDataMode,
      params,
      encoding,
      cType,
      description,
      required,
      enumValue,
      formHeaders = [];

    let concreteUtils = components && components.hasOwnProperty('concreteUtils') ?
      components.concreteUtils :
      DEFAULT_SCHEMA_UTILS;

    // @TODO: how do we support multiple content types
    contentObj = requestBody.content;

    // to handle cases of malformed request body, where contentObj is null
    if (!contentObj) {
      return {
        body: reqBody,
        contentHeader: null,
        formHeaders: null
      };
    }

    // handling for the urlencoded media type
    if (contentObj.hasOwnProperty(URLENCODED)) {
      rDataMode = 'urlencoded';
      bodyData = this.convertToPmBodyData(contentObj[URLENCODED], requestType, URLENCODED,
        PARAMETER_SOURCE.REQUEST, options.indentCharacter, components, options, schemaCache);
      encoding = contentObj[URLENCODED].encoding ? contentObj[URLENCODED].encoding : {};

      if (contentObj[URLENCODED].hasOwnProperty('schema') && contentObj[URLENCODED].schema.hasOwnProperty('$ref')) {
        contentObj[URLENCODED].schema = this.getRefObject(contentObj[URLENCODED].schema.$ref, components, options);
      }

      // create query parameters and add it to the request body object
      _.forOwn(bodyData, (value, key) => {

        if (_.get(contentObj[URLENCODED], 'schema.type') === 'object') {
          description = _.get(contentObj[URLENCODED], ['schema', 'properties', key, 'description'], '');
          required = _.includes(_.get(contentObj[URLENCODED], ['schema', 'required']), key);
          enumValue = _.get(contentObj[URLENCODED], ['schema', 'properties', key, 'enum']);
        }

        !encoding[key] && (encoding[key] = {});
        encoding[key].name = key;
        encoding[key].schema = {
          type: typeof value
        };
        // for urlencoded body serialisation is treated similar to query param
        // reference https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#fixed-fields-13
        encoding[key].in = 'query';
        _.isBoolean(required) && (encoding[key].required = required);
        encoding[key].description = description;

        params = this.convertParamsWithStyle(encoding[key], value, PARAMETER_SOURCE.REQUEST, components,
          schemaCache, options);
        // TODO: Show warning for incorrect schema if !params
        params && params.forEach((element) => {
          // Collection v2.1 schema allows urlencoded param value to be only string
          if (typeof element.value !== 'string') {
            try {
              // convert other datatype to string (i.e. number, boolean etc)
              element.value = JSON.stringify(element.value);
            }
            catch (e) {
              // JSON.stringify can fail in few cases, suggest invalid type for such case
              // eslint-disable-next-line max-len
              // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Exceptions
              element.value = 'INVALID_URLENCODED_PARAM_TYPE';
            }
          }
        });
        paramArray.push(...params);
      });
      updateOptions = {
        mode: rDataMode,
        urlencoded: paramArray
      };

      // add a content type header for each media type for the request body
      contentHeader = new Header({
        key: 'Content-Type',
        value: URLENCODED
      });

      // update the request body with the options
      reqBody.update(updateOptions);
    }
    else if (contentObj.hasOwnProperty(FORM_DATA)) {
      rDataMode = 'formdata';
      bodyData = this.convertToPmBodyData(contentObj[FORM_DATA], requestType, FORM_DATA,
        PARAMETER_SOURCE.REQUEST, options.indentCharacter, components, options, schemaCache);
      encoding = contentObj[FORM_DATA].encoding ? contentObj[FORM_DATA].encoding : {};

      if (contentObj[FORM_DATA].hasOwnProperty('schema') && contentObj[FORM_DATA].schema.hasOwnProperty('$ref')) {
        contentObj[FORM_DATA].schema = this.getRefObject(contentObj[FORM_DATA].schema.$ref, components, options);
      }
      // create the form parameters and add it to the request body object
      _.forOwn(bodyData, (value, key) => {

        if (_.get(contentObj[FORM_DATA], 'schema.type') === 'object') {
          description = _.get(contentObj[FORM_DATA], ['schema', 'properties', key, 'description'], '');
          required = _.includes(_.get(contentObj[FORM_DATA], ['schema', 'required']), key);
          enumValue = _.get(contentObj[FORM_DATA], ['schema', 'properties', key, 'enum']);
        }
        description = (required ? '(Required) ' : '') + description +
          (enumValue ? ' (This can only be one of ' + enumValue + ')' : '');

        if (encoding.hasOwnProperty(key)) {
          _.forOwn(encoding[key].headers, (value, key) => {
            if (key !== 'Content-Type') {
              if (encoding[key].headers[key].hasOwnProperty('$ref')) {
                encoding[key].headers[key] = getRefObject(encoding[key].headers[key].$ref, components, options);
              }
              encoding[key].headers[key].name = key;
              // this is only for ROOT request because we are adding the headers for example request later
              formHeaders.push(this.convertToPmHeader(encoding[key].headers[key],
                REQUEST_TYPE.ROOT, PARAMETER_SOURCE.REQUEST, components, options, schemaCache));
            }
          });

          if (typeof _.get(encoding, `[${key}].contentType`) === 'string') {
            contentTypes[key] = encoding[key].contentType;
          }
        }
        // Collection v2.1 schema allows form param value to be only string
        if (typeof value !== 'string') {
          try {
            // convert other datatype to string (i.e. number, boolean etc)
            value = JSON.stringify(value);
          }
          catch (e) {
            // JSON.stringify can fail in few cases, suggest invalid type for such case
            // eslint-disable-next-line max-len
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Exceptions
            value = 'INVALID_FORM_PARAM_TYPE';
          }
        }

        // Fetch the original param and if it is of type 'string' and format 'binary'
        // then set the type of FormParam to 'file'
        originalParam = _.get(contentObj[FORM_DATA], ['schema', 'properties', key]);

        if (originalParam &&
          originalParam.type === 'string' &&
          originalParam.format === 'binary'
        ) {
          param = new FormParam({
            key: key,
            value: '',
            type: 'file'
          });
        }
        else {
          param = new FormParam({
            key: key,
            value: value,
            type: 'text'
          });
        }
        param.description = description;
        if (contentTypes[key]) {
          param.contentType = contentTypes[key];
        }
        paramArray.push(param);
      });
      updateOptions = {
        mode: rDataMode,
        formdata: paramArray
      };
      // add a content type header for the pertaining media type
      contentHeader = new Header({
        key: 'Content-Type',
        value: FORM_DATA
      });
      // update the request body
      reqBody.update(updateOptions);
    }
    else {
      rDataMode = 'raw';
      let bodyType, language;

      // checking for all possible raw types
      if (contentObj.hasOwnProperty(APP_JS)) { bodyType = APP_JS; }
      else if (contentObj.hasOwnProperty(APP_JSON)) { bodyType = APP_JSON; }
      else if (contentObj.hasOwnProperty(TEXT_HTML)) { bodyType = TEXT_HTML; }
      else if (contentObj.hasOwnProperty(TEXT_PLAIN)) { bodyType = TEXT_PLAIN; }
      else if (contentObj.hasOwnProperty(APP_XML)) { bodyType = APP_XML; }
      else if (contentObj.hasOwnProperty(TEXT_XML)) { bodyType = TEXT_XML; }
      else {
        // take the first property it has
        // types like image/png etc
        for (cType in contentObj) {
          if (contentObj.hasOwnProperty(cType)) {
            bodyType = cType;
            break;
          }
        }
      }

      if (
        concreteUtils.isBinaryContentType(bodyType, contentObj)
      ) {
        updateOptions = {
          mode: 'file'
        };
      }
      else {
        let headerFamily;

        bodyData = this.convertToPmBodyData(contentObj[bodyType], requestType, bodyType,
          PARAMETER_SOURCE.REQUEST, options.indentCharacter, components, options, schemaCache);

        headerFamily = this.getHeaderFamily(bodyType);
        bodyData = (bodyType === TEXT_XML || bodyType === APP_XML || headerFamily === HEADER_TYPE.XML) ?
          getXmlVersionContent(bodyData) :
          bodyData;

        updateOptions = {
          mode: rDataMode,
          raw: !_.isObject(bodyData) && _.isFunction(_.get(bodyData, 'toString')) ?
            bodyData.toString() :
            JSON.stringify(bodyData, null, options.indentCharacter)
        };
      }

      language = this.getHeaderFamily(bodyType);

      if (language !== HEADER_TYPE.INVALID) {
        updateOptions.options = {
          raw: {
            language
          }
        };
      }

      contentHeader = new Header({
        key: 'Content-Type',
        value: bodyType
      });

      reqBody.update(updateOptions);
    }

    return {
      body: reqBody,
      contentHeader: contentHeader,
      formHeaders: formHeaders
    };
  },

  /**
   * @param {*} response in operationItem responses
   * @param {*} code - response Code
   * @param {*} originalRequest - the request for the example
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
  * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {Object} postman response
   */
  convertToPmResponse: function(response, code, originalRequest, components, options, schemaCache) {
    var responseHeaders = [],
      previewLanguage = 'text',
      responseBodyWrapper,
      header,
      sdkResponse,
      responseMediaTypes;

    if (!_.isObject(response)) {
      return null;
    }
    _.forOwn(response.headers, (value, key) => {
      if (!_.isObject(value)) {
        return;
      }

      if (_.toLower(key) !== 'content-type') {
        if (_.get(value, '$ref')) {
          // the convert to PmHeader function handles the
          // schema-faking
          header = this.getRefObject(value.$ref, components, options);
        }
        else {
          header = value;
        }
        header.name = key;

        if (!_.includes(IMPLICIT_HEADERS, _.toLower(key))) {
          responseHeaders.push(this.convertToPmHeader(header, REQUEST_TYPE.EXAMPLE,
            PARAMETER_SOURCE.RESPONSE, components, options, schemaCache));
        }
      }
    });

    responseBodyWrapper = this.convertToPmResponseBody(response.content, components, options, schemaCache);
    previewLanguage = this.resolveResponsePreviewLanguageAndResponseHeader(responseBodyWrapper,
      responseHeaders, response);
    // replace 'X' char with '0'
    code = code.replace(/X|x/g, '0');
    code = code === 'default' ? 500 : _.toSafeInteger(code);

    responseMediaTypes = _.keys(response.content);

    if (responseMediaTypes.length > 0) {
      let acceptHeader = new Header({
        key: 'Accept',
        value: responseMediaTypes[0]
      });

      if (_.isArray(_.get(originalRequest, 'header'))) {
        originalRequest.header.push(acceptHeader);
      }
    }

    sdkResponse = new Response({
      name: response.description,
      code: code || 500,
      header: responseHeaders,
      body: responseBodyWrapper.responseBody,
      originalRequest: originalRequest
    });
    sdkResponse._postman_previewlanguage = previewLanguage;

    return sdkResponse;
  },

  /**
   * Identifies the previewLanguage to use and also adds the identified content header to the responseHeaders array
   * @param {object} responseBodyWrapper generated response body and its related information
   * @param {object} responseHeaders - The existent array of response headers
   * @param {object} response in operationItem responses
   * @returns {string} previewLanguage
   */
  resolveResponsePreviewLanguageAndResponseHeader: function (responseBodyWrapper,
    responseHeaders, response) {
    let previewLanguage = 'text';
    if (responseBodyWrapper.contentTypeHeader) {
      // we could infer the content-type header from the body
      responseHeaders.push({ key: 'Content-Type', value: responseBodyWrapper.contentTypeHeader });
      if (this.getHeaderFamily(responseBodyWrapper.contentTypeHeader) === HEADER_TYPE.JSON) {
        previewLanguage = PREVIEW_LANGUAGE.JSON;
      }
      else if (this.getHeaderFamily(responseBodyWrapper.contentTypeHeader) === HEADER_TYPE.XML) {
        previewLanguage = PREVIEW_LANGUAGE.XML;
      }
      else if (responseBodyWrapper.isJsonLike) {
        previewLanguage = PREVIEW_LANGUAGE.JSON;
      }
    }
    else if (response.content && _.keys(response.content).length > 0) {
      responseHeaders.push({ key: 'Content-Type', value: _.keys(response.content)[0] });
      if (this.getHeaderFamily(_.keys(response.content)[0]) === HEADER_TYPE.JSON) {
        previewLanguage = PREVIEW_LANGUAGE.JSON;
      }
      else if (this.getHeaderFamily(_.keys(response.content)[0]) === HEADER_TYPE.XML) {
        previewLanguage = PREVIEW_LANGUAGE.XML;
      }
      else if (responseBodyWrapper.isJsonLike) {
        previewLanguage = PREVIEW_LANGUAGE.JSON;
      }
    }
    else {
      responseHeaders.push({ key: 'Content-Type', value: TEXT_PLAIN });
    }
    return previewLanguage;
  },

  /**
   * @param {*} $ref reference object
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {*} seenRef - References that are repeated. Used to identify circular references.
   * @returns {Object} reference object from the saved components
   * @no-unit-tests
   */
  getRefObject: function($ref, components, options, seenRef = {}) {
    var refObj, savedSchema;

    if (typeof $ref !== 'string') {
      return { value: `Invalid $ref: ${$ref} was found` };
    }

    if (seenRef[$ref]) {
      return { value: `Error: "${$ref}" contains circular references in it.` };
    }

    savedSchema = $ref.split('/').slice(1).map((elem) => {
      // https://swagger.io/docs/specification/using-ref#escape
      // since / is the default delimiter, slashes are escaped with ~1
      return decodeURIComponent(
        elem
          .replace(/~1/g, '/')
          .replace(/~0/g, '~')
      );
    });
    // at this stage, savedSchema is [components, part1, parts]
    // must have min. 2 segments after "#/components"
    if (savedSchema.length < 3) {
      console.warn(`ref ${$ref} not found.`);
      return { value: `reference ${$ref} not found in the given specification` };
    }

    if (savedSchema[0] !== 'components' && savedSchema[0] !== 'paths') {
      console.warn(`Error reading ${$ref}. Can only use references from components and paths`);
      return { value: `Error reading ${$ref}. Can only use references from components and paths` };
    }

    // at this point, savedSchema is similar to ['components', 'schemas','Address']
    // components is actually components and paths (an object with components + paths as 1st-level-props)
    refObj = _.get(components, savedSchema);

    if (!refObj) {
      console.warn(`ref ${$ref} not found.`);
      return { value: `reference ${$ref} not found in the given specification` };
    }

    // Mark current $ref as seen while processing it further
    seenRef[$ref] = true;

    if (refObj.$ref) {
      return this.getRefObject(refObj.$ref, components, options, seenRef);
    }

    // Unmark current $ref once resolved
    seenRef[$ref] = false;

    return refObj;
  },

  /** Finds all the possible path variables in a given path string
   * @param {string} path Path string : /pets/{petId}
   * @returns {array} Array of path variables.
   */
  findPathVariablesFromPath: function (path) {

    // /{{path}}/{{file}}.{{format}}/{{hello}} return [ '{{path}}', '{{hello}}' ]
    // https://regex101.com/r/XGL4Gh/1
    return path.match(/(\/\{\{[^\/\{\}]+\}\})(?=\/|$)/g);
  },

  /** Finds all the possible collection variables in a given path string
   * @param {string} path Path string : /pets/{petId}
   * @returns {array} Array of collection variables.
   */
  findCollectionVariablesFromPath: function (path) {

    // /:path/{{file}}.{{format}}/:hello => only {{file}} and {{format}} will match
    // https://regex101.com/r/XGL4Gh/2
    return path.match(/(\{\{[^\/\{\}]+\}\})/g);
  },

  /**
   * Finds all the possible path variables conversion from schema path,
   * and excludes path variable that are converted to collection variable
   * @param {string} path Path string
   * @returns {array} Array of path variables.
   */
  findPathVariablesFromSchemaPath: function (path) {
    // /{path}/{file}.{format}/{hello} return [ '/{path}', '/{hello}' ]
    // https://regex101.com/r/aFRWQD/4
    let matches = path.match(/(\/\{[^\/\{\}]+\}(?=[\/\0]|$))/g);

    // remove leading '/' and starting and ending curly braces
    return _.map(matches, (match) => { return match.slice(2, -1); });
  },

  /**
   * Finds fixed parts present in path segment of collection or schema.
   *
   * @param {String} segment - Path segment
   * @param {String} pathType - Path type (one of 'collection' / 'schema')
   * @returns {Array} - Array of strings where each element is fixed part in order of their occurence
   */
  getFixedPartsFromPathSegment: function (segment, pathType = 'collection') {
    var tempSegment = segment,
      // collection is default
      varMatches = segment.match(pathType === 'schema' ? /(\{[^\/\{\}]+\})/g : /(\{\{[^\/\{\}]+\}\})/g),
      fixedParts = [];

    _.forEach(varMatches, (match) => {
      let matchedIndex = tempSegment.indexOf(match);

      // push fixed part before collection variable if present
      (matchedIndex !== 0) && (fixedParts.push(tempSegment.slice(0, matchedIndex)));

      // substract starting fixed and variable part from tempSegment
      tempSegment = tempSegment.substr(matchedIndex + match.length);
    });

    // add last fixed part if present
    (tempSegment.length > 0) && (fixedParts.push(tempSegment));

    return fixedParts;
  },

  /** Separates out collection and path variables from the reqUrl
   *
   * @param {string} reqUrl Request Url
   * @param {Array} pathVars Path variables
   *
   * @returns {Object} reqUrl, updated path Variables array and collection Variables.
   */
  sanitizeUrlPathParams: function (reqUrl, pathVars) {
    var matches,
      collectionVars = [];

    // converts all the of the following:
    // /{{path}}/{{file}}.{{format}}/{{hello}} => /:path/{{file}}.{{format}}/:hello
    matches = this.findPathVariablesFromPath(reqUrl);
    if (matches) {
      matches.forEach((match) => {
        const replaceWith = match.replace(/{{/g, ':').replace(/}}/g, '');
        reqUrl = reqUrl.replace(match, replaceWith);
      });
    }

    // Separates pathVars array and collectionVars.
    matches = this.findCollectionVariablesFromPath(reqUrl);
    if (matches) {
      matches.forEach((match) => {
        const collVar = match.replace(/{{/g, '').replace(/}}/g, '');

        pathVars = pathVars.filter((item) => {
          if (item.name === collVar) {
            collectionVars.push(item);
          }
          return !(item.name === collVar);
        });
      });
    }

    return { url: reqUrl, pathVars, collectionVars };
  },

  cleanWebhookName: function(webhookName) {
    return webhookName
      .replace(/[:/]/g, '_')
      .replace(/[{}]/g, '');
  },

  /**
   * function to convert an openapi path item to postman item
  * @param {*} openapi openapi object with root properties
  * @param {*} operationItem path operationItem from tree structure
  * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
  * @param {array} variableStore - array
  * @param {boolean} fromWebhooks - true if we are processing the webhooks group, false by default
  * @returns {Object} postman request Item
  * @no-unit-test
  */
  convertRequestToItem: function(openapi, operationItem, components,
    options, schemaCache, variableStore, fromWebhooks = false) {
    var reqName,
      pathVariables = openapi.baseUrlVariables,
      operation = operationItem.properties,
      reqBody = operationItem.properties.requestBody,
      itemParams = operationItem.properties.parameters,
      reqParams = this.getParametersForPathItem(itemParams, options),
      baseUrl = fromWebhooks ?
        `{{${this.cleanWebhookName(operationItem.path)}}}` :
        '{{baseUrl}}',
      pathVarArray = [],
      authHelper,
      item,
      serverObj,
      displayUrl,
      reqUrl = fromWebhooks ? '' : '/' + operationItem.path,
      pmBody,
      authMeta,
      swagResponse,
      localServers = fromWebhooks ? '' : _.get(operationItem, 'properties.servers'),
      exampleRequestBody,
      sanitizeResult,
      globalServers = fromWebhooks ? '' : _.get(operationItem, 'servers'),
      responseMediaTypes,
      acceptHeader;

    // handling path templating in request url if any
    // convert all {anything} to {{anything}}
    reqUrl = this.fixPathVariablesInUrl(reqUrl);

    // convert all /{{one}}/{{two}} to /:one/:two
    // Doesn't touch /{{file}}.{{format}}
    sanitizeResult = this.sanitizeUrlPathParams(reqUrl, reqParams.path);

    // Updated reqUrl
    reqUrl = sanitizeResult.url;

    // Updated reqParams.path
    reqParams.path = sanitizeResult.pathVars;

    // Add collection variables to the variableStore.
    sanitizeResult.collectionVars.forEach((element) => {
      if (!variableStore[element.name]) {
        let fakedData = options.schemaFaker ?
            safeSchemaFaker(element.schema || {}, options.requestParametersResolution, PROCESSING_TYPE.CONVERSION,
              PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options) : '',
          convertedPathVar = _.get(this.convertParamsWithStyle(element, fakedData, PARAMETER_SOURCE.REQUEST,
            components, schemaCache, options), '[0]', {});

        variableStore[element.name] = _.assign(convertedPathVar, { key: element.name, type: 'collection' });
      }
    });
    // accounting for the overriding of the root level and path level servers object if present at the operation level

    if (Array.isArray(localServers) && localServers.length) {
      serverObj = operationItem.properties.servers[0];

      // convert all {anything} to {{anything}}
      baseUrl = this.fixPathVariablesInUrl(serverObj.url);

      // add serverObj variables to pathVarArray
      if (serverObj.variables) {
        _.forOwn(serverObj.variables, (value, key) => {
          pathVarArray.push({
            name: key,
            value: value.default || '',
            description: this.getParameterDescription(value)
          });
        });

        // use pathVarArray to sanitize url for path params and collection variables.
        sanitizeResult = this.sanitizeUrlPathParams(baseUrl, pathVarArray);

        // update the base url with update url
        baseUrl = sanitizeResult.url;

        // Add new collection variables to the variableStore
        sanitizeResult.collectionVars.forEach((element) => {
          if (!variableStore[element.name]) {
            variableStore[element.name] = {
              key: element.name,
              value: element.value || '',
              description: element.description,
              type: 'collection'
            };
          }
        });

        // remove all the collection variables from serverObj.variables
        serverObj.pathVariables = {};
        sanitizeResult.pathVars.forEach((element) => {
          serverObj.pathVariables[element.name] = serverObj.variables[element.name];
        });

        // use this new filtered serverObj.pathVariables
        // to generate pm path variables.
        pathVarArray = this.convertPathVariables('method', [],
          serverObj.pathVariables, components, options, schemaCache);
      }
      baseUrl += reqUrl;
    }
    else {
      // accounting for the overriding of the root level servers object if present at the path level
      if (Array.isArray(globalServers) && globalServers.length) {
        // All the global servers present at the path level are taken care of in generateTrieFromPaths
        // Just adding the same structure of the url as the display URL.
        displayUrl = '{{' + this.fixPathVariableName(operationItem.path) + '}}' + reqUrl;
      }
      // In case there are no server available use the baseUrl
      else {
        baseUrl += reqUrl;
        if (pathVariables || fromWebhooks) {
          displayUrl = baseUrl;
        }
        else {
          displayUrl = '{{baseUrl}}' + reqUrl;
        }
      }
      pathVarArray = this.convertPathVariables('root', [], pathVariables, components, options, schemaCache);
    }

    switch (options.requestNameSource) {
      case 'fallback' : {
        // operationId is usually camelcase or snake case
        if (fromWebhooks) {
          reqName = operation.summary ||
            utils.insertSpacesInName(operation.operationId) ||
            operation.description ||
            `${this.cleanWebhookName(operationItem.path)} - ${operationItem.method}`;
        }
        else {
          reqName = operation.summary ||
            utils.insertSpacesInName(operation.operationId) ||
            operation.description || reqUrl;
        }
        break;
      }
      case 'url' : {
        reqName = displayUrl || baseUrl;
        break;
      }
      default : {
        reqName = operation[options.requestNameSource];
        break;
      }
    }
    if (!reqName) {
      throw new openApiErr(`requestNameSource (${options.requestNameSource})` +
        ` in options is invalid or property does not exist in ${operationItem.path}`);
    }

    // handling authentication here (for http type only)
    if (!options.alwaysInheritAuthentication) {
      authHelper = this.getAuthHelper(openapi, operation.security);
    }

    // creating the request object
    item = new Item({
      name: reqName,
      request: {
        description: operation.description,
        url: displayUrl || baseUrl,
        name: reqName,
        method: operationItem.method.toUpperCase()
      }
    });

    // using the auth helper
    authMeta = operation['x-postman-meta'];
    if (authMeta && authMeta.currentHelper && authMap[authMeta.currentHelper]) {
      let thisAuthObject = {
        type: authMap[authMeta.currentHelper]
      };

      thisAuthObject[authMap[authMeta.currentHelper]] = authMeta.helperAttributes;
      item.request.auth = new RequestAuth(thisAuthObject);
    }
    else {
      item.request.auth = authHelper;
    }

    // adding query params to postman request url.
    _.forEach(reqParams.query, (queryParam) => {
      this.convertToPmQueryParameters(queryParam, REQUEST_TYPE.ROOT, components, options, schemaCache)
        .forEach((pmParam) => {
          item.request.url.addQueryParams(pmParam);
        });
    });
    item.request.url.query.members.forEach((query) => {
      // Collection v2.1 schema allows query param value to be string/null
      if (typeof query.value !== 'string') {
        try {
          // convert other datatype to string (i.e. number, boolean etc)
          query.value = JSON.stringify(query.value);
        }
        catch (e) {
          // JSON.stringify can fail in few cases, suggest invalid type for such case
          // eslint-disable-next-line max-len
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Exceptions
          query.value = 'INVALID_QUERY_PARAM_TYPE';
        }
      }
    });
    item.request.url.variables.clear();
    item.request.url.variables.assimilate(this.convertPathVariables('param', pathVarArray, reqParams.path,
      components, options, schemaCache));

    // Making sure description never goes out as an object
    // App / Collection transformer fail with the object syntax
    if (item.request.url.variables.members && item.request.url.variables.members.length > 0) {
      item.request.url.variables.members = _.map(item.request.url.variables.members, (m) => {
        if (m.description && typeof m.description === 'object' && m.description.content) {
          m.description = m.description.content;
        }
        return m;
      });
    }

    // adding headers to request from reqParam
    _.forEach(reqParams.header, (header) => {
      if (options.keepImplicitHeaders || !_.includes(IMPLICIT_HEADERS, _.toLower(_.get(header, 'name')))) {
        item.request.addHeader(this.convertToPmHeader(header, REQUEST_TYPE.ROOT, PARAMETER_SOURCE.REQUEST,
          components, options, schemaCache));
      }
    });

    // adding Request Body and Content-Type header
    if (reqBody) {
      if (reqBody.$ref) {
        reqBody = this.getRefObject(reqBody.$ref, components, options);
      }
      pmBody = this.convertToPmBody(reqBody, REQUEST_TYPE.ROOT, components, options, schemaCache);
      item.request.body = pmBody.body;

      if (!options.keepImplicitHeaders || (!_.find(reqParams.header, (h) => {
        return _.toLower(_.get(h, 'name')) === 'content-type';
      }))) {
        // Add detected content-type header
        item.request.addHeader(pmBody.contentHeader);
      }
      // extra form headers if encoding is present in request Body.
      // TODO: Show warning for incorrect schema if !pmBody.formHeaders
      pmBody.formHeaders && pmBody.formHeaders.forEach((element) => {
        item.request.addHeader(element);
      });
    }

    // adding responses to request item
    if (operation.responses) {
      let thisOriginalRequest = {},
        responseAuthHelper,
        authQueryParams,
        convertedResponse;

      if (options.includeAuthInfoInExample) {
        responseAuthHelper = this.getResponseAuthHelper(authHelper);

        // override auth helper with global security definition if no operation security definition found
        if (_.isEmpty(authHelper)) {
          responseAuthHelper = this.getResponseAuthHelper(this.getAuthHelper(openapi, openapi.security));
        }

        authQueryParams = _.map(responseAuthHelper.query, (queryParam) => {
          // key-value pair will be added as transformed query string
          return queryParam.key + '=' + queryParam.value;
        });
      }

      _.forOwn(operation.responses, (response, code) => {
        let originalRequestHeaders = [],
          originalRequestQueryParams = this.convertToPmQueryArray(reqParams, REQUEST_TYPE.EXAMPLE,
            components, options, schemaCache);

        swagResponse = response;
        if (_.get(response, '$ref')) {
          swagResponse = this.getRefObject(response.$ref, components, options);
        }

        if (options.includeAuthInfoInExample) {
          // add Authorization params if present
          originalRequestQueryParams = _.concat(originalRequestQueryParams, authQueryParams);
          originalRequestHeaders = _.concat(originalRequestHeaders, responseAuthHelper.header);
        }

        // Try and set fields for originalRequest (example.request)
        thisOriginalRequest.method = item.request.method;
        // setting URL
        const clonedItemURL = _.cloneDeep(item.request.url);

        thisOriginalRequest.url = clonedItemURL;

        /**
         * Setting variable
         * overriding `thisOriginalRequest.url.variable` as the url defination expects
         * 1. Field variable and not variables
         * 2. Field variable to be array of objects which maps to `clonedItemURL.variables.members`
         */
        thisOriginalRequest.url.variable = clonedItemURL.variables.members;
        thisOriginalRequest.url.query = [];

        // setting query params
        if (originalRequestQueryParams.length) {
          thisOriginalRequest.url.query = originalRequestQueryParams.join('&');
        }

        // setting headers
        _.forEach(reqParams.header, (header) => {
          originalRequestHeaders.push(this.convertToPmHeader(header, REQUEST_TYPE.EXAMPLE,
            PARAMETER_SOURCE.REQUEST, components, options, schemaCache));
        });

        thisOriginalRequest.header = originalRequestHeaders;
        // setting request body
        try {
          exampleRequestBody = this.convertToPmBody(operationItem.properties.requestBody,
            REQUEST_TYPE.EXAMPLE, components, options, schemaCache);
          thisOriginalRequest.body = exampleRequestBody.body ? exampleRequestBody.body.toJSON() : {};
        }
        catch (e) {
          // console.warn('Exception thrown while trying to json-ify body for item.request.body:', item.request.body,
          // 'Exception:', e);
          thisOriginalRequest.body = {};
        }

        // set accept header value as first found response content's media type
        if (_.isEmpty(acceptHeader)) {
          responseMediaTypes = _.keys(_.get(swagResponse, 'content'));
          if (responseMediaTypes.length > 0) {
            acceptHeader = {
              key: 'Accept',
              value: responseMediaTypes[0]
            };
          }
        }

        convertedResponse = this.convertToPmResponse(swagResponse, code, thisOriginalRequest,
          components, options, schemaCache);
        convertedResponse && item.responses.add(convertedResponse);
      });
    }

    // add accept header if found and not present already
    if (!_.isEmpty(acceptHeader) && !item.request.headers.has('accept')) {
      item.request.addHeader(acceptHeader);
    }

    /**
     * Following is added to make sure body pruning for request methods like GET, HEAD etc is disabled'.
     * https://github.com/postmanlabs/postman-runtime/blob/develop/docs/protocol-profile-behavior.md
     */
    item.protocolProfileBehavior = { disableBodyPruning: true };

    return item;
  },

  /**
   * function to convert an openapi query params object to array of query params
  * @param {*} reqParams openapi query params object
  * @param {*} requestType Specifies whether the request body is of example request or root request
  * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
  * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
  * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
  * @returns {*} array of all query params
  */
  convertToPmQueryArray: function(reqParams, requestType, components, options, schemaCache) {
    let requestQueryParams = [];
    _.forEach(reqParams.query, (queryParam) => {
      this.convertToPmQueryParameters(queryParam, requestType, components, options, schemaCache).forEach((pmParam) => {
        requestQueryParams.push(pmParam.key + '=' + pmParam.value);
      });
    });
    return requestQueryParams;
  },

  // along with the path object, this also returns the values of the
  // path variable's values
  // also, any endpoint-level params are merged into the returned pathItemObject
  findMatchingRequestFromSchema: function (method, url, schema, options) {
    // first step - get array of requests from schema
    let parsedUrl = require('url').parse(_.isString(url) ? url : ''),
      retVal = [],
      pathToMatch,
      matchedPath,
      matchedPathJsonPath,
      schemaPathItems = schema.paths,
      pathToMatchServer,
      filteredPathItemsArray = [];

    // Return no matches for invalid url (if unable to decode parsed url)
    try {
      pathToMatch = decodeURI(parsedUrl.pathname);
      if (!_.isNil(parsedUrl.hash)) {
        pathToMatch += parsedUrl.hash;
      }
    }
    catch (e) {
      console.warn(
        'Error decoding request URI endpoint. URI: ', url,
        'Error', e
      );
      return retVal;
    }

    // if pathToMatch starts with '/', we assume it's the correct path
    // if not, we assume the segment till the first '/' is the host
    // this is because a Postman URL like "{{url}}/a/b" will
    // likely have {{url}} as the host segment
    if (!pathToMatch.startsWith('/')) {
      pathToMatch = pathToMatch.substring(pathToMatch.indexOf('/'));
    }

    // Here, only take pathItemObjects that have the right method
    // of those that do, determine a score
    // then just pick that key-value pair from schemaPathItems
    _.forOwn(schemaPathItems, (pathItemObject, path) => {
      if (!pathItemObject) {
        // invalid schema. schema.paths had an invalid entry
        return true;
      }

      if (!pathItemObject.hasOwnProperty(method.toLowerCase())) {
        // the required method was not found at this path
        return true;
      }

      // filter empty parameters
      pathItemObject.parameters = _.reduce(pathItemObject.parameters, (accumulator, param) => {
        if (!_.isEmpty(param)) {
          accumulator.push(param);
        }
        return accumulator;
      }, []);
      let schemaMatchResult = { match: false };
      // check if path and pathToMatch match (non-null)
      // check in explicit (local defined) servers
      if (pathItemObject[method.toLowerCase()].servers) {
        pathToMatchServer = this.handleExplicitServersPathToMatch(pathToMatch, path);
        schemaMatchResult = this.getPostmanUrlSchemaMatchScore(pathToMatchServer, path, options);
      }
      else {
        schemaMatchResult = this.getPostmanUrlSchemaMatchScore(pathToMatch, path, options);
      }
      if (!schemaMatchResult.match) {
        // there was no reasonable match b/w the postman path and this schema path
        return true;
      }

      filteredPathItemsArray.push({
        path,
        pathItem: pathItemObject,
        matchScore: schemaMatchResult.score,
        pathVars: schemaMatchResult.pathVars,
        // No. of fixed segment matches between schema and postman url path
        // i.e. schema path /user/{userId} and request path /user/{{userId}} has 1 fixed segment match ('user')
        fixedMatchedSegments: schemaMatchResult.fixedMatchedSegments,
        // No. of variable segment matches between schema and postman url path
        // i.e. schema path /user/{userId} and request path /user/{{userId}} has 1 variable segment match ('{userId}')
        variableMatchedSegments: schemaMatchResult.variableMatchedSegments
      });
    });

    // order endpoints with more fix matched segments and variable matched segments (for tie in former) first in result
    filteredPathItemsArray = _.orderBy(filteredPathItemsArray, ['fixedMatchedSegments', 'variableMatchedSegments'],
      ['desc', 'desc']);

    _.each(filteredPathItemsArray, (fp) => {
      let path = fp.path,
        pathItemObject = fp.pathItem,
        score = fp.matchScore,
        pathVars = fp.pathVars;

      matchedPath = pathItemObject[method.toLowerCase()];
      if (!matchedPath) {
        // method existed at the path, but was a falsy value
        return true;
      }

      matchedPathJsonPath = `$.paths[${path}]`;

      // filter empty parameters
      matchedPath.parameters = _.reduce(matchedPath.parameters, (accumulator, param) => {
        if (!_.isEmpty(param)) {
          accumulator.push(param);
        }
        return accumulator;
      }, []);

      // aggregate local + global parameters for this path
      matchedPath.parameters = _.map(matchedPath.parameters, (commonParam) => {
        // for path-specifix params that are added to the path, have a way to identify them
        // when the schemaPath is required
        // method is lowercased because OAS methods are always lowercase
        commonParam.pathPrefix = `${matchedPathJsonPath}.${method.toLowerCase()}.parameters`;

        return commonParam;
      }).concat(
        _.map(pathItemObject.parameters || [], (commonParam) => {
          // for common params that are added to the path, have a way to identify them
          // when the schemaPath is required
          commonParam.pathPrefix = matchedPathJsonPath + '.parameters';
          return commonParam;
        })
      );

      retVal.push({
        // using path instead of operationId / sumamry since it's widely understood
        name: method + ' ' + path,
        // assign path as schemaPathName property to use path in path object
        path: _.assign(matchedPath, { schemaPathName: path }),
        jsonPath: matchedPathJsonPath + '.' + method.toLowerCase(),
        pathVariables: pathVars,
        score: score
      });

      // code reaching here indicates the given method was not found
      return true;
    });

    return retVal;
  },

  /**
   * Checks if value is postman variable or not
   *
   * @param {*} value - Value to check for
   * @returns {Boolean} postman variable or not
   */
  isPmVariable: function (value) {
    // collection/environment variables are in format - {{var}}
    return _.isString(value) && _.startsWith(value, '{{') && _.endsWith(value, '}}');
  },

  /**
   * This function is little modified version of lodash _.get()
   * where if path is empty it will return source object instead undefined/fallback value
   *
   * @param {Object} sourceValue - source from where value is to be extracted
   * @param {String} dataPath - json path to value that is to be extracted
   * @param {*} fallback - fallback value if sourceValue doesn't contain value at dataPath
   * @returns {*} extracted value
   */
  getPathValue: function (sourceValue, dataPath, fallback) {
    return (dataPath === '' ? sourceValue : _.get(sourceValue, dataPath, fallback));
  },

  /**
   * Returns all security params that can be applied during converion.
   *
   * @param {Object} components - OpenAPI components
   * @param {String} location - location for which we want to get security params (i.e. 'header' | 'query')
   * @returns {Array} applicable security params
   */
  getSecurityParams: function (components, location) {
    let securityDefs = _.get(components, 'securitySchemes', {}),
      securityParams = [];

    _.forEach(securityDefs, (securityDef) => {
      // Currently we only apply header and query for apiKey type of security param during conversion
      if (_.get(securityDef, 'type') === 'apiKey' && _.get(securityDef, 'in') === location) {
        securityParams.push(securityDef);
      }
    });
    return securityParams;
  },

  /**
   * Provides information regarding serialisation of param
   *
   * @param {*} param - OpenAPI Parameter object
   * @param {String} parameterSource - Specifies whether the schema being faked is from a request or response.
   * @param {Object} components - OpenAPI components defined in the OAS spec. These are used to
   *  resolve references while generating params.
   * @param {Object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {Object} - Information regarding parameter serialisation. Contains following properties.
   * {
   *  style - style property defined/inferred from schema
   *  explode - explode property defined/inferred from schema
   *  startValue - starting value that is prepended to serialised value
   *  propSeparator - Character that separates two properties or values in serialised string of respective param
   *  keyValueSeparator - Character that separates key from values in serialised string of respective param
   *  isExplodable - whether params can be exploded (serialised value can contain key and value)
   * }
   */
  getParamSerialisationInfo: function (param, parameterSource, components) {
    var paramName = _.get(param, 'name'),
      paramSchema = deref.resolveRefs(_.cloneDeep(param.schema), parameterSource, components, {}),
      style, // style property defined/inferred from schema
      explode, // explode property defined/inferred from schema
      propSeparator, // separates two properties or values
      keyValueSeparator, // separats key from value
      startValue = '', // starting value that is unique to each style
      // following prop represents whether param can be truly exploded, as for some style even when explode is true,
      // serialisation doesn't separate key-value
      isExplodable = paramSchema.type === 'object';

    // for invalid param object return null
    if (!_.isObject(param)) {
      return null;
    }

    // decide allowed / default style for respective param location
    switch (param.in) {
      case 'path':
        style = _.includes(['matrix', 'label', 'simple'], param.style) ? param.style : 'simple';
        break;
      case 'query':
        style = _.includes(['form', 'spaceDelimited', 'pipeDelimited', 'deepObject'], param.style) ?
          param.style : 'form';
        break;
      case 'header':
        style = 'simple';
        break;
      default:
        style = 'simple';
        break;
    }

    // decide allowed / default explode property for respective param location
    explode = (_.isBoolean(param.explode) ? param.explode : (_.includes(['form', 'deepObject'], style)));

    // decide explodable params, starting value and separators between key-value and properties for serialisation
    switch (style) {
      case 'matrix':
        isExplodable = paramSchema.type === 'object' || explode;
        startValue = ';' + ((paramSchema.type === 'object' && explode) ? '' : (paramName + '='));
        propSeparator = explode ? ';' : ',';
        keyValueSeparator = explode ? '=' : ',';
        break;
      case 'label':
        startValue = '.';
        propSeparator = '.';
        keyValueSeparator = explode ? '=' : '.';
        break;
      case 'form':
        // for 'form' when explode is true, query is devided into different key-value pairs
        propSeparator = keyValueSeparator = ',';
        break;
      case 'simple':
        propSeparator = ',';
        keyValueSeparator = explode ? '=' : ',';
        break;
      case 'spaceDelimited':
        explode = false;
        propSeparator = keyValueSeparator = '%20';
        break;
      case 'pipeDelimited':
        explode = false;
        propSeparator = keyValueSeparator = '|';
        break;
      case 'deepObject':
        // for 'deepObject' query is devided into different key-value pairs
        explode = true;
        break;
      default:
        break;
    }

    return { style, explode, startValue, propSeparator, keyValueSeparator, isExplodable };
  },

  /**
   * This functiom deserialises parameter value based on param schema
   *
   * @param {*} param - OpenAPI Parameter object
   * @param {String} paramValue - Parameter value to be deserialised
   * @param {String} parameterSource - Specifies whether the schema being faked is from a request or response.
   * @param {Object} components - OpenAPI components defined in the OAS spec. These are used to
   *  resolve references while generating params.
   * @param {Object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {*} - deserialises parameter value
   */
  deserialiseParamValue: function (param, paramValue, parameterSource, components) {
    var constructedValue,
      paramSchema = deref.resolveRefs(_.cloneDeep(param.schema), parameterSource, components, {}),
      isEvenNumber = (num) => {
        return (num % 2 === 0);
      },
      convertToDataType = (value) => {
        try {
          return JSON.parse(value);
        }
        catch (e) {
          return value;
        }
      };

    // for invalid param object return null
    if (!_.isObject(param) || !_.isString(paramValue)) {
      return null;
    }

    let { startValue, propSeparator, keyValueSeparator, isExplodable } =
      this.getParamSerialisationInfo(param, parameterSource, components);

    // as query params are constructed from url, during conversion we use decodeURI which converts ('%20' into ' ')
    (keyValueSeparator === '%20') && (keyValueSeparator = ' ');
    (propSeparator === '%20') && (propSeparator = ' ');

    // remove start value from serialised value
    paramValue = paramValue.slice(paramValue.indexOf(startValue) === 0 ? startValue.length : 0);

    // define value to constructed according to type
    paramSchema.type === 'object' && (constructedValue = {});
    paramSchema.type === 'array' && (constructedValue = []);

    if (constructedValue) {
      let allProps = paramValue.split(propSeparator);
      _.forEach(allProps, (element, index) => {
        let keyValArray;

        if (propSeparator === keyValueSeparator && isExplodable) {
          if (isEvenNumber(index)) {
            keyValArray = _.slice(allProps, index, index + 2);
          }
          else {
            return;
          }
        }
        else if (isExplodable) {
          keyValArray = element.split(keyValueSeparator);
        }

        if (paramSchema.type === 'object') {
          _.set(constructedValue, keyValArray[0], convertToDataType(keyValArray[1]));
        }
        else if (paramSchema.type === 'array') {
          constructedValue.push(convertToDataType(_.get(keyValArray, '[1]', element)));
        }
      });
    }
    else {
      constructedValue = paramValue;
    }
    return constructedValue;
  },

  /**
   * Parses media type from given content-type header or media type
   * from content object into type and subtype
   *
   * @param {String} str - string to be parsed
   * @returns {Object} - Parsed media type into type and subtype
   */
  parseMediaType: function (str) {
    let simpleMediaTypeRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/,
      match = simpleMediaTypeRegExp.exec(str),
      type = '',
      subtype = '';

    if (match) {
      // as mediatype name are case-insensitive keep it in lower case for uniformity
      type = _.toLower(match[1]);
      subtype = _.toLower(match[2]);
    }

    return { type, subtype };
  },

  /**
   * Extracts all child parameters from explodable param
   *
   * @param {*} schema - Corresponding schema object of parent parameter to be devided into child params
   * @param {*} paramKey - Parameter name of parent param object
   * @param {*} metaInfo - meta information of param (i.e. required)
   * @returns {Array} - Extracted child parameters
   */
  extractChildParamSchema: function (schema, paramKey, metaInfo) {
    let childParamSchemas = [];

    _.forEach(_.get(schema, 'properties', {}), (value, key) => {
      if (_.get(value, 'type') === 'object') {
        childParamSchemas = _.concat(childParamSchemas, this.extractChildParamSchema(value,
          `${paramKey}[${key}]`, metaInfo));
      }
      else {
        let required = _.get(metaInfo, 'required') || false,
          description = _.get(metaInfo, 'description') || '',
          pathPrefix = _.get(metaInfo, 'pathPrefix');

        childParamSchemas.push({
          name: `${paramKey}[${key}]`,
          schema: value,
          description,
          required,
          isResolvedParam: true,
          pathPrefix
        });
      }
    });
    return childParamSchemas;
  },

  /**
   * Tests whether given parameter is of complex array type from param key
   *
   * @param {*} paramKey - Parmaeter key that is to be tested
   * @returns {Boolean} - result
   */
  isParamComplexArray: function (paramKey) {
    // this checks if parameter key numbered element (i.e. itemArray[1] is complex array param)
    let regex = /\[[\d]+\]/gm;
    return regex.test(paramKey);
  },

  /**
   * Finds valid JSON media type object from content object
   *
   * @param {*} contentObj - Content Object from schema
   * @returns {*} - valid JSON media type if exists
   */
  getJsonContentType: function (contentObj) {
    let jsonContentType = _.find(_.keys(contentObj), (contentType) => {
      let mediaType = this.parseMediaType(contentType);

      return mediaType.type === 'application' && (
        mediaType.subtype === 'json' || _.endsWith(mediaType.subtype, '+json')
      );
    });

    return jsonContentType;
  },

  /**
   *
   * @param {String} property - one of QUERYPARAM, PATHVARIABLE, HEADER, BODY, RESPONSE_HEADER, RESPONSE_BODY
   * @param {String} jsonPathPrefix - this will be prepended to all JSON schema paths on the request
   * @param {String} txnParamName - Optional - The name of the param being validated (useful for query params,
   *  req headers, res headers)
   * @param {*} value - the value of the property in the request
   * @param {String} schemaPathPrefix - this will be prepended to all JSON schema paths on the schema
   * @param {Object} openApiSchemaObj - The OpenAPI schema object against which to validate
   * @param {String} parameterSourceOption tells that the schema object is of request or response
   * @param {Object} components - Components in the spec that the schema might refer to
   * @param {Object} options - Global options
   * @param {Object} schemaCache object storing schemaFaker and schmeResolution caches
   * @param {string} jsonSchemaDialect The schema dialect defined in the OAS object
   * @param {Function} callback - For return
   * @returns {Array} array of mismatches
   */
  checkValueAgainstSchema: function (property, jsonPathPrefix, txnParamName, value, schemaPathPrefix, openApiSchemaObj,
    parameterSourceOption, components, options, schemaCache, jsonSchemaDialect, callback) {

    let mismatches = [],
      jsonValue,
      humanPropName = propNames[property],
      needJsonMatching = (property === 'BODY' || property === 'RESPONSE_BODY'),
      invalidJson = false,
      valueToUse = value,

      // This is dereferenced schema (converted to JSON schema for validation)
      schema = deref.resolveRefs(openApiSchemaObj, parameterSourceOption, components, {
        resolveFor: PROCESSING_TYPE.VALIDATION,
        resolveTo: 'example',
        stackLimit: options.stackLimit
      }),
      compositeSchema = schema.oneOf || schema.anyOf;

    if (needJsonMatching) {
      try {
        jsonValue = JSON.parse(value);
        // If valid JSON is detected, the parsed value should be used
        // to determine mismatches
        valueToUse = jsonValue;
      }
      catch (e) {
        jsonValue = '';
        invalidJson = true;
      }
    }

    // For anyOf and oneOf schemas, validate value against each schema and report result with least mismatches
    if (compositeSchema) {
      // get mismatches of value against each schema
      async.map(compositeSchema, (elementSchema, cb) => {
        setTimeout(() => {
          this.checkValueAgainstSchema(property, jsonPathPrefix, txnParamName, value,
            `${schemaPathPrefix}.${schema.oneOf ? 'oneOf' : 'anyOf'}[${_.findIndex(compositeSchema, elementSchema)}]`,
            elementSchema, parameterSourceOption, components, options, schemaCache, jsonSchemaDialect, cb);
        }, 0);
      }, (err, results) => {
        let sortedResults;

        if (err) {
          return callback(err, []);
        }

        // return mismatches of schema against which least validation mismatches were found
        sortedResults = _.sortBy(results, (res) => { return res.length; });
        return callback(null, sortedResults[0]);
      });
    }
    // When processing a reference, schema.type could also be undefined
    else if (schema && schema.type) {
      if (isKnownType(schema)) {
        let isCorrectType;

        // Treat unresolved postman collection/environment variable as correct type
        if (options.ignoreUnresolvedVariables && this.isPmVariable(valueToUse)) {
          isCorrectType = true;
        }
        else {
          isCorrectType = checkIsCorrectType(valueToUse, schema);
        }

        if (!isCorrectType) {
          // if type didn't match, no point checking for AJV
          let reason = '',
            mismatchObj;

          // exclude mismatch errors for nested objects in parameters (at this point simple objects and array should
          // be already converted to primitive schema and only nested objects remains as type object/array)
          if (_.includes(['QUERYPARAM', 'PATHVARIABLE', 'HEADER'], property) &&
            (schema.type === 'object' || schema.type === 'array')) {
            return callback(null, []);
          }

          if (property === 'RESPONSE_BODY' || property === 'BODY') {
            // we don't have names for the body, but there's only one
            reason = 'The ' + humanPropName;
          }
          else if (txnParamName) {
            // for query params, req/res headers, path vars, we have a name. Praise the lord.
            reason = `The ${humanPropName} "${txnParamName}"`;
          }
          else {
            // for query params, req/res headers, path vars, we might not ALWAYS have a name.
            reason = `A ${humanPropName}`;
          }
          reason += ` needs to be of type ${schema.type}, but we found `;
          if (!options.shortValidationErrors) {
            reason += `"${valueToUse}"`;
          }
          else if (invalidJson) {
            reason += 'invalid JSON';
          }
          else if (Array.isArray(valueToUse)) {
            reason += 'an array instead';
          }
          else if (typeof valueToUse === 'object') {
            reason += 'an object instead';
          }
          else {
            reason += `a ${typeof valueToUse} instead`;
          }

          mismatchObj = {
            property,
            transactionJsonPath: jsonPathPrefix,
            schemaJsonPath: schemaPathPrefix,
            reasonCode: 'INVALID_TYPE',
            reason
          };

          if (options.suggestAvailableFixes) {
            mismatchObj.suggestedFix = {
              key: txnParamName,
              actualValue: valueToUse,
              suggestedValue: safeSchemaFaker(openApiSchemaObj || {}, 'example', PROCESSING_TYPE.VALIDATION,
                parameterSourceOption, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options.includeDeprecated)
            };
          }

          return callback(null, [mismatchObj]);
        }

        // only do AJV if type is array or object
        // simpler cases are handled by a type check
        if (isCorrectType && needJsonMatching) {
          let filteredValidationError = validateSchema(schema, valueToUse, options, jsonSchemaDialect);

          if (!_.isEmpty(filteredValidationError)) {
            let mismatchObj,
              suggestedValue,
              fakedValue = safeSchemaFaker(openApiSchemaObj || {}, 'example', PROCESSING_TYPE.VALIDATION,
                parameterSourceOption, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options);

            // Show detailed validation mismatches for only request/response body
            if (options.detailedBlobValidation && needJsonMatching) {
              _.forEach(filteredValidationError, (ajvError) => {
                let localSchemaPath = ajvError.schemaPath.replace(/\//g, '.').slice(2),
                  dataPath = formatDataPath(ajvError.instancePath || '');

                // discard the leading '.' if it exists
                if (dataPath[0] === '.') {
                  dataPath = dataPath.slice(1);
                }

                mismatchObj = _.assign({
                  property: property,
                  transactionJsonPath: jsonPathPrefix + formatDataPath(ajvError.instancePath),
                  schemaJsonPath: schemaPathPrefix + '.' + localSchemaPath
                }, ajvValidationError(ajvError, { property, humanPropName }));

                if (options.suggestAvailableFixes) {
                  mismatchObj.suggestedFix = {
                    key: _.split(dataPath, '.').pop(),
                    actualValue: this.getPathValue(valueToUse, dataPath, null),
                    suggestedValue: this.getSuggestedValue(fakedValue, valueToUse, ajvError)
                  };
                }
                mismatches.push(mismatchObj);
              });
            }
            else {
              mismatchObj = {
                reason: `The ${humanPropName} didn\'t match the specified schema`,
                reasonCode: 'INVALID_TYPE'
              };

              // assign proper reason codes for invalid body
              if (property === 'BODY') {
                mismatchObj.reasonCode = 'INVALID_BODY';
              }
              else if (property === 'RESPONSE_BODY') {
                mismatchObj.reasonCode = 'INVALID_RESPONSE_BODY';
              }

              if (options.suggestAvailableFixes) {
                suggestedValue = _.cloneDeep(valueToUse);

                // Apply each fix individually to respect existing values in request
                _.forEach(filteredValidationError, (ajvError) => {
                  let dataPath = formatDataPath(ajvError.instancePath || '');

                  // discard the leading '.' if it exists
                  if (dataPath[0] === '.') {
                    dataPath = dataPath.slice(1);
                  }

                  // for empty string _.set creates new key with empty string '', so separate handling
                  if (dataPath === '') {
                    suggestedValue = this.getSuggestedValue(fakedValue, suggestedValue, ajvError);
                  }
                  else {
                    _.set(suggestedValue, dataPath, this.getSuggestedValue(fakedValue, suggestedValue, ajvError));
                  }
                });

                mismatchObj.suggestedFix = {
                  key: property.toLowerCase(),
                  actualValue: valueToUse,
                  suggestedValue
                };
              }

              mismatches.push(_.assign({
                property: property,
                transactionJsonPath: jsonPathPrefix,
                schemaJsonPath: schemaPathPrefix
              }, mismatchObj));
            }

            // only return AJV mismatches
            return callback(null, mismatches);
          }
          // result passed. No AJV mismatch
          return callback(null, []);
        }

        // Schema was not AJV or object
        // Req/Res Body was non-object but content type is application/json
        else if (needJsonMatching) {
          return callback(null, [{
            property,
            transactionJsonPath: jsonPathPrefix,
            schemaJsonPath: schemaPathPrefix,
            reasonCode: 'INVALID_TYPE',
            reason: `The ${humanPropName} needs to be of type object/array, but we found "${valueToUse}"`,
            suggestedFix: {
              key: null,
              actualValue: valueToUse,
              suggestedValue: {} // suggest value to be object
            }
          }]);
        }
        else {
          return callback(null, []);
        }
      }
      else {
        // unknown schema.type found
        // TODO: Decide how to handle. Log?
        return callback(null, []);
      }
    }
    // Schema not defined
    else {
      return callback(null, []);
    }
    // if (!schemaTypeToJsValidator[schema.type](value)) {
    //   callback(null, [{
    //     property,
    //     transactionJsonPath: jsonPathPrefix,
    //     schemaJsonPath: schemaPathPrefix,
    //     reasonCode: 'INVALID_TYPE',
    //     reason: `Value must be a token of type ${schema.type}, found ${value}`
    //   }]);
    // }
    // TODO: Further checks for object type
    // else {
    //   callback(null, []);
    // }
  },

  /**
   *
   * @param {*} matchedPathData the matchedPath data
   * @param {*} transactionPathPrefix the jsonpath for this validation (will be prepended to all identified mismatches)
   * @param {*} schemaPath the applicable pathItem defined at the schema level
   * @param {*} components the components + paths from the OAS spec that need to be used to resolve $refs
   * @param {*} options OAS options
   * @param {*} schemaCache object storing schemaFaker and schmeResolution caches
   * @param {string} jsonSchemaDialect Defined schema dialect at the OAS object
   * @param {*} callback Callback
   * @returns {array} mismatches (in the callback)
   */
  checkPathVariables: function (
    matchedPathData,
    transactionPathPrefix,
    schemaPath,
    components,
    options,
    schemaCache,
    jsonSchemaDialect,
    callback) {

    // schema path should have all parameters needed
    // components need to be stored globally
    var mismatchProperty = 'PATHVARIABLE',
      // all path variables defined in this path. acc. to the spec, all path params are required
      schemaPathVariables,
      pmPathVariables,
      determinedPathVariables = matchedPathData.pathVariables,
      unmatchedVariablesFromTransaction = matchedPathData.unmatchedVariablesFromTransaction;

    if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
      return callback(null, []);
    }

    // find all schema path variables that can be present as collection path variables
    pmPathVariables = this.findPathVariablesFromSchemaPath(schemaPath.schemaPathName);
    schemaPathVariables = _.filter(schemaPath.parameters, (param) => {
      // exclude path variables stored as collection variable from being validated further
      return (param.in === 'path' && _.includes(pmPathVariables, param.name));
    });

    async.map(determinedPathVariables, (pathVar, cb) => {
      let mismatches = [],
        resolvedParamValue,
        index = _.findIndex(determinedPathVariables, pathVar);

      const schemaPathVar = _.find(schemaPathVariables, (param) => {
        return param.name === pathVar.key;
      });

      if (!schemaPathVar) {
        // extra pathVar present in given request.
        if (options.showMissingInSchemaErrors) {
          mismatches.push({
            property: mismatchProperty,
            // not adding the pathVar name to the jsonPath because URL is just a string
            transactionJsonPath: transactionPathPrefix + `[${index}]`,
            schemaJsonPath: null,
            reasonCode: 'MISSING_IN_SCHEMA',
            reason: `The path variable "${pathVar.key}" was not found in the schema`
          });
        }
        return cb(null, mismatches);
      }

      // don't validate variable if not present in transaction and URL path vars are not allowed
      if (!pathVar._varMatched && !options.allowUrlPathVarMatching) {
        return cb(null, mismatches);
      }

      // assign parameter example(s) as schema examples
      this.assignParameterExamples(schemaPathVar);

      resolvedParamValue = this.deserialiseParamValue(schemaPathVar, pathVar.value, PARAMETER_SOURCE.REQUEST,
        components, schemaCache);

      setTimeout(() => {
        if (!(schemaPathVar && schemaPathVar.schema)) {
          // no errors to show if there's no schema present in the spec
          return cb(null, []);
        }

        this.checkValueAgainstSchema(mismatchProperty,
          transactionPathPrefix + `[${index}].value`,
          pathVar.key,
          resolvedParamValue,
          schemaPathVar.pathPrefix + '[?(@.name==\'' + schemaPathVar.name + '\')]',
          schemaPathVar.schema,
          PARAMETER_SOURCE.REQUEST,
          components, options, schemaCache, jsonSchemaDialect, cb);
      }, 0);
    }, (err, res) => {
      let mismatches = [],
        mismatchObj;
      const unmatchedSchemaVariableNames = determinedPathVariables.filter((pathVariable) => {
        return !pathVariable._varMatched;
      }).map((schemaPathVar) => {
        return schemaPathVar.key;
      });

      if (err) {
        return callback(err);
      }

      // go through required schemaPathVariables, and params that aren't found in the given transaction are errors
      _.each(schemaPathVariables, (pathVar, index) => {
        if (!_.find(determinedPathVariables, (param) => {
          // only consider variable matching if url path variables is not allowed
          return param.key === pathVar.name && (options.allowUrlPathVarMatching || param._varMatched);
        })) {
          let reasonCode = 'MISSING_IN_REQUEST',
            reason,
            actualValue,
            currentUnmatchedVariableInTransaction = unmatchedVariablesFromTransaction[index],
            isInvalidValue = currentUnmatchedVariableInTransaction !== undefined;

          if (unmatchedSchemaVariableNames.length > 0 && isInvalidValue) {
            reason = `The ${currentUnmatchedVariableInTransaction.key} path variable does not match with ` +
              `path variable expected (${unmatchedSchemaVariableNames[index]}) in the schema at this position`;
            actualValue = {
              key: currentUnmatchedVariableInTransaction.key,
              description: this.getParameterDescription(currentUnmatchedVariableInTransaction),
              value: currentUnmatchedVariableInTransaction.value
            };
          }
          else {
            reason = `The required path variable "${pathVar.name}" was not found in the transaction`;
            actualValue = null;
          }

          // assign parameter example(s) as schema examples;
          this.assignParameterExamples(pathVar);

          mismatchObj = {
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix,
            schemaJsonPath: pathVar.pathPrefix,
            reasonCode,
            reason
          };

          if (options.suggestAvailableFixes) {
            mismatchObj.suggestedFix = {
              key: pathVar.name,
              actualValue,
              suggestedValue: {
                key: pathVar.name,
                value: safeSchemaFaker(pathVar.schema || {}, 'example', PROCESSING_TYPE.VALIDATION,
                  PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options),
                description: this.getParameterDescription(pathVar)
              }
            };
          }
          mismatches.push(mismatchObj);
        }
      });

      // res is an array of mismatches (also an array) from all checkValueAgainstSchema calls
      return callback(null, _.concat(_.flatten(res), mismatches));
    });
  },

  /**
   *
   * @param {*} transaction Transaction with which to compare
   * @param {*} transactionPathPrefix the jsonpath for this validation (will be prepended to all identified mismatches)
   * @param {*} schemaPath the applicable pathItem defined at the schema level
   * @param {*} pathRoute Route to applicable pathItem (i.e. 'GET /users/{userID}')
   * @param {*} options OAS options
   * @param {*} callback Callback
   * @returns {array} mismatches (in the callback)
   */
  checkMetadata(transaction, transactionPathPrefix, schemaPath, pathRoute, options, callback) {
    let expectedReqName,
      expectedReqDesc,
      reqNameMismatch,
      actualReqName = _.get(transaction, 'name'),
      trimmedReqName,
      actualReqDesc,
      mismatches = [],
      mismatchObj,
      reqUrl;

    if (!options.validateMetadata) {
      return callback(null, []);
    }

    // only validate string upto 255 character as longer name results in issues while updation
    trimmedReqName = utils.trimRequestName(actualReqName);

    // handling path templating in request url if any
    // convert all {anything} to {{anything}}
    reqUrl = this.fixPathVariablesInUrl(pathRoute.slice(pathRoute.indexOf('/')));

    // convert all /{{one}}/{{two}} to /:one/:two
    // Doesn't touch /{{file}}.{{format}}
    reqUrl = this.sanitizeUrlPathParams(reqUrl, []).url;

    // description can be one of following two
    actualReqDesc = _.isObject(_.get(transaction, 'request.description')) ?
      _.get(transaction, 'request.description.content') : _.get(transaction, 'request.description');
    expectedReqDesc = schemaPath.description;

    switch (options.requestNameSource) {
      case 'fallback' : {
        // operationId is usually camelcase or snake case
        expectedReqName = schemaPath.summary || utils.insertSpacesInName(schemaPath.operationId) || reqUrl;
        expectedReqName = utils.trimRequestName(expectedReqName);
        reqNameMismatch = (trimmedReqName !== expectedReqName);
        break;
      }
      case 'url' : {
        // actual value may differ in conversion as it uses local/global servers info to generate it
        // for now suggest actual path as request name
        expectedReqName = reqUrl;
        reqNameMismatch = !_.endsWith(actualReqName, reqUrl);
        break;
      }
      default : {
        expectedReqName = schemaPath[options.requestNameSource];
        expectedReqName = utils.trimRequestName(expectedReqName);
        reqNameMismatch = (trimmedReqName !== expectedReqName);
        break;
      }
    }

    if (reqNameMismatch) {
      mismatchObj = {
        property: 'REQUEST_NAME',
        transactionJsonPath: transactionPathPrefix + '.name',
        schemaJsonPath: null,
        reasonCode: 'INVALID_VALUE',
        reason: 'The request name didn\'t match with specified schema'
      };

      options.suggestAvailableFixes && (mismatchObj.suggestedFix = {
        key: 'name',
        actualValue: actualReqName || null,
        suggestedValue: expectedReqName
      });
      mismatches.push(mismatchObj);
    }

    /**
     * Collection stores empty description as null, while OpenAPI spec can have empty string as description.
     * Hence We need to treat null and empty string as match. So check first if both schema and collection description
     * are not empty. _.isEmpty() returns true for null/undefined/''(empty string)
     * i.e. collection desc = null and schema desc = '', for this case no mismatch will occurr
     */
    if ((!_.isEmpty(actualReqDesc) || !_.isEmpty(expectedReqDesc)) && (actualReqDesc !== expectedReqDesc)) {
      mismatchObj = {
        property: 'REQUEST_DESCRIPTION',
        transactionJsonPath: transactionPathPrefix + '.request.description',
        schemaJsonPath: null,
        reasonCode: 'INVALID_VALUE',
        reason: 'The request description didn\'t match with specified schema'
      };

      options.suggestAvailableFixes && (mismatchObj.suggestedFix = {
        key: 'description',
        actualValue: actualReqDesc || null,
        suggestedValue: expectedReqDesc
      });
      mismatches.push(mismatchObj);
    }
    return callback(null, mismatches);
  },

  checkQueryParams(requestUrl, transactionPathPrefix, schemaPath, components, options,
    schemaCache, jsonSchemaDialect, callback) {
    let parsedUrl = require('url').parse(requestUrl),
      schemaParams = _.filter(schemaPath.parameters, (param) => { return param.in === 'query'; }),
      requestQueryArray = [],
      requestQueryParams = [],
      resolvedSchemaParams = [],
      mismatchProperty = 'QUERYPARAM',
      securityParams,
      urlMalformedError;

    if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
      return callback(null, []);
    }

    if (!parsedUrl.query) {
      // null query params should be treated as lack of any params
      parsedUrl.query = '';
    }
    requestQueryArray = parsedUrl.query.split('&');

    _.each(requestQueryArray, (rqp) => {
      let parts = rqp.split('='),
        qKey, qVal;

      try {
        qKey = decodeURIComponent(parts[0]);
        qVal = decodeURIComponent(parts.slice(1).join('='));
      }
      catch (err) {
        return (urlMalformedError = err);
      }


      if (qKey.length > 0) {
        requestQueryParams.push({
          key: qKey,
          value: qVal
        });
      }
    });

    if (urlMalformedError) {
      return callback(urlMalformedError);
    }

    // filter out query params added by security schemes
    securityParams = _.map(this.getSecurityParams(_.get(components, 'components'), 'query'), 'name');
    requestQueryParams = _.filter(requestQueryParams, (pQuery) => {
      return !_.includes(securityParams, pQuery.key);
    });

    // resolve schema params
    // below will make sure for exploded params actual schema of property present in collection is present
    _.forEach(schemaParams, (param) => {
      let pathPrefix = param.pathPrefix,
        paramSchema = deref.resolveRefs(_.cloneDeep(param.schema), PARAMETER_SOURCE.REQUEST, components, {}),
        { style, explode } = this.getParamSerialisationInfo(param, PARAMETER_SOURCE.REQUEST, components),
        isPropSeparable = _.includes(['form', 'deepObject'], style);

      if (isPropSeparable && paramSchema.type === 'array' && explode) {
        /**
         * avoid validation of complex array type param as OAS doesn't define serialisation
         * of Array with deepObject style
         */
        if (!_.includes(['array', 'object'], _.get(paramSchema, 'items.type'))) {
          // add schema of corresponding items instead array
          resolvedSchemaParams.push(_.assign({}, param, {
            schema: _.get(paramSchema, 'items'),
            isResolvedParam: true
          }));
        }
      }
      else if (isPropSeparable && paramSchema.type === 'object' && explode) {
        // resolve all child params of parent param with deepObject style
        if (style === 'deepObject') {
          resolvedSchemaParams = _.concat(resolvedSchemaParams, this.extractChildParamSchema(paramSchema,
            param.name, { required: _.get(param, 'required'), pathPrefix, description: _.get(param, 'description') }));
        }
        else {
          // add schema of all properties instead entire object
          _.forEach(_.get(paramSchema, 'properties', {}), (propSchema, propName) => {
            resolvedSchemaParams.push({
              name: propName,
              schema: propSchema,
              required: _.get(param, 'required') || false,
              description: _.get(param, 'description'),
              isResolvedParam: true,
              pathPrefix
            });
          });
        }
      }
      else {
        resolvedSchemaParams.push(param);
      }
    });

    return async.map(requestQueryParams, (pQuery, cb) => {
      let mismatches = [],
        index = _.findIndex(requestQueryParams, pQuery),
        resolvedParamValue = pQuery.value;

      const schemaParam = _.find(resolvedSchemaParams, (param) => { return param.name === pQuery.key; });

      if (!schemaParam) {
        // skip validation of complex array params
        if (this.isParamComplexArray(pQuery.key)) {
          return cb(null, mismatches);
        }
        if (options.showMissingInSchemaErrors) {
          mismatches.push({
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix + `[${index}]`,
            schemaJsonPath: null,
            reasonCode: 'MISSING_IN_SCHEMA',
            reason: `The query parameter ${pQuery.key} was not found in the schema`
          });
        }
        return cb(null, mismatches);
      }

      // assign parameter example(s) as schema examples;
      this.assignParameterExamples(schemaParam);

      if (!schemaParam.isResolvedParam) {
        resolvedParamValue = this.deserialiseParamValue(schemaParam, pQuery.value, PARAMETER_SOURCE.REQUEST,
          components, schemaCache);
      }

      // query found in spec. check query's schema
      setTimeout(() => {
        if (!schemaParam.schema) {
          // no errors to show if there's no schema present in the spec
          return cb(null, []);
        }
        this.checkValueAgainstSchema(mismatchProperty,
          transactionPathPrefix + `[${index}].value`,
          pQuery.key,
          resolvedParamValue,
          schemaParam.pathPrefix + '[?(@.name==\'' + schemaParam.name + '\')]',
          schemaParam.schema,
          PARAMETER_SOURCE.REQUEST,
          components, options, schemaCache, jsonSchemaDialect, cb
        );
      }, 0);
    }, (err, res) => {
      let mismatches = [],
        mismatchObj;

      _.each(_.filter(resolvedSchemaParams, (q) => { return q.required; }), (qp) => {
        if (!_.find(requestQueryParams, (param) => {
          return param.key === qp.name;
        })) {

          // assign parameter example(s) as schema examples;
          this.assignParameterExamples(qp);

          mismatchObj = {
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix,
            schemaJsonPath: qp.pathPrefix + '[?(@.name==\'' + qp.name + '\')]',
            reasonCode: 'MISSING_IN_REQUEST',
            reason: `The required query parameter "${qp.name}" was not found in the transaction`
          };

          if (options.suggestAvailableFixes) {
            mismatchObj.suggestedFix = {
              key: qp.name,
              actualValue: null,
              suggestedValue: {
                key: qp.name,
                value: safeSchemaFaker(qp.schema || {}, 'example', PROCESSING_TYPE.VALIDATION,
                  PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options),
                description: this.getParameterDescription(qp)
              }
            };
          }
          mismatches.push(mismatchObj);
        }
      });
      return callback(null, _.concat(_.flatten(res), mismatches));
    });
  },

  /**
   * Gives mismtach for content type header for request/response
   *
   * @param {Array} headers - Transaction Headers
   * @param {String} transactionPathPrefix - Transaction Path to headers
   * @param {String} schemaPathPrefix - Schema path to content object
   * @param {Object} contentObj - Corresponding Schema content object
   * @param {String} mismatchProperty - Mismatch property (HEADER / RESPONSE_HEADER)
   * @param {*} options - OAS options, check lib/options.js for more
   * @returns {Array} found mismatch objects
   */
  checkContentTypeHeader: function (headers, transactionPathPrefix, schemaPathPrefix, contentObj,
    mismatchProperty, options) {
    let mediaTypes = [],
      contentHeader,
      contentHeaderIndex,
      contentHeaderMediaType,
      suggestedContentHeader,
      hasComputedType,
      humanPropName = mismatchProperty === 'HEADER' ? 'header' : 'response header',
      mismatches = [];

    // get all media types present in content object
    _.forEach(_.keys(contentObj), (contentType) => {
      let contentMediaType = this.parseMediaType(contentType);

      mediaTypes.push({
        type: contentMediaType.type,
        subtype: contentMediaType.subtype,
        contentType: contentMediaType.type + '/' + contentMediaType.subtype
      });
    });

    // prefer JSON > XML > Other media types for suggested header.
    _.forEach(mediaTypes, (mediaType) => {
      let headerFamily = this.getHeaderFamily(mediaType.contentType);

      if (headerFamily !== HEADER_TYPE.INVALID) {
        suggestedContentHeader = mediaType.contentType;
        hasComputedType = true;
        if (headerFamily === HEADER_TYPE.JSON) {
          return false;
        }
      }
    });

    // if no JSON or XML, take whatever we have
    if (!hasComputedType && mediaTypes.length > 0) {
      suggestedContentHeader = mediaTypes[0].contentType;
      hasComputedType = true;
    }

    // get content-type header and info
    _.forEach(headers, (header, index) => {
      if (_.toLower(header.key) === 'content-type') {
        let mediaType = this.parseMediaType(header.value);

        contentHeader = header;
        contentHeaderIndex = index;
        contentHeaderMediaType = mediaType.type + '/' + mediaType.subtype;
        return false;
      }
    });

    // Schema body content has no media type objects
    if (!_.isEmpty(contentHeader) && _.isEmpty(mediaTypes)) {
      // ignore mismatch for default header (text/plain) added by conversion
      if (options.showMissingInSchemaErrors && _.toLower(contentHeaderMediaType) !== TEXT_PLAIN) {
        mismatches.push({
          property: mismatchProperty,
          transactionJsonPath: transactionPathPrefix + `[${contentHeaderIndex}]`,
          schemaJsonPath: null,
          reasonCode: 'MISSING_IN_SCHEMA',
          // Reason for missing in schema suggests that certain media type in req/res body is not present
          reason: `The ${mismatchProperty === 'HEADER' ? 'request' : 'response'} body should have media type` +
            ` "${contentHeaderMediaType}"`
        });
      }
    }

    // No request/response content-type header
    else if (_.isEmpty(contentHeader) && !_.isEmpty(mediaTypes)) {
      let mismatchObj = {
        property: mismatchProperty,
        transactionJsonPath: transactionPathPrefix,
        schemaJsonPath: schemaPathPrefix,
        reasonCode: 'MISSING_IN_REQUEST',
        reason: `The ${humanPropName} "Content-Type" was not found in the transaction`
      };

      if (options.suggestAvailableFixes) {
        mismatchObj.suggestedFix = {
          key: 'Content-Type',
          actualValue: null,
          suggestedValue: {
            key: 'Content-Type',
            value: suggestedContentHeader
          }
        };
      }
      mismatches.push(mismatchObj);
    }

    // Invalid type of header found
    else if (!_.isEmpty(contentHeader)) {
      let mismatchObj,
        matched = false;

      // wildcard header matching
      _.forEach(mediaTypes, (mediaType) => {
        let transactionHeader = _.split(contentHeaderMediaType, '/'),
          headerTypeMatched = (mediaType.type === '*' || mediaType.type === transactionHeader[0]),
          headerSubtypeMatched = (mediaType.subtype === '*' || mediaType.subtype === transactionHeader[1]);

        if (headerTypeMatched && headerSubtypeMatched) {
          matched = true;
        }
      });

      if (!matched) {
        mismatchObj = {
          property: mismatchProperty,
          transactionJsonPath: transactionPathPrefix + `[${contentHeaderIndex}].value`,
          schemaJsonPath: schemaPathPrefix,
          reasonCode: 'INVALID_TYPE',
          reason: `The ${humanPropName} "Content-Type" needs to be "${suggestedContentHeader}",` +
            ` but we found "${contentHeaderMediaType}" instead`
        };

        if (options.suggestAvailableFixes) {
          mismatchObj.suggestedFix = {
            key: 'Content-Type',
            actualValue: contentHeader.value,
            suggestedValue: suggestedContentHeader
          };
        }
        mismatches.push(mismatchObj);
      }
    }
    return mismatches;
  },

  checkRequestHeaders: function (headers, transactionPathPrefix, schemaPathPrefix, schemaPath,
    components, options, schemaCache, jsonSchemaDialect, callback) {
    let schemaHeaders = _.filter(schemaPath.parameters, (param) => { return param.in === 'header'; }),
      // key name of headers which are added by security schemes
      securityHeaders = _.map(this.getSecurityParams(_.get(components, 'components'), 'header'), 'name'),
      // filter out headers for following cases
      reqHeaders = _.filter(headers, (header) => {
        // 1. which need explicit handling according to schema (other than parameters object)
        // 2. which are added by security schemes
        return !_.includes(IMPLICIT_HEADERS, _.toLower(_.get(header, 'key'))) &&
          !_.includes(securityHeaders, header.key);
      }),
      mismatchProperty = 'HEADER';

    if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
      return callback(null, []);
    }
    // 1. for each header, find relevant schemaPath property

    return async.map(reqHeaders, (pHeader, cb) => {
      let mismatches = [],
        resolvedParamValue,
        index = _.findIndex(headers, pHeader); // find actual index from collection request headers

      const schemaHeader = _.find(schemaHeaders, (header) => { return header.name === pHeader.key; });

      if (!schemaHeader) {
        // no schema header found
        if (options.showMissingInSchemaErrors) {
          mismatches.push({
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix + `[${index}]`,
            schemaJsonPath: null,
            reasonCode: 'MISSING_IN_SCHEMA',
            reason: `The header ${pHeader.key} was not found in the schema`
          });
        }
        return cb(null, mismatches);
      }

      // assign parameter example(s) as schema examples;
      this.assignParameterExamples(schemaHeader);

      resolvedParamValue = this.deserialiseParamValue(schemaHeader, pHeader.value, PARAMETER_SOURCE.REQUEST,
        components, schemaCache);

      // header found in spec. check header's schema
      setTimeout(() => {
        if (!schemaHeader.schema) {
          // no errors to show if there's no schema present in the spec
          return cb(null, []);
        }
        this.checkValueAgainstSchema(mismatchProperty,
          transactionPathPrefix + `[${index}].value`,
          pHeader.key,
          resolvedParamValue,
          schemaHeader.pathPrefix + '[?(@.name==\'' + schemaHeader.name + '\')]',
          schemaHeader.schema,
          PARAMETER_SOURCE.REQUEST,
          components, options, schemaCache, jsonSchemaDialect, cb
        );
      }, 0);
    }, (err, res) => {
      let mismatches = [],
        mismatchObj,
        reqBody = _.get(schemaPath, 'requestBody'),
        contentHeaderMismatches = [];

      // resolve $ref in request body if present
      if (reqBody) {
        if (_.has(reqBody, '$ref')) {
          reqBody = this.getRefObject(reqBody.$ref, components, options);
        }

        contentHeaderMismatches = this.checkContentTypeHeader(headers, transactionPathPrefix,
          schemaPathPrefix + '.requestBody.content', _.get(reqBody, 'content'),
          mismatchProperty, options);
      }
      _.each(_.filter(schemaHeaders, (h) => {
        // exclude non-required and implicit header from further validation
        return h.required && !_.includes(IMPLICIT_HEADERS, _.toLower(h.name));
      }), (header) => {
        if (!_.find(reqHeaders, (param) => { return param.key === header.name; })) {

          // assign parameter example(s) as schema examples;
          this.assignParameterExamples(header);

          mismatchObj = {
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix,
            schemaJsonPath: header.pathPrefix + '[?(@.name==\'' + header.name + '\')]',
            reasonCode: 'MISSING_IN_REQUEST',
            reason: `The required header "${header.name}" was not found in the transaction`
          };

          if (options.suggestAvailableFixes) {
            mismatchObj.suggestedFix = {
              key: header.name,
              actualValue: null,
              suggestedValue: {
                key: header.name,
                value: safeSchemaFaker(header.schema || {}, 'example', PROCESSING_TYPE.VALIDATION,
                  PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options),
                description: this.getParameterDescription(header)
              }
            };
          }
          mismatches.push(mismatchObj);
        }
      });
      return callback(null, _.concat(contentHeaderMismatches, _.flatten(res), mismatches));
    });
  },

  checkResponseHeaders: function (schemaResponse, headers, transactionPathPrefix, schemaPathPrefix,
    components, options, schemaCache, jsonSchemaDialect, callback) {
    // 0. Need to find relevant response from schemaPath.responses
    let schemaHeaders,
      // filter out headers which need explicit handling according to schema (other than parameters object)
      resHeaders = _.filter(headers, (header) => {
        return !_.includes(IMPLICIT_HEADERS, _.toLower(_.get(header, 'key')));
      }),
      mismatchProperty = 'RESPONSE_HEADER';

    if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
      return callback(null, []);
    }

    if (!schemaResponse) {
      // no default response found, we can't call it a mismatch
      return callback(null, []);
    }

    schemaHeaders = schemaResponse.headers;

    return async.map(resHeaders, (pHeader, cb) => {
      let mismatches = [],
        index = _.findIndex(headers, pHeader); // find actual index from collection response headers

      const schemaHeader = _.get(schemaHeaders, pHeader.key);

      if (!schemaHeader) {
        // no schema header found
        if (options.showMissingInSchemaErrors) {
          mismatches.push({
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix + `[${index}]`,
            schemaJsonPath: schemaPathPrefix + '.headers',
            reasonCode: 'MISSING_IN_SCHEMA',
            reason: `The header ${pHeader.key} was not found in the schema`
          });
        }
        return cb(null, mismatches);
      }

      // assign parameter example(s) as schema examples;
      this.assignParameterExamples(schemaHeader);

      // header found in spec. check header's schema
      setTimeout(() => {
        if (!schemaHeader.schema) {
          // no errors to show if there's no schema present in the spec
          return cb(null, []);
        }
        return this.checkValueAgainstSchema(mismatchProperty,
          transactionPathPrefix + `[${index}].value`,
          pHeader.key,
          pHeader.value,
          schemaPathPrefix + '.headers[' + pHeader.key + ']',
          schemaHeader.schema,
          PARAMETER_SOURCE.RESPONSE,
          components, options, schemaCache, jsonSchemaDialect, cb
        );
      }, 0);
    }, (err, res) => {
      let mismatches = [],
        mismatchObj,
        contentHeaderMismatches = this.checkContentTypeHeader(headers, transactionPathPrefix,
          schemaPathPrefix + '.content', _.get(schemaResponse, 'content'), mismatchProperty, options);

      _.each(_.filter(schemaHeaders, (h, hName) => {
        // exclude empty headers fron validation
        if (_.isEmpty(h)) {
          return false;
        }
        h.name = hName;
        // exclude non-required and implicit header from further validation
        return h.required && !_.includes(IMPLICIT_HEADERS, _.toLower(hName));
      }), (header) => {
        if (!_.find(resHeaders, (param) => { return param.key === header.name; })) {

          // assign parameter example(s) as schema examples;
          this.assignParameterExamples(header);

          mismatchObj = {
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix,
            schemaJsonPath: schemaPathPrefix + '.headers[\'' + header.name + '\']',
            reasonCode: 'MISSING_IN_REQUEST',
            reason: `The required response header "${header.name}" was not found in the transaction`
          };

          if (options.suggestAvailableFixes) {
            mismatchObj.suggestedFix = {
              key: header.name,
              actualValue: null,
              suggestedValue: {
                key: header.name,
                value: safeSchemaFaker(header.schema || {}, 'example', PROCESSING_TYPE.VALIDATION,
                  PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options),
                description: this.getParameterDescription(header)
              }
            };
          }
          mismatches.push(mismatchObj);
        }
      });
      callback(null, _.concat(contentHeaderMismatches, _.flatten(res), mismatches));
    });
  },

  // Only application/json and application/x-www-form-urlencoded is validated for now
  checkRequestBody: function (requestBody, transactionPathPrefix, schemaPathPrefix, schemaPath,
    components, options, schemaCache, jsonSchemaDialect, callback) {
    // check for body modes
    let jsonSchemaBody,
      jsonContentType,
      mismatchProperty = 'BODY';

    if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
      return callback(null, []);
    }

    // resolve $ref in requestBody object if present
    if (!_.isEmpty(_.get(schemaPath, 'requestBody.$ref'))) {
      schemaPath.requestBody = this.getRefObject(schemaPath.requestBody.$ref, components, options);
    }

    // get valid json content type
    jsonContentType = this.getJsonContentType(_.get(schemaPath, 'requestBody.content', {}));
    jsonSchemaBody = _.get(schemaPath, ['requestBody', 'content', jsonContentType, 'schema']);

    if (requestBody && requestBody.mode === 'raw' && jsonSchemaBody) {
      setTimeout(() => {
        return this.checkValueAgainstSchema(mismatchProperty,
          transactionPathPrefix,
          null, // no param name for the request body
          requestBody.raw,
          schemaPathPrefix + '.requestBody.content[' + jsonContentType + '].schema',
          jsonSchemaBody,
          PARAMETER_SOURCE.REQUEST,
          components,
          _.extend({}, options, { shortValidationErrors: true }),
          schemaCache,
          jsonSchemaDialect,
          callback
        );
      }, 0);
    }
    else if (requestBody && requestBody.mode === 'urlencoded') {
      let urlencodedBodySchema = _.get(schemaPath, ['requestBody', 'content', URLENCODED, 'schema']),
        resolvedSchemaParams = [],
        pathPrefix = `${schemaPathPrefix}.requestBody.content[${URLENCODED}].schema`;

      urlencodedBodySchema = deref.resolveRefs(urlencodedBodySchema, PARAMETER_SOURCE.REQUEST, components, {
        resolveFor: PROCESSING_TYPE.VALIDATION,
        stackLimit: options.stackLimit
      });

      // resolve each property as separate param similar to query parmas
      _.forEach(_.get(urlencodedBodySchema, 'properties'), (propSchema, propName) => {
        let resolvedProp = {
            name: propName,
            schema: propSchema,
            in: 'query', // serialization follows same behaviour as query params
            description: _.get(propSchema, 'description') || ''
          },
          encodingValue = _.get(schemaPath, ['requestBody', 'content', URLENCODED, 'encoding', propName]),
          pSerialisationInfo,
          isPropSeparable;

        if (_.isObject(encodingValue)) {
          _.has(encodingValue, 'style') && (resolvedProp.style = encodingValue.style);
          _.has(encodingValue, 'explode') && (resolvedProp.explode = encodingValue.explode);
        }

        if (_.includes(_.get(urlencodedBodySchema, 'required'), propName)) {
          resolvedProp.required = true;
        }

        pSerialisationInfo = this.getParamSerialisationInfo(resolvedProp, PARAMETER_SOURCE.REQUEST,
          components);
        isPropSeparable = _.includes(['form', 'deepObject'], pSerialisationInfo.style);

        if (isPropSeparable && propSchema.type === 'array' && pSerialisationInfo.explode) {
          /**
           * avoid validation of complex array type param as OAS doesn't define serialisation
           * of Array with deepObject style
           */
          if (!_.includes(['array', 'object'], _.get(propSchema, 'items.type'))) {
            // add schema of corresponding items instead array
            resolvedSchemaParams.push(_.assign({}, resolvedProp, {
              schema: _.get(propSchema, 'items'),
              isResolvedParam: true
            }));
          }
        }
        else if (isPropSeparable && propSchema.type === 'object' && pSerialisationInfo.explode) {
          // resolve all child params of parent param with deepObject style
          if (pSerialisationInfo.style === 'deepObject') {
            resolvedSchemaParams = _.concat(resolvedSchemaParams, this.extractChildParamSchema(propSchema,
              propName, { required: resolvedProp.required || false, description: resolvedProp.description }));
          }
          else {
            // add schema of all properties instead entire object
            _.forEach(_.get(propSchema, 'properties', {}), (value, key) => {
              resolvedSchemaParams.push({
                name: key,
                schema: value,
                isResolvedParam: true,
                required: resolvedProp.required || false,
                description: resolvedProp.description
              });
            });
          }
        }
        else {
          resolvedSchemaParams.push(resolvedProp);
        }
      });

      return async.map(requestBody.urlencoded, (uParam, cb) => {
        let mismatches = [],
          index = _.findIndex(requestBody.urlencoded, uParam),
          resolvedParamValue = uParam.value;

        const schemaParam = _.find(resolvedSchemaParams, (param) => { return param.name === uParam.key; });

        if (!schemaParam) {
          // skip validation of complex array params
          if (this.isParamComplexArray(uParam.key)) {
            return cb(null, mismatches);
          }
          if (options.showMissingInSchemaErrors) {
            mismatches.push({
              property: mismatchProperty,
              transactionJsonPath: transactionPathPrefix + `.urlencoded[${index}]`,
              schemaJsonPath: null,
              reasonCode: 'MISSING_IN_SCHEMA',
              reason: `The Url Encoded body param "${uParam.key}" was not found in the schema`
            });
          }
          return cb(null, mismatches);
        }

        if (!schemaParam.isResolvedParam) {
          resolvedParamValue = this.deserialiseParamValue(schemaParam, uParam.value, PARAMETER_SOURCE.REQUEST,
            components, schemaCache);
        }
        // store value of transaction to use in mismatch object
        schemaParam.actualValue = uParam.value;

        // param found in spec. check param's schema
        setTimeout(() => {
          if (!schemaParam.schema) {
            // no errors to show if there's no schema present in the spec
            return cb(null, []);
          }
          this.checkValueAgainstSchema(mismatchProperty,
            transactionPathPrefix + `.urlencoded[${index}].value`,
            uParam.key,
            resolvedParamValue,
            pathPrefix + '.properties[' + schemaParam.name + ']',
            schemaParam.schema,
            PARAMETER_SOURCE.REQUEST,
            components, options, schemaCache, jsonSchemaDialect, cb
          );
        }, 0);
      }, (err, res) => {
        let mismatches = [],
          mismatchObj,
          // fetches property name from schem path
          getPropNameFromSchemPath = (schemaPath) => {
            let regex = /\.properties\[(.+)\]/gm;
            return _.last(regex.exec(schemaPath));
          };

        // update actual value and suggested value from JSON to serialized strings
        _.forEach(_.flatten(res), (mismatchObj) => {
          if (!_.isEmpty(mismatchObj)) {
            let propertyName = getPropNameFromSchemPath(mismatchObj.schemaJsonPath),
              schemaParam = _.find(resolvedSchemaParams, (param) => { return param.name === propertyName; }),
              serializedParamValue;

            if (schemaParam) {
              // serialize param value (to be used in suggested value)
              serializedParamValue = _.get(this.convertParamsWithStyle(schemaParam, _.get(mismatchObj,
                'suggestedFix.suggestedValue'), PARAMETER_SOURCE.REQUEST, components, schemaCache, options),
              '[0].value');
              _.set(mismatchObj, 'suggestedFix.actualValue', schemaParam.actualValue);
              _.set(mismatchObj, 'suggestedFix.suggestedValue', serializedParamValue);
            }
          }
        });

        _.each(resolvedSchemaParams, (uParam) => {
          // report mismatches only for required properties
          if (!_.find(requestBody.urlencoded, (param) => { return param.key === uParam.name; }) && uParam.required) {
            mismatchObj = {
              property: mismatchProperty,
              transactionJsonPath: transactionPathPrefix + '.urlencoded',
              schemaJsonPath: pathPrefix + '.properties[' + uParam.name + ']',
              reasonCode: 'MISSING_IN_REQUEST',
              reason: `The Url Encoded body param "${uParam.name}" was not found in the transaction`
            };

            if (options.suggestAvailableFixes) {
              mismatchObj.suggestedFix = {
                key: uParam.name,
                actualValue: null,
                suggestedValue: {
                  key: uParam.name,
                  value: safeSchemaFaker(uParam.schema || {}, 'example', PROCESSING_TYPE.VALIDATION,
                    PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache, options),
                  description: this.getParameterDescription(uParam)
                }
              };
            }
            mismatches.push(mismatchObj);
          }
        });
        return callback(null, _.concat(_.flatten(res), mismatches));
      });
    }
    else {
      return callback(null, []);
    }
  },

  checkResponseBody: function (schemaResponse, body, transactionPathPrefix, schemaPathPrefix,
    components, options, schemaCache, jsonSchemaDialect, callback) {
    let schemaContent,
      jsonContentType,
      mismatchProperty = 'RESPONSE_BODY';

    if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
      return callback(null, []);
    }

    // get valid json content type
    jsonContentType = this.getJsonContentType(_.get(schemaResponse, 'content', {}));
    schemaContent = _.get(schemaResponse, ['content', jsonContentType, 'schema']);

    if (!schemaContent) {
      // no specific or default response with application/json
      // return callback(null, [{
      //   property: mismatchProperty,
      //   transactionJsonPath: transactionPathPrefix,
      //   schemaJsonPath: null,
      //   reasonCode: 'BODY_SCHEMA_NOT_FOUND',
      //   reason: 'No JSON schema found for this response'
      // }]);

      // cannot show mismatches if the schema didn't have any application/JSON response
      return callback(null, []);
    }

    setTimeout(() => {
      return this.checkValueAgainstSchema(mismatchProperty,
        transactionPathPrefix,
        null, // no param name for the response body
        body,
        schemaPathPrefix + '.content[' + jsonContentType + '].schema',
        schemaContent,
        PARAMETER_SOURCE.RESPONSE,
        components,
        _.extend({}, options, { shortValidationErrors: true }),
        schemaCache,
        jsonSchemaDialect,
        callback
      );
    }, 0);
  },

  checkResponses: function (responses, transactionPathPrefix, schemaPathPrefix, schemaPath,
    components, options, schemaCache, jsonSchemaDialect, cb) {
    // responses is an array of repsonses recd. for one Postman request
    // we've already determined the schemaPath against which all responses need to be validated
    // loop through all responses
    // for each response, find the appropriate response from schemaPath, and then validate response body and headers
    async.map(responses, (response, responseCallback) => {
      let thisResponseCode = response.code,
        thisSchemaResponse = _.get(schemaPath, ['responses', thisResponseCode]),
        responsePathPrefix = thisResponseCode;
      // find this code from the schemaPath
      if (!thisSchemaResponse) {
        // could not find an appropriate response for this code. check default?
        thisSchemaResponse = _.get(schemaPath, ['responses', 'default']);
        responsePathPrefix = 'default';
      }

      // resolve $ref in response object if present
      if (!_.isEmpty(_.get(thisSchemaResponse, '$ref'))) {
        thisSchemaResponse = this.getRefObject(thisSchemaResponse.$ref, components, options);
      }

      // resolve $ref in all header objects if present
      _.forEach(_.get(thisSchemaResponse, 'headers'), (header) => {
        if (_.has(header, '$ref')) {
          _.assign(header, this.getRefObject(header.$ref, components, options));
          _.unset(header, '$ref');
        }
      });

      if (!thisSchemaResponse) {
        // still didn't find a response
        responseCallback(null);
      }
      else {
        // check headers and body
        async.parallel({
          headers: (cb) => {
            this.checkResponseHeaders(thisSchemaResponse, response.header,
              transactionPathPrefix + '[' + response.id + '].header',
              schemaPathPrefix + '.responses.' + responsePathPrefix,
              components, options, schemaCache, jsonSchemaDialect, cb);
          },
          body: (cb) => {
            // assume it's JSON at this point
            this.checkResponseBody(thisSchemaResponse, response.body,
              transactionPathPrefix + '[' + response.id + '].body',
              schemaPathPrefix + '.responses.' + responsePathPrefix,
              components, options, schemaCache, jsonSchemaDialect, cb);
          }
        }, (err, result) => {
          return responseCallback(null, {
            id: response.id,
            matched: (result.body.length === 0 && result.headers.length === 0),
            mismatches: result.body.concat(result.headers)
          });
        });
      }
    }, (err, result) => {
      var retVal = _.keyBy(_.reject(result, (ai) => { return !ai; }), 'id');
      return cb(null, retVal);
    });
  },

  /**
   * Takes in the postman path and the schema path
   * takes from the path the number of segments present in the schema path
   * and returns the last segments from the path to match in an string format
   *
   * @param {string} pathToMatch - parsed path (exclude host and params) from the Postman request
   * @param {string} schemaPath - schema path from the OAS spec (exclude servers object)
   * @returns {string} only the selected segments from the pathToMatch
   */
  handleExplicitServersPathToMatch: function (pathToMatch, schemaPath) {
    let pathTMatchSlice,
      schemaPathArr = _.reject(schemaPath.split('/'), (segment) => {
        return segment === '';
      }),
      schemaPathSegments = schemaPathArr.length,
      pathToMatchArr = _.reject(pathToMatch.split('/'), (segment) => {
        return segment === '';
      }),
      pathToMatchSegments = pathToMatchArr.length;
    if (pathToMatchSegments < schemaPathSegments) {
      return pathToMatch;
    }
    pathTMatchSlice = pathToMatchArr.slice(pathToMatchArr.length - schemaPathSegments, pathToMatchArr.length);
    return pathTMatchSlice.join('/');
  },

  /**
   * @param {string} postmanPath - parsed path (exclude host and params) from the Postman request
   * @param {string} schemaPath - schema path from the OAS spec (exclude servers object)
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {*} score + match + pathVars - higher score - better match. null - no match
   */
  getPostmanUrlSchemaMatchScore: function (postmanPath, schemaPath, options) {
    var postmanPathArr = _.reject(postmanPath.split('/'), (segment) => {
        return segment === '';
      }),
      schemaPathArr = _.reject(schemaPath.split('/'), (segment) => {
        return segment === '';
      }),
      matchedPathVars = null,
      maxScoreFound = -Infinity,
      anyMatchFound = false,
      fixedMatchedSegments,
      variableMatchedSegments,
      postmanPathSuffixes = [];

    // get array with all suffixes of postmanPath
    // if postmanPath = {{url}}/a/b, the suffix array is [ [{{url}}, a, b] , [a, b] , [b]]
    for (let i = postmanPathArr.length; i > 0; i--) {
      // i will be 3, 2, 1
      postmanPathSuffixes.push(postmanPathArr.slice(-i));

      break; // we only want one item in the suffixes array for now
    }

    // for each suffx, calculate score against the schemaPath
    // the schema<>postman score is the sum
    _.each(postmanPathSuffixes, (pps) => {
      let suffixMatchResult = this.getPostmanUrlSuffixSchemaScore(pps, schemaPathArr, options);
      if (suffixMatchResult.match && suffixMatchResult.score > maxScoreFound) {
        maxScoreFound = suffixMatchResult.score;
        matchedPathVars = suffixMatchResult.pathVars;
        // No. of fixed segment matches between schema and postman url path
        fixedMatchedSegments = suffixMatchResult.fixedMatchedSegments;
        // No. of variable segment matches between schema and postman url path
        variableMatchedSegments = suffixMatchResult.variableMatchedSegments;
        anyMatchFound = true;
      }
    });

    // handle root path '/'
    if (postmanPath === '/' && schemaPath === '/') {
      anyMatchFound = true;
      maxScoreFound = 1; // assign max possible score
      matchedPathVars = []; // no path variables present
      fixedMatchedSegments = 0;
      variableMatchedSegments = 0;
    }

    if (anyMatchFound) {
      return {
        match: true,
        score: maxScoreFound,
        pathVars: matchedPathVars,
        fixedMatchedSegments,
        variableMatchedSegments
      };
    }
    return {
      match: false
    };
  },

  /**
   * @param {*} pmSuffix - Collection request's path suffix array
   * @param {*} schemaPath - schema operation's path suffix array
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {*} score - null of no match, int for match. higher value indicates better match
   * You get points for the number of URL segments that match
   * You are penalized for the number of schemaPath segments that you skipped
   */
  getPostmanUrlSuffixSchemaScore: function (pmSuffix, schemaPath, options) {
    let mismatchFound = false,
      variables = [],
      minLength = Math.min(pmSuffix.length, schemaPath.length),
      sMax = schemaPath.length - 1,
      pMax = pmSuffix.length - 1,
      matchedSegments = 0,
      // No. of fixed segment matches between schema and postman url path
      fixedMatchedSegments = 0,
      // No. of variable segment matches between schema and postman url path
      variableMatchedSegments = 0,
      // checks if schema segment provided is path variable
      isSchemaSegmentPathVar = (segment) => {
        return segment.startsWith('{') &&
        segment.endsWith('}') &&
        // check that only one path variable is present as collection path variable can contain only one var
        segment.indexOf('}') === segment.lastIndexOf('}');
      };

    if (options.strictRequestMatching && pmSuffix.length !== schemaPath.length) {
      return {
        match: false,
        score: null,
        pathVars: []
      };
    }

    // start from the last segment of both
    // segments match if the schemaPath segment is {..} or the postmanPathStr is :<anything> or {{anything}}
    // for (let i = pmSuffix.length - 1; i >= 0; i--) {
    for (let i = 0; i < minLength; i++) {
      let schemaFixedParts = this.getFixedPartsFromPathSegment(schemaPath[sMax - i], 'schema'),
        collectionFixedParts = this.getFixedPartsFromPathSegment(pmSuffix[pMax - i], 'collection');

      if (
        (_.isEqual(schemaFixedParts, collectionFixedParts)) || // exact fixed parts match
        (isSchemaSegmentPathVar(schemaPath[sMax - i])) || // schema segment is a pathVar
        (pmSuffix[pMax - i].startsWith(':')) || // postman segment is a pathVar
        (this.isPmVariable(pmSuffix[pMax - i])) // postman segment is an env/collection var
      ) {

        // for variable match increase variable matched segments count (used for determining order for multiple matches)
        if (
          (isSchemaSegmentPathVar(schemaPath[sMax - i])) && // schema segment is a pathVar
          ((pmSuffix[pMax - i].startsWith(':')) || // postman segment is a pathVar
            (this.isPmVariable(pmSuffix[pMax - i]))) // postman segment is an env/collection var
        ) {
          variableMatchedSegments++;
        }
        // for exact match increase fix matched segments count (used for determining order for multiple matches)
        else if (_.isEqual(schemaFixedParts, collectionFixedParts)) {
          fixedMatchedSegments++;
        }

        // add a matched path variable only if the schema one was a pathVar and only one path variable is in segment
        if (isSchemaSegmentPathVar(schemaPath[sMax - i])) {
          variables.push({
            key: schemaPath[sMax - i].substring(1, schemaPath[sMax - i].length - 1),
            value: pmSuffix[pMax - i]
          });
        }
        matchedSegments++;
      }
      else {
        // there was one segment for which there was no mismatch
        mismatchFound = true;
        break;
      }
    }

    if (!mismatchFound) {
      return {
        match: true,
        // schemaPath endsWith postman path suffix
        // score is length of the postman path array + schema array - length difference
        // the assumption is that a longer path matching a longer path is a higher score, with
        // penalty for any length difference
        // schemaPath will always be > postmanPathSuffix because SchemaPath ands with pps
        score: ((2 * matchedSegments) / (schemaPath.length + pmSuffix.length)),
        fixedMatchedSegments,
        variableMatchedSegments,
        pathVars: _.reverse(variables) // keep index in order of left to right
      };
    }
    return {
      match: false,
      score: null,
      pathVars: []
    };
  },

  /**
   * This function extracts suggested value from faked value at Ajv mismatch path (dataPath)
   *
   * @param {*} fakedValue Faked value by jsf
   * @param {*} actualValue Actual value in transaction
   * @param {*} ajvValidationErrorObj Ajv error for which fix is suggested
   * @returns {*} Suggested Value
   */
  getSuggestedValue: function (fakedValue, actualValue, ajvValidationErrorObj) {
    var suggestedValue,
      tempSuggestedValue,
      dataPath = formatDataPath(ajvValidationErrorObj.instancePath || ''),
      targetActualValue,
      targetFakedValue;

    // discard the leading '.' if it exists
    if (dataPath[0] === '.') {
      dataPath = dataPath.slice(1);
    }

    targetActualValue = this.getPathValue(actualValue, dataPath, {});
    targetFakedValue = this.getPathValue(fakedValue, dataPath, {});

    switch (ajvValidationErrorObj.keyword) {

      // to do: check for minItems, maxItems

      case 'minProperties':
        suggestedValue = _.assign({}, targetActualValue,
          _.pick(targetFakedValue, _.difference(_.keys(targetFakedValue), _.keys(targetActualValue))));
        break;

      case 'maxProperties':
        suggestedValue = _.pick(targetActualValue, _.intersection(_.keys(targetActualValue), _.keys(targetFakedValue)));
        break;

      case 'required':
        suggestedValue = _.assign({}, targetActualValue,
          _.pick(targetFakedValue, ajvValidationErrorObj.params.missingProperty));
        break;

      case 'minItems':
        suggestedValue = _.concat(targetActualValue, _.slice(targetFakedValue, targetActualValue.length));
        break;

      case 'maxItems':
        suggestedValue = _.slice(targetActualValue, 0, ajvValidationErrorObj.params.limit);
        break;

      case 'uniqueItems':
        tempSuggestedValue = _.cloneDeep(targetActualValue);
        tempSuggestedValue[ajvValidationErrorObj.params.j] = _.last(targetFakedValue);
        suggestedValue = tempSuggestedValue;
        break;

      // Keywords: minLength, maxLength, format, minimum, maximum, type, multipleOf, pattern
      default:
        suggestedValue = this.getPathValue(fakedValue, dataPath, null);
        break;
    }

    return suggestedValue;
  },

  /**
   * @param {*} schema OpenAPI spec
   * @param {Array} matchedEndpoints - All matched endpoints
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {object} schemaCache - object storing schemaFaker and schmeResolution caches
   * @returns {Array} - Array of all MISSING_ENDPOINT objects
   */
  getMissingSchemaEndpoints: function (schema, matchedEndpoints, components, options, schemaCache) {
    let endpoints = [],
      schemaPaths = schema.paths,
      rootCollectionVariables,
      schemaJsonPath;

    // collection variables generated for resolving for baseUrl and variables
    rootCollectionVariables = this.convertToPmCollectionVariables(
      schema.baseUrlVariables,
      'baseUrl',
      schema.baseUrl
    );

    _.forEach(schemaPaths, (schemaPathObj, schemaPath) => {
      _.forEach(_.keys(schemaPathObj), (pathKey) => {
        schemaJsonPath = `$.paths[${schemaPath}].${_.toLower(pathKey)}`;
        let operationItem = _.get(schemaPathObj, pathKey) || {},
          shouldValidateDeprecated = shouldAddDeprecatedOperation(operationItem, options);
        if (METHODS.includes(pathKey) && !matchedEndpoints.includes(schemaJsonPath) &&
        shouldValidateDeprecated) {
          let mismatchObj = {
            property: 'ENDPOINT',
            transactionJsonPath: null,
            schemaJsonPath,
            reasonCode: 'MISSING_ENDPOINT',
            reason: `The endpoint "${_.toUpper(pathKey)} ${schemaPath}" is missing in collection`,
            endpoint: _.toUpper(pathKey) + ' ' + schemaPath
          };

          if (options.suggestAvailableFixes) {
            let operationItem = _.get(schemaPathObj, pathKey) || {},
              convertedRequest,
              variables = rootCollectionVariables,
              path = schemaPath,
              request;

            // add common parameters of path level
            operationItem.parameters = this.getRequestParams(operationItem.parameters,
              _.get(schemaPathObj, 'parameters'), components, options);

            // discard the leading slash, if it exists
            if (path[0] === '/') {
              path = path.substring(1);
            }

            // override root level collection variables (baseUrl and vars) with path level server url and vars if exists
            // storing common path/collection vars from the server object at the path item level
            if (!_.isEmpty(_.get(schemaPathObj, 'servers'))) {
              let pathLevelServers = schemaPathObj.servers;

              // add path level server object's URL as collection variable
              variables = this.convertToPmCollectionVariables(
                pathLevelServers[0].variables, // these are path variables in the server block
                this.fixPathVariableName(path), // the name of the variable
                this.fixPathVariablesInUrl(pathLevelServers[0].url)
              );
            }

            request = {
              name: operationItem.summary || operationItem.description,
              method: pathKey,
              path: schemaPath[0] === '/' ? schemaPath.substring(1) : schemaPath,
              properties: operationItem,
              type: 'item',
              servers: _.isEmpty(_.get(schemaPathObj, 'servers'))
            };

            // convert request to collection item and store collection variables
            convertedRequest = this.convertRequestToItem(schema, request, components, options, schemaCache, variables);

            mismatchObj.suggestedFix = {
              key: pathKey,
              actualValue: null,
              // Not adding colloection variables for now
              suggestedValue: {
                request: convertedRequest,
                variables: _.values(variables)
              }
            };
          }

          endpoints.push(mismatchObj);
        }
      });
    });
    return endpoints;
  },
  inputValidation,

  /**
   * Maps the input from detect root files to get root files
   * @param {object} input - input schema
   * @returns {Array} - Array of all MISSING_ENDPOINT objects
   */
  mapDetectRootFilesInputToGetRootFilesInput(input) {
    let adaptedData = input.data.map((file) => {
      return { fileName: file.fileName };
    });
    return { data: adaptedData };
  },

  /**
  * Maps the input from detect root files to get root files
  * @param {object} input - input schema
  * @returns {Array} - Array of all MISSING_ENDPOINT objects
  */
  mapDetectRootFilesInputToFolderInput(input) {
    let adaptedData = input.data.map((file) => {
      if (file.content) {
        return { fileName: file.path, content: file.content };
      }
      else {
        return { fileName: file.path };
      }
    });
    input.data = adaptedData;
    return input;
  },

  /**
   * Maps the output from get root files to detect root files
   * @param {object} output - output schema
   * @param {string} version - specified version of the process
   * @returns {object} - Detect root files result object
   */
  mapGetRootFilesOutputToDetectRootFilesOutput(output, version) {
    if (!version) {
      version = '3.0';
    }
    let adaptedData = output.map((file) => {
      return { path: file };
    });
    return {
      result: true,
      output: {
        type: 'rootFiles',
        specification: {
          type: 'OpenAPI',
          version: version
        },
        data: adaptedData
      }
    };
  },

  /**
   *
   * @description Takes in a the root files obtains the related files and
   * generates the result object
   * @param {object} parsedRootFiles - found parsed root files
   * @param {array} inputData - file data information [{path, content}]
   * @param {Array} origin - process origin (BROWSER or node)
   *
   * @returns {object} process result { rootFile, relatedFiles, missingRelatedFiles }
   */
  getRelatedFilesData(parsedRootFiles, inputData, origin) {
    const data = parsedRootFiles.map((root) => {
      let relatedData = getRelatedFiles(root, inputData, origin),
        result = {
          rootFile: { path: root.fileName },
          relatedFiles: relatedData.relatedFiles,
          missingRelatedFiles: relatedData.missingRelatedFiles
        };
      return result;
    });
    return data;
  },

  /**
   * Maps the output for each bundled root file
   * @param {object} format - defined output format from options
   * @param {string} parsedRootFiles - The parsed root files
   * @param {string} version - specified version of the process
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {object} -  { rootFile: { path }, bundledContent }
   */
  mapBundleOutput(format, parsedRootFiles, version, options = {}) {
    return (contentAndComponents) => {
      let bundledFile = contentAndComponents.fileContent,
        bundleOutput;

      if (isSwagger(version)) {
        _.isObject(contentAndComponents.components) &&
          Object.entries(contentAndComponents.components).forEach(([key, value]) => {
            bundledFile[key] = value;
          });
      }
      else if (!_.isEmpty(contentAndComponents.components)) {
        bundledFile.components = contentAndComponents.components;
      }
      if (!format) {
        let rootFormat = parsedRootFiles.find((inputRoot) => {
          return inputRoot.fileName === contentAndComponents.fileName;
        }).parsed.inputFormat;
        if (rootFormat.toLowerCase() === parse.YAML_FORMAT) {
          bundledFile = parse.toYAML(bundledFile);
        }
        else if (rootFormat.toLowerCase() === parse.JSON_FORMAT) {
          bundledFile = parse.toJSON(bundledFile, null);
        }
      }
      else if (format.toLowerCase() === parse.YAML_FORMAT) {
        bundledFile = parse.toYAML(bundledFile);
      }
      else if (format.toLowerCase() === parse.JSON_FORMAT) {
        bundledFile = parse.toJSON(bundledFile, null);
      }

      bundleOutput = {
        rootFile: { path: contentAndComponents.fileName },
        bundledContent: bundledFile
      };

      if (options.includeReferenceMap) {
        bundleOutput.referenceMap = contentAndComponents.referenceMap;
      }
      return bundleOutput;
    };
  },

  /*
   * @description Takes in parsed root files and bundle it
   * @param {object} parsedRootFiles - found parsed root files
   * @param {array} inputData - file data information [{path, content}]
   * @param {Array} origin - process origin (BROWSER or node)
   * @param {string} format - output format could be either YAML or JSON
   * @param {string} version - specification version specified in the input
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   *
   * @returns {object} process result { rootFile, bundledContent }
   */
  async getBundledFileData(parsedRootFiles, inputData, origin, format, version, options = {}, remoteRefResolver) {
    const data = [];

    for (const file of parsedRootFiles) {
      let bundleDataFile = await getBundleContentAndComponents(file, inputData, origin, version, remoteRefResolver);

      data.push(bundleDataFile);
    }

    let bundleData = data.map(this.mapBundleOutput(format, parsedRootFiles, version, options));

    return bundleData;
  },

  /**
   *
   * @description Takes in root files, input data and origin process every root
   * to find related files
   * @param {object} rootFiles - rootFile:{path:string}
   * @param {array} inputData - [{path:string}]}
   * @param {string} origin -  process origin
   * @param {string} version -  process specification version
   * @param {string} format - the format required by the user
   * @param {boolean} toBundle - if it will be used in bundle
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @param {function} remoteRefResolver - The function that would be called to fetch remote ref contents
   *
   * @returns {object} root files information and data input
   */
  async mapProcessRelatedFiles(
    rootFiles, inputData, origin, version, format, toBundle = false, options = {}, remoteRefResolver
  ) {
    let bundleFormat = format,
      parsedRootFiles = rootFiles.map((rootFile) => {
        let parsedContent = parseFileOrThrow(rootFile.content);
        return { fileName: rootFile.fileName, content: rootFile.content, parsed: parsedContent };
      }).filter((rootWithParsedContent) => {
        let fileVersion = isSwagger(version) ?
          rootWithParsedContent.parsed.oasObject.swagger :
          rootWithParsedContent.parsed.oasObject.openapi;
        return compareVersion(version, fileVersion);
      }),
      data = toBundle ?
        await this.getBundledFileData(parsedRootFiles,
          inputData, origin, bundleFormat, version, options, remoteRefResolver) :
        this.getRelatedFilesData(parsedRootFiles, inputData, origin);

    return data;
  },

  /**
   *
   * @description Takes in a folder and identifies the related files from the
   * root file perspective (using $ref property)
   * @param {string} inputRelatedFiles - {rootFile:{path:string}, data: [{path:string}]}
   * @param {boolean} toBundle - if true it will return the bundle data
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   *
   * @returns {object} root files information and data input
   */
  async processRelatedFiles(inputRelatedFiles, toBundle = false, options = {}) {
    let version = inputRelatedFiles.specificationVersion ? inputRelatedFiles.specificationVersion : '3.0',
      res = {
        result: true,
        output: {
          type: toBundle ? 'bundledContent' : 'relatedFiles',
          specification: {
            type: 'OpenAPI',
            version: version
          },
          data: [
          ]
        }
      };
    if (inputRelatedFiles.rootFiles && inputRelatedFiles.rootFiles.length > 0) {
      try {
        res.output.data = await this.mapProcessRelatedFiles(inputRelatedFiles.rootFiles, inputRelatedFiles.data,
          inputRelatedFiles.origin, version,
          inputRelatedFiles.bundleFormat, toBundle, options, inputRelatedFiles.remoteRefResolver);
        if (res.output.data === undefined || res.output.data.result === false ||
          res.output.data.length === 0) {
          res.result = false;
        }
      }
      catch (error) {
        if (error instanceof ParseError) {
          throw (error);
        }
        let newError = new Error('There was an error during the process');
        newError.stack = error.stack;
        throw (newError);
      }
      return res;
    }
    else {
      throw new Error('Input should have at least one root file');
    }
  },

  /**
   *
   * @description Validates the input for multi file APIs
   * @param {string} processInput - Process input data
   *
   * @returns {undefined} - nothing
   */
  validateInputMultiFileAPI(processInput) {
    if (_.isEmpty(processInput)) {
      throw new Error('Input object must have "type" and "data" information');
    }
    if (!processInput.type) {
      throw new Error('"Type" parameter should be provided');
    }
    if (processInput.type !== MULTI_FILE_API_TYPE_ALLOWED_VALUE) {
      throw new Error('"Type" parameter value allowed is ' + MULTI_FILE_API_TYPE_ALLOWED_VALUE);
    }
    if (!processInput.data || processInput.data.length === 0) {
      throw new Error('"Data" parameter should be provided');
    }
    if (processInput.data[0].path === '') {
      throw new Error('"Path" of the data element should be provided');
    }
    if (processInput.specificationVersion && !validateSupportedVersion(processInput.specificationVersion)) {
      throw new Error(`The provided version "${processInput.specificationVersion}" is not valid`);
    }
  },
  MULTI_FILE_API_TYPE_ALLOWED_VALUE,

  verifyDeprecatedProperties: verifyDeprecatedProperties
};
