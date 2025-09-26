/* eslint-disable require-jsdoc */
// TODO: REMOVE THIS ☝🏻

const _ = require('lodash'),
  { Header } = require('postman-collection/lib/collection/header'),
  { QueryParam } = require('postman-collection/lib/collection/query-param'),
  { Url } = require('postman-collection/lib/collection/url'),
  { Variable } = require('postman-collection/lib/collection/variable'),
  async = require('async'),
  crypto = require('crypto'),
  schemaFaker = require('../assets/json-schema-faker.js'),
  xmlFaker = require('./xmlSchemaFaker.js'),
  utils = require('./utils'),
  {
    resolveSchema,
    resolveRefFromSchema,
    resolvePostmanRequest,
    resolveResponseForPostmanRequest
  } = require('./schemaUtils'),
  concreteUtils = require('../lib/30XUtils/schemaUtils30X'),

  ajvValidationError = require('../lib/ajValidation/ajvValidationError'),
  { validateSchema } = require('../lib/ajValidation/ajvValidation'),
  { formatDataPath, checkIsCorrectType, isKnownType,
    getServersPathVars } = require('../lib/common/schemaUtilsCommon.js'),

  { findMatchingRequestFromSchema, isPmVariable } = require('./requestMatchingUtils'),

  // common global constants
  SCHEMA_FORMATS = {
    DEFAULT: 'default', // used for non-request-body data and json
    XML: 'xml' // used for request-body XMLs
  },
  URLENCODED = 'application/x-www-form-urlencoded',
  TEXT_PLAIN = 'text/plain',
  PARAMETER_SOURCE = {
    REQUEST: 'REQUEST',
    RESPONSE: 'RESPONSE'
  },
  HEADER_TYPE = {
    JSON: 'json',
    XML: 'xml',
    INVALID: 'invalid'
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

  OAS_NOT_SUPPORTED = '<Error: Not supported in OAS>',

  /**
   * @sujay: this needs to be a better global level setting
   * before we start using the v2 validations everywhere.
   */
  VALIDATE_OPTIONAL_PARAMS = true;

// See https://github.com/json-schema-faker/json-schema-faker/tree/master/docs#available-options
schemaFaker.option({
  requiredOnly: false,
  optionalsProbability: 1.0, // always add optional fields
  maxLength: 256,
  minItems: 1, // for arrays
  maxItems: 20, // limit on maximum number of items faked for (type: array)
  useDefaultValue: true,
  ignoreMissingRefs: true,
  avoidExampleItemsLength: true, // option to avoid validating type array schema example's minItems and maxItems props.
  failOnInvalidFormat: false
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
 * Provides context that's needed for V2 resolveSchema() interface
 *
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
 * @param {object} components - components defined in the OAS spec. These are used to
 * resolve references while generating params
 * @returns {object} - Provides default context
 */
function getDefaultContext (options, components = {}) {
  return {
    concreteUtils,
    schemaCache: {},
    computedOptions: options,
    schemaValidationCache: new Map(),
    specComponents: { components: components.components }
  };
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

/**
 * Safe wrapper for schemaFaker that resolves references and
 * removes things that might make schemaFaker crash
 * @param {Object} context - Required context from related SchemaPack function
 * @param {*} oldSchema the schema to fake
 * generate a fake object, example: use specified examples as-is). Default: schema
 * @param {*} resolveFor - resolve refs for flow validation/conversion (value to be one of VALIDATION/CONVERSION)
 * @param {string} parameterSourceOption Specifies whether the schema being faked is from a request or response.
 * @param {*} components list of predefined components (with schemas)
 * @param {string} schemaFormat default or xml
 * @param {object} schemaCache - object storing schemaFaker and schemaResolution caches
 * @returns {object} fakedObject
 */
function safeSchemaFaker (context, oldSchema, resolveFor, parameterSourceOption, components,
  schemaFormat, schemaCache) {
  let prop, key, resolvedSchema, fakedSchema,
    schemaFakerCache = _.get(schemaCache, 'schemaFakerCache', {}),
    concreteUtils = context.concreteUtils;

  const options = context.computedOptions,
    resolveTo = _.get(options, 'parametersResolution', 'example'),
    indentCharacter = options.indentCharacter;

  /**
   * Schema is cloned here as resolveSchema() when called for CONVERSION use cases, will mutate schema in certain way.
   * i.e. For array it'll add maxItems = 2. This should be avoided as we'll again be needing non-mutated schema
   * in further VALIDATION use cases as needed.
   */
  resolvedSchema = resolveSchema(context, _.cloneDeep(oldSchema), {
    resolveFor: _.toLower(PROCESSING_TYPE.CONVERSION),
    isResponseSchema: parameterSourceOption === PARAMETER_SOURCE.RESPONSE
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
  }

  try {
    if (schemaFormat === SCHEMA_FORMATS.XML) {
      fakedSchema = xmlFaker(null, resolvedSchema, indentCharacter);
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

/** Separates out collection and path variables from the reqUrl
 *
 * @param {string} reqUrl Request Url
 * @param {Array} pathVars Path variables
 *
 * @returns {Object} reqUrl, updated path Variables array and collection Variables.
 */
function sanitizeUrlPathParams (reqUrl, pathVars) {
  var matches,
    collectionVars = [];

  // converts all the of the following:
  // /{{path}}/{{file}}.{{format}}/{{hello}} => /:path/{{file}}.{{format}}/:hello
  matches = utils.findPathVariablesFromPath(reqUrl);
  if (matches) {
    matches.forEach((match) => {
      const replaceWith = match.replace(/{{/g, ':').replace(/}}/g, '');
      reqUrl = reqUrl.replace(match, replaceWith);
    });
  }

  // Separates pathVars array and collectionVars.
  matches = utils.findCollectionVariablesFromPath(reqUrl);
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
}

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
function checkMetadata (transaction, transactionPathPrefix, schemaPath, pathRoute, options, callback) {
  let expectedReqName,
    reqNameMismatch,
    actualReqName = _.get(transaction, 'name'),
    trimmedReqName,
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
  reqUrl = utils.fixPathVariablesInUrl(pathRoute.slice(pathRoute.indexOf('/')));

  // convert all /{{one}}/{{two}} to /:one/:two
  // Doesn't touch /{{file}}.{{format}}
  reqUrl = sanitizeUrlPathParams(reqUrl, []).url;

  switch (options.requestNameSource) {
    case 'fallback' : {
      // operationId is usually camelcase or snake case
      expectedReqName = schemaPath.summary || utils.insertSpacesInName(schemaPath.operationId) ||
        schemaPath.description || reqUrl;
      expectedReqName = utils.trimRequestName(expectedReqName);
      reqNameMismatch = (trimmedReqName !== expectedReqName);
      break;
    }
    case 'url' : {
      // actual value may differ in conversion as it uses local/global servers info to generate it
      // for now suggest actual path as request name
      expectedReqName = reqUrl;
      expectedReqName = utils.trimRequestName(expectedReqName);
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
   * Note: Request Description validation/syncing is removed with v2 interface
   */
  return callback(null, mismatches);
}

/**
 * Given parameter objects, it assigns example/examples of parameter object as schema example.
 *
 * @param {Object} parameter - parameter object
 * @returns {null} - null
 */
function assignParameterExamples (parameter) {
  let example = _.get(parameter, 'example'),
    examples = _.values(_.get(parameter, 'examples'));

  if (example !== undefined) {
    _.set(parameter, 'schema.example', example);
  }
  else if (examples) {
    let exampleToUse = _.get(examples, '[0].value');

    !_.isUndefined(exampleToUse) && (_.set(parameter, 'schema.example', exampleToUse));
  }
}

/**
 * Gets the description of the parameter.
 * If the parameter is required, it prepends a `(Requried)` before the parameter description
 * If the parameter type is enum, it appends the possible enum values
 * @param {object} parameter - input param for which description needs to be returned
 * @returns {string} description of the parameters
 */
function getParameterDescription (parameter) {
  if (!_.isObject(parameter)) {
    return '';
  }
  return (parameter.required ? '(Required) ' : '') + (parameter.description || '') +
    (parameter.enum ? ' (This can only be one of ' + parameter.enum + ')' : '');
}

/**
 * Provides information regarding serialisation of param
 *
 * @param {*} param - OpenAPI Parameter object
 * @param {String} parameterSource - Specifies whether the schema being faked is from a request or response.
 * @param {Object} components - OpenAPI components defined in the OAS spec. These are used to
 *  resolve references while generating params.
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
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
function getParamSerialisationInfo (param, parameterSource, components, options) {
  var paramName = _.get(param, 'name'),
    paramSchema = resolveSchema(getDefaultContext(options, components), _.cloneDeep(param.schema), {
      resolveFor: PROCESSING_TYPE.VALIDATION,
      isResponseSchema: parameterSource === PARAMETER_SOURCE.RESPONSE
    }),
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
      // for 'form' when explode is true, query is divided into different key-value pairs
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
      // for 'deepObject' query is divided into different key-value pairs
      explode = true;
      break;
    default:
      break;
  }

  return { style, explode, startValue, propSeparator, keyValueSeparator, isExplodable };
}

/**
 * This function deserialises parameter value based on param schema
 *
 * @param {*} param - OpenAPI Parameter object
 * @param {String} paramValue - Parameter value to be deserialised
 * @param {String} parameterSource - Specifies whether the schema being faked is from a request or response.
 * @param {Object} components - OpenAPI components defined in the OAS spec. These are used to
 *  resolve references while generating params.
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
 * @param {Object} schemaCache - object storing schemaFaker and schemaResolution caches
 * @returns {*} - deserialises parameter value
 */
function deserialiseParamValue (param, paramValue, parameterSource, components, options) {
  var constructedValue,
    paramSchema = resolveSchema(getDefaultContext(options, components), _.cloneDeep(param.schema), {
      resolveFor: PROCESSING_TYPE.VALIDATION,
      isResponseSchema: parameterSource === PARAMETER_SOURCE.RESPONSE
    }),
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
    getParamSerialisationInfo(param, parameterSource, components, options);

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
}

/**
 * This function is little modified version of lodash _.get()
 * where if path is empty it will return source object instead undefined/fallback value
 *
 * @param {Object} sourceValue - source from where value is to be extracted
 * @param {String} dataPath - json path to value that is to be extracted
 * @param {*} fallback - fallback value if sourceValue doesn't contain value at dataPath
 * @returns {*} extracted value
 */
function getPathValue (sourceValue, dataPath, fallback) {
  return (dataPath === '' ? sourceValue : _.get(sourceValue, dataPath, fallback));
}

/**
 * This function extracts suggested value from faked value at Ajv mismatch path (dataPath)
 *
 * @param {*} fakedValue Faked value by jsf
 * @param {*} actualValue Actual value in transaction
 * @param {*} ajvValidationErrorObj Ajv error for which fix is suggested
 * @returns {*} Suggested Value
 */
function getSuggestedValue (fakedValue, actualValue, ajvValidationErrorObj) {
  var suggestedValue,
    tempSuggestedValue,
    dataPath = formatDataPath(ajvValidationErrorObj.instancePath || ''),
    targetActualValue,
    targetFakedValue;

  // discard the leading '.' if it exists
  if (dataPath[0] === '.') {
    dataPath = dataPath.slice(1);
  }

  targetActualValue = getPathValue(actualValue, dataPath, {});
  targetFakedValue = getPathValue(fakedValue, dataPath, {});

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
      suggestedValue = getPathValue(fakedValue, dataPath, null);
      break;
  }

  return suggestedValue;
}

/**
 * Tests whether given parameter is of complex array type from param key
 *
 * @param {*} paramKey - Parmaeter key that is to be tested
 * @returns {Boolean} - result
 */
function isParamComplexArray (paramKey) {
  // this checks if parameter key numbered element (i.e. itemArray[1] is complex array param)
  let regex = /\[[\d]+\]/gm;
  return regex.test(paramKey);
}

/**
 * Parses media type from given content-type header or media type
 * from content object into type and subtype
 *
 * @param {String} str - string to be parsed
 * @returns {Object} - Parsed media type into type and subtype
 */
function parseMediaType (str) {
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
}

/**
* Get the format of content type header
* @param {string} cTypeHeader - the content type header string
* @returns {string} type of content type header
*/
function getHeaderFamily (cTypeHeader) {
  let mediaType = parseMediaType(cTypeHeader);

  if (mediaType.type === 'application' &&
    (mediaType.subtype === 'json' || _.endsWith(mediaType.subtype, '+json'))) {
    return HEADER_TYPE.JSON;
  }
  if ((mediaType.type === 'application' || mediaType.type === 'text') &&
    (mediaType.subtype === 'xml' || _.endsWith(mediaType.subtype, '+xml'))) {
    return HEADER_TYPE.XML;
  }
  return HEADER_TYPE.INVALID;
}

/**
 * Finds valid JSON media type object from content object
 *
 * @param {*} contentObj - Content Object from schema
 * @returns {*} - valid JSON media type if exists
 */
function getJsonContentType (contentObj) {
  let jsonContentType = _.find(_.keys(contentObj), (contentType) => {
    let mediaType = parseMediaType(contentType);

    return mediaType.type === 'application' && (
      mediaType.subtype === 'json' || _.endsWith(mediaType.subtype, '+json')
    );
  });

  return jsonContentType;
}

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
function checkContentTypeHeader (headers, transactionPathPrefix, schemaPathPrefix, contentObj,
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
    let contentMediaType = parseMediaType(contentType);

    mediaTypes.push({
      type: contentMediaType.type,
      subtype: contentMediaType.subtype,
      contentType: contentMediaType.type + '/' + contentMediaType.subtype
    });
  });

  // prefer JSON > XML > Other media types for suggested header.
  _.forEach(mediaTypes, (mediaType) => {
    let headerFamily = getHeaderFamily(mediaType.contentType);

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
      let mediaType = parseMediaType(header.value);

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
}

/**
 * Generates appropriate collection element based on parameter location
 *
 * @param {Object} param - Parameter object habing key, value and description (optional)
 * @param {String} location - Parameter location ("in" property of OAS defined parameter object)
 * @returns {Object} - SDK element
 */
function generateSdkParam (param, location) {
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
}

/**
 * Recursively extracts key-value pair from deep objects.
 *
 * @param {*} deepObject - Deep object
 * @param {*} objectKey - key associated with deep object
 * @returns {Array} array of param key-value pairs
 */
function extractDeepObjectParams (deepObject, objectKey) {
  let extractedParams = [];

  Object.keys(deepObject).forEach((key) => {
    let value = deepObject[key];
    if (value && typeof value === 'object') {
      extractedParams = _.concat(extractedParams, extractDeepObjectParams(value, objectKey + '[' + key + ']'));
    }
    else {
      extractedParams.push({ key: objectKey + '[' + key + ']', value });
    }
  });
  return extractedParams;
}

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
 * @param {object} schemaCache - object storing schemaFaker and schemaResolution caches
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
 * @returns {array} parameters. One param with type=array might lead to multiple params
 * in the return value
 * The styles are documented at
 * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#style-values
 */
function convertParamsWithStyle (param, paramValue, parameterSource, components, schemaCache, options) {
  var paramName = _.get(param, 'name'),
    pmParams = [],
    serialisedValue = '',
    description = getParameterDescription(param),
    disabled = false;

  // for invalid param object return null
  if (!_.isObject(param)) {
    return null;
  }

  let { style, explode, startValue, propSeparator, keyValueSeparator, isExplodable } =
    getParamSerialisationInfo(param, parameterSource, components, options);

  if (options && !options.enableOptionalParameters) {
    disabled = !param.required;
  }

  // decide explodable params, starting value and separators between key-value and properties for serialisation
  switch (style) {
    case 'form':
      if (explode && _.isObject(paramValue)) {
        _.forEach(paramValue, (value, key) => {
          pmParams.push(generateSdkParam({
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
        let extractedParams = extractDeepObjectParams(paramValue, paramName);

        _.forEach(extractedParams, (extractedParam) => {
          pmParams.push(generateSdkParam({
            key: extractedParam.key,
            value: extractedParam.value || '',
            description,
            disabled
          }, _.get(param, 'in')));
        });
        return pmParams;
      }
      break;
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
  pmParams.push(generateSdkParam({
    key: paramName,
    value: serialisedValue,
    description,
    disabled
  }, _.get(param, 'in')));

  return pmParams;
}

/**
 * Converts the necessary server variables to the
 * something that can be added to the collection
 * TODO: Figure out better description
 * @param {object} serverVariables - Object containing the server variables at the root/path-item level
 * @param {string} keyName - an additional key to add the serverUrl to the variable list
 * @param {string} serverUrl - URL from the server object
 * @returns {object} modified collection after the addition of the server variables
 */
function convertToPmCollectionVariables (serverVariables, keyName, serverUrl = '') {
  var variables = [];
  if (serverVariables) {
    _.forOwn(serverVariables, (value, key) => {
      let description = getParameterDescription(value);
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
}

/**
 * Returns params applied to specific operation with resolved references. Params from parent
 * blocks (collection/folder) are merged, so that the request has a flattened list of params needed.
 * OperationParams take precedence over pathParams
 *
 * @param {Object} context - Required context from related SchemaPack function
 * @param {array} operationParam operation (Postman request)-level params.
 * @param {array} pathParam are path parent-level params.
 * @returns {*} combined requestParams from operation and path params.
 */
function getRequestParams (context, operationParam, pathParam) {
  if (!Array.isArray(operationParam)) {
    operationParam = [];
  }
  if (!Array.isArray(pathParam)) {
    pathParam = [];
  }
  pathParam.forEach((param, index, arr) => {
    if (_.has(param, '$ref')) {
      arr[index] = resolveRefFromSchema(context, param.$ref);
    }
  });

  operationParam.forEach((param, index, arr) => {
    if (_.has(param, '$ref')) {
      arr[index] = resolveRefFromSchema(context, param.$ref);
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
}

// TODO: document / comment properly all cases
/**
 * Resolves schema for form params such that each individual request body param can be validated
 * to corresponding resolved schema params
 *
 * @param {*} schema - Schema object for corresponding form params
 * @param {*} schemaKey - Key for corresponding Schema object to be resolved
 * @param {*} encodingObj - OAS Encoding object
 * @param {*} requestParams - collection request parameters
 * @param {*} metaInfo - meta information of param (i.e. required)
 * @param {object} components - components defined in the OAS spec. These are used to
 * resolve references while generating params.
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
 * @param {Boolean} shouldIterateChildren - Defines whether to iterate over children further for type object children
 * @return {Array} Resolved form schema params
 */
function resolveFormParamSchema (schema, schemaKey, encodingObj, requestParams, metaInfo, components, options,
  shouldIterateChildren) {

  let resolvedSchemaParams = [],
    resolvedProp,
    encodingValue,
    pSerialisationInfo,
    isPropSeparable;

  if (_.isArray(schema.anyOf) || _.isArray(schema.oneOf)) {
    _.forEach(schema.anyOf || schema.oneOf, (schemaElement) => {
      // As for such schemas there can be multiple choices, keep them as non required
      resolvedSchemaParams = _.concat(resolvedSchemaParams, resolveFormParamSchema(schemaElement, schemaKey,
        encodingObj, requestParams, _.assign(metaInfo, { required: false, isComposite: true }),
        components, options, shouldIterateChildren));
    });

    return resolvedSchemaParams;
  }

  resolvedProp = {
    name: schemaKey,
    schema: schema,
    required: _.get(metaInfo, 'required'),
    in: 'query', // serialization follows same behaviour as query params
    description: _.get(schema, 'description', _.get(metaInfo, 'description', '')),
    pathPrefix: _.get(metaInfo, 'pathPrefix'),
    isComposite: _.get(metaInfo, 'isComposite', false),
    deprecated: _.get(schema, 'deprecated', _.get(metaInfo, 'deprecated'))
  };
  encodingValue = _.get(encodingObj, schemaKey);

  if (_.isObject(encodingValue)) {
    _.has(encodingValue, 'style') && (resolvedProp.style = encodingValue.style);
    _.has(encodingValue, 'explode') && (resolvedProp.explode = encodingValue.explode);
  }

  pSerialisationInfo = getParamSerialisationInfo(resolvedProp, PARAMETER_SOURCE.REQUEST,
    components, options);
  isPropSeparable = _.includes(['form', 'deepObject'], pSerialisationInfo.style);

  /**
   * schema apart from type object should be only resolved if corresponding schema key is present.
   * i.e. As URL encoded body requires key-value pair, non key schemas should not be resolved.
   */
  if (!isPropSeparable || (!_.includes(['object', 'array'], _.get(schema, 'type')) && !_.isEmpty(schemaKey)) ||
    (_.isEmpty(schemaKey) && _.get(schema, 'type') === 'array') || !pSerialisationInfo.explode) {
    resolvedSchemaParams.push(resolvedProp);
  }
  else if (_.get(schema, 'type') === 'array' && pSerialisationInfo.style === 'form' &&
    pSerialisationInfo.explode) {

    resolvedProp.schema = _.get(schema, 'items', {});
    resolvedSchemaParams.push(resolvedProp);
  }
  else {
    // resolve each property as separate param similar to query params
    _.forEach(_.get(schema, 'properties'), (propSchema, propName) => {
      let resolvedPropName = _.isEmpty(schemaKey) ? propName : `${schemaKey}[${propName}]`,
        resolvedProp = {
          name: resolvedPropName,
          schema: propSchema,
          in: 'query', // serialization follows same behaviour as query params
          description: _.get(propSchema, 'description') || _.get(metaInfo, 'description') || '',
          required: _.get(metaInfo, 'required'),
          isComposite: _.get(metaInfo, 'isComposite', false),
          deprecated: _.get(propSchema, 'deprecated') || _.get(metaInfo, 'deprecated')
        },
        parentPropName = resolvedPropName.indexOf('[') === -1 ? resolvedPropName :
          resolvedPropName.slice(0, resolvedPropName.indexOf('[')),
        encodingValue = _.get(encodingObj, parentPropName),
        pSerialisationInfo,
        isPropSeparable;

      if (_.isObject(encodingValue)) {
        _.has(encodingValue, 'style') && (resolvedProp.style = encodingValue.style);
        _.has(encodingValue, 'explode') && (resolvedProp.explode = encodingValue.explode);
      }

      if (_.isUndefined(metaInfo.required) && _.includes(_.get(schema, 'required'), propName)) {
        resolvedProp.required = true;
      }

      pSerialisationInfo = getParamSerialisationInfo(resolvedProp, PARAMETER_SOURCE.REQUEST,
        components, options);
      isPropSeparable = _.includes(['form', 'deepObject'], pSerialisationInfo.style);

      if (_.isArray(propSchema.anyOf) || _.isArray(propSchema.oneOf)) {
        _.forEach(propSchema.anyOf || propSchema.oneOf, (schemaElement) => {
          let nextSchemaKey = _.isEmpty(schemaKey) ? propName : `${schemaKey}[${propName}]`;

          resolvedSchemaParams = _.concat(resolvedSchemaParams, resolveFormParamSchema(schemaElement, nextSchemaKey,
            encodingObj, requestParams, _.assign(metaInfo, { required: false, isComposite: true }),
            components, options, pSerialisationInfo.style === 'deepObject'));
        });

        return resolvedSchemaParams;
      }

      if (isPropSeparable && propSchema.type === 'array' && pSerialisationInfo.explode) {
        /**
         * avoid validation of complex array type param as OAS doesn't define serialisation
         * of Array with deepObject style
         */
        if (pSerialisationInfo.style !== 'deepObject' &&
          !_.includes(['array', 'object'], _.get(propSchema, 'items.type'))) {
          // add schema of corresponding items instead array
          resolvedSchemaParams.push(_.assign({}, resolvedProp, {
            schema: _.get(propSchema, 'items'),
            isResolvedParam: true
          }));
        }
      }
      else if (isPropSeparable && propSchema.type === 'object' && pSerialisationInfo.explode) {
        let localMetaInfo = _.isEmpty(metaInfo) ? (metaInfo = {
            required: resolvedProp.required,
            description: resolvedProp.description,
            deprecated: _.get(resolvedProp, 'deprecated')
          }) : metaInfo,
          nextSchemaKey = _.isEmpty(schemaKey) ? propName : `${schemaKey}[${propName}]`;

        // resolve all child params of parent param with deepObject style
        if (pSerialisationInfo.style === 'deepObject') {
          resolvedSchemaParams = _.concat(resolvedSchemaParams, resolveFormParamSchema(propSchema, nextSchemaKey,
            encodingObj, requestParams, localMetaInfo, components, options, true));
        }
        else {
          // add schema of all properties instead entire object
          _.forEach(_.get(propSchema, 'properties', {}), (value, key) => {
            resolvedSchemaParams.push({
              name: key,
              schema: value,
              isResolvedParam: true,
              required: resolvedProp.required,
              description: resolvedProp.description,
              isComposite: _.get(metaInfo, 'isComposite', false),
              deprecated: _.get(resolvedProp, 'deprecated') || _.get(metaInfo, 'deprecated')
            });
          });
        }
      }
      else {
        resolvedSchemaParams.push(resolvedProp);
      }
    });

    // Resolve additionalProperties via first finding additionalProper
    if (_.isObject(_.get(schema, 'additionalProperties'))) {
      const additionalPropSchema = _.get(schema, 'additionalProperties'),
        matchingRequestParamKeys = [];

      /**
       * Find matching keys from request param as additional props can be unknown keys.
       * and these unknown key names are not mentioned in schema
       */
      _.forEach(requestParams, ({ key }) => {
        if (_.isString(key) && schemaKey === '') {
          const isParamResolved = _.some(resolvedSchemaParams, (param) => {
            return key === param.key;
          });
          !isParamResolved && (matchingRequestParamKeys.push(key));
        }
        else if (_.isString(key) && _.startsWith(key, schemaKey + '[') && _.endsWith(key, ']')) {
          const childKey = key.substring(key.indexOf(schemaKey + '[') + schemaKey.length + 1, key.length - 1);

          if (!_.includes(childKey, '[')) {
            matchingRequestParamKeys.push(key);
          }
          else {
            matchingRequestParamKeys.push(schemaKey + '[' + childKey.slice(0, childKey.indexOf('[')));
          }
        }
      });

      // For every matched request param key add a child param schema that can be validated further
      _.forEach(matchingRequestParamKeys, (matchedRequestParamKey) => {
        if (_.get(additionalPropSchema, 'type') === 'object' && shouldIterateChildren) {
          resolvedSchemaParams = _.concat(resolvedSchemaParams, resolveFormParamSchema(additionalPropSchema,
            matchedRequestParamKey, encodingObj, requestParams, metaInfo, components, options, shouldIterateChildren));
        }

        // Avoid adding invalid array child params, As deepObject style should only contain object or simple types
        else if (_.get(additionalPropSchema, 'type') !== 'array') {
          resolvedSchemaParams.push({
            name: matchedRequestParamKey,
            schema: additionalPropSchema,
            description: _.get(additionalPropSchema, 'description') || _.get(metaInfo, 'description') || '',
            required: false,
            isResolvedParam: true,
            isComposite: true,
            deprecated: _.get(additionalPropSchema, 'deprecated') || _.get(metaInfo, 'deprecated')
          });
        }
      });
    }
  }

  return resolvedSchemaParams;
}

/**
 *
 * @param {Object} context - Required context from related SchemaPack function
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
 * @param {Object} schemaCache object storing schemaFaker and schemaResolution caches
 * @param {string} jsonSchemaDialect The schema dialect defined in the OAS object
 * @param {Function} callback - For return
 * @returns {Array} array of mismatches
 */
function checkValueAgainstSchema (context, property, jsonPathPrefix, txnParamName, value, schemaPathPrefix,
  openApiSchemaObj, parameterSourceOption, components, options, schemaCache, jsonSchemaDialect, callback) {

  let mismatches = [],
    jsonValue,
    humanPropName = propNames[property],
    needJsonMatching = (property === 'BODY' || property === 'RESPONSE_BODY'),
    invalidJson = false,
    valueToUse = value,

    schema = resolveSchema(context, openApiSchemaObj, {
      resolveFor: PROCESSING_TYPE.VALIDATION,
      isResponseSchema: parameterSourceOption === PARAMETER_SOURCE.RESPONSE
    }),
    compositeSchema = schema.oneOf || schema.anyOf,
    compareTypes = _.get(context, 'concreteUtils.compareTypes') || concreteUtils.compareTypes;

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
        checkValueAgainstSchema(context, property, jsonPathPrefix, txnParamName, value,
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
      if (options.ignoreUnresolvedVariables && isPmVariable(valueToUse)) {
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
          (compareTypes(schema.type, 'object') || compareTypes(schema.type, 'array'))) {
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
            suggestedValue: safeSchemaFaker(context, schema || {}, PROCESSING_TYPE.VALIDATION,
              parameterSourceOption, components, SCHEMA_FORMATS.DEFAULT, schemaCache)
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
            fakedValue = safeSchemaFaker(context, schema || {}, PROCESSING_TYPE.VALIDATION,
              parameterSourceOption, components, SCHEMA_FORMATS.DEFAULT, schemaCache);

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
                  actualValue: getPathValue(valueToUse, dataPath, null),
                  suggestedValue: getSuggestedValue(fakedValue, valueToUse, ajvError)
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
                  suggestedValue = getSuggestedValue(fakedValue, suggestedValue, ajvError);
                }
                else {
                  _.set(suggestedValue, dataPath, getSuggestedValue(fakedValue, suggestedValue, ajvError));
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
}

/**
 *
 * @param {Object} context - Required context from related SchemaPack function
 * @param {*} matchedPathData the matchedPath data
 * @param {*} transactionPathPrefix the jsonpath for this validation (will be prepended to all identified mismatches)
 * @param {*} schemaPath the applicable pathItem defined at the schema level
 * @param {*} components the components + paths from the OAS spec that need to be used to resolve $refs
 * @param {*} options OAS options
 * @param {*} schemaCache object storing schemaFaker and schemaResolution caches
 * @param {string} jsonSchemaDialect Defined schema dialect at the OAS object
 * @param {*} callback Callback
 * @returns {array} mismatches (in the callback)
 */
function checkPathVariables (context, matchedPathData, transactionPathPrefix, schemaPath, components, options,
  schemaCache, jsonSchemaDialect, callback) {

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
  pmPathVariables = utils.findPathVariablesFromSchemaPath(schemaPath.schemaPathName);
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
    assignParameterExamples(schemaPathVar);

    resolvedParamValue = deserialiseParamValue(schemaPathVar, pathVar.value, PARAMETER_SOURCE.REQUEST,
      components, options, schemaCache);

    setTimeout(() => {
      if (!(schemaPathVar && schemaPathVar.schema)) {
        // no errors to show if there's no schema present in the spec
        return cb(null, []);
      }

      checkValueAgainstSchema(context,
        mismatchProperty,
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
            description: getParameterDescription(currentUnmatchedVariableInTransaction),
            value: currentUnmatchedVariableInTransaction.value
          };
        }
        else {
          reason = `The required path variable "${pathVar.name}" was not found in the transaction`;
          actualValue = null;
        }

        // assign parameter example(s) as schema examples;
        assignParameterExamples(pathVar);

        mismatchObj = {
          property: mismatchProperty,
          transactionJsonPath: transactionPathPrefix,
          schemaJsonPath: pathVar.pathPrefix,
          reasonCode,
          reason
        };

        if (options.suggestAvailableFixes) {
          const resolvedSchema = resolveSchema(context, pathVar.schema, {
            resolveFor: PROCESSING_TYPE.VALIDATION
          });

          mismatchObj.suggestedFix = {
            key: pathVar.name,
            actualValue,
            suggestedValue: {
              key: pathVar.name,
              value: safeSchemaFaker(context, resolvedSchema || {}, PROCESSING_TYPE.VALIDATION,
                PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache),
              description: getParameterDescription(pathVar)
            }
          };
        }
        mismatches.push(mismatchObj);
      }
    });

    // res is an array of mismatches (also an array) from all checkValueAgainstSchema calls
    return callback(null, _.concat(_.flatten(res), mismatches));
  });
}

function checkQueryParams (context, queryParams, transactionPathPrefix, schemaPath, components, options,
  schemaCache, jsonSchemaDialect, callback) {
  let schemaParams = _.filter(schemaPath.parameters, (param) => { return param.in === 'query'; }),
    requestQueryParams = [],
    resolvedSchemaParams = [],
    mismatchProperty = 'QUERYPARAM',
    { includeDeprecated, enableOptionalParameters } = context.computedOptions;

  if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
    return callback(null, []);
  }

  requestQueryParams = _.filter(queryParams, (pQuery) => {
    // Ignoring the disabled query params
    if (pQuery.disabled === true) {
      return false;
    }

    return pQuery.value !== OAS_NOT_SUPPORTED;
  });

  // resolve schema params
  // below will make sure for exploded params actual schema of property present in collection is present
  _.forEach(schemaParams, (param) => {
    let pathPrefix = param.pathPrefix,
      paramSchema = resolveSchema(context, _.cloneDeep(param.schema), {
        resolveFor: PROCESSING_TYPE.VALIDATION
      }),
      { style, explode } = getParamSerialisationInfo(param, PARAMETER_SOURCE.REQUEST, components, options),
      encodingObj = { [param.name]: { style, explode } },
      metaInfo = {
        required: _.get(param, 'required') || false,
        description: _.get(param, 'description'),
        deprecated: _.get(param, 'deprecated') || false,
        pathPrefix
      };

    resolvedSchemaParams = _.concat(resolvedSchemaParams, resolveFormParamSchema(paramSchema, param.name,
      encodingObj, requestQueryParams, metaInfo, components, options));
  });

  return async.map(requestQueryParams, (pQuery, cb) => {
    let mismatches = [],
      index = _.findIndex(queryParams, pQuery),
      resolvedParamValue = pQuery.value;

    const schemaParam = _.find(resolvedSchemaParams, (param) => { return param.name === pQuery.key; });

    if (!schemaParam) {
      // skip validation of complex array params
      if (isParamComplexArray(pQuery.key)) {
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
    assignParameterExamples(schemaParam);

    if (!schemaParam.isResolvedParam) {
      resolvedParamValue = deserialiseParamValue(schemaParam, pQuery.value, PARAMETER_SOURCE.REQUEST,
        components, options, schemaCache);
    }

    // query found in spec. check query's schema
    setTimeout(() => {
      if (!schemaParam.schema) {
        // no errors to show if there's no schema present in the spec
        return cb(null, []);
      }
      checkValueAgainstSchema(context,
        mismatchProperty,
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
      mismatchObj,
      filteredSchemaParams = _.filter(resolvedSchemaParams, (q) => {
        /**
         * Filter out composite params. i.e. Params that contains anyOf/oneOf keyword in schema.
         * For such params multiple keys are possible based on schema so they should not be reported as missing.
         */
        if (VALIDATE_OPTIONAL_PARAMS) {
          return !q.isComposite;
        }
        return q.required && !q.isComposite;
      });

    _.each(filteredSchemaParams, (qp) => {
      if (qp.deprecated && !includeDeprecated) {
        return;
      }

      // If optional parameters are disabled, do not report them as missing
      if (!enableOptionalParameters && qp.required !== true) {
        return;
      }

      if (!_.find(requestQueryParams, (param) => {
        return param.key === qp.name;
      })) {

        // assign parameter example(s) as schema examples;
        assignParameterExamples(qp);

        mismatchObj = {
          property: mismatchProperty,
          transactionJsonPath: transactionPathPrefix,
          schemaJsonPath: qp.pathPrefix + '[?(@.name==\'' + qp.name + '\')]',
          reasonCode: 'MISSING_IN_REQUEST',
          reason: `The required query parameter "${qp.name}" was not found in the transaction`
        };

        if (options.suggestAvailableFixes) {
          const resolvedSchema = resolveSchema(context, qp.schema, {
            resolveFor: PROCESSING_TYPE.VALIDATION
          });

          mismatchObj.suggestedFix = {
            key: qp.name,
            actualValue: null,
            suggestedValue: {
              key: qp.name,
              value: safeSchemaFaker(context, resolvedSchema || {}, PROCESSING_TYPE.VALIDATION,
                PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache),
              description: getParameterDescription(qp)
            }
          };
        }
        mismatches.push(mismatchObj);
      }
    });
    return callback(null, _.concat(_.flatten(res), mismatches));
  });
}

function checkRequestHeaders (context, headers, transactionPathPrefix, schemaPathPrefix, schemaPath,
  components, options, schemaCache, jsonSchemaDialect, callback) {
  let schemaHeaders = _.filter(schemaPath.parameters, (param) => { return param.in === 'header'; }),
    // filter out headers for following cases
    reqHeaders = _.filter(headers, (header) => {
      // 1. If header is disabled
      // 2. which need explicit handling according to schema (other than parameters object)
      // 3. which are added by security schemes
      if (options.disabledParametersValidation && header.disabled) {
        return !header.disabled;
      }

      return !_.includes(IMPLICIT_HEADERS, _.toLower(_.get(header, 'key')));
    }),
    mismatchProperty = 'HEADER',
    { includeDeprecated, enableOptionalParameters } = context.computedOptions;

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
    assignParameterExamples(schemaHeader);

    resolvedParamValue = deserialiseParamValue(schemaHeader, pHeader.value, PARAMETER_SOURCE.REQUEST,
      components, options, schemaCache);

    // header found in spec. check header's schema
    setTimeout(() => {
      if (!schemaHeader.schema) {
        // no errors to show if there's no schema present in the spec
        return cb(null, []);
      }
      checkValueAgainstSchema(context,
        mismatchProperty,
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
      contentHeaderMismatches = [],
      filteredHeaders;

    // resolve $ref in request body if present
    if (reqBody) {
      if (_.has(reqBody, '$ref')) {
        reqBody = resolveRefFromSchema(context, reqBody.$ref);
      }

      contentHeaderMismatches = checkContentTypeHeader(headers, transactionPathPrefix,
        schemaPathPrefix + '.requestBody.content', _.get(reqBody, 'content'),
        mismatchProperty, options);
    }

    filteredHeaders = _.filter(schemaHeaders, (h) => {
      // exclude non-required, non-composite and implicit header from further validation
      const isImplicitHeader = _.includes(IMPLICIT_HEADERS, _.toLower(h.name));

      if (VALIDATE_OPTIONAL_PARAMS) {
        return !h.isComposite && !isImplicitHeader;
      }
      return h.required && !h.isComposite && !isImplicitHeader;
    });

    _.each(filteredHeaders, (header) => {
      if (!_.find(reqHeaders, (param) => { return param.key === header.name; })) {

        if (header.deprecated && !includeDeprecated) {
          return;
        }

        // If optional parameters are disabled, do not report them as missing
        if (!enableOptionalParameters && header.required !== true) {
          return;
        }

        // assign parameter example(s) as schema examples;
        assignParameterExamples(header);

        mismatchObj = {
          property: mismatchProperty,
          transactionJsonPath: transactionPathPrefix,
          schemaJsonPath: header.pathPrefix + '[?(@.name==\'' + header.name + '\')]',
          reasonCode: 'MISSING_IN_REQUEST',
          reason: `The required header "${header.name}" was not found in the transaction`
        };

        if (options.suggestAvailableFixes) {
          const resolvedSchema = resolveSchema(context, header.schema, {
            resolveFor: PROCESSING_TYPE.VALIDATION
          });

          mismatchObj.suggestedFix = {
            key: header.name,
            actualValue: null,
            suggestedValue: {
              key: header.name,
              value: safeSchemaFaker(context, resolvedSchema || {}, PROCESSING_TYPE.VALIDATION,
                PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache),
              description: getParameterDescription(header)
            }
          };
        }
        mismatches.push(mismatchObj);
      }
    });
    return callback(null, _.concat(contentHeaderMismatches, _.flatten(res), mismatches));
  });
}

function checkResponseHeaders (context, schemaResponse, headers, transactionPathPrefix, schemaPathPrefix,
  components, options, schemaCache, jsonSchemaDialect, callback) {
  // 0. Need to find relevant response from schemaPath.responses
  let schemaHeaders,
    // filter out headers which need explicit handling according to schema (other than parameters object)
    resHeaders = _.filter(headers, (header) => {
      if (options.disabledParametersValidation && header.disabled) {
        return !header.disabled;
      }

      return !_.includes(IMPLICIT_HEADERS, _.toLower(_.get(header, 'key')));
    }),
    mismatchProperty = 'RESPONSE_HEADER',
    { includeDeprecated, enableOptionalParameters } = context.computedOptions;

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
    assignParameterExamples(schemaHeader);

    // header found in spec. check header's schema
    setTimeout(() => {
      if (!schemaHeader.schema) {
        // no errors to show if there's no schema present in the spec
        return cb(null, []);
      }
      return checkValueAgainstSchema(context,
        mismatchProperty,
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
      contentHeaderMismatches = checkContentTypeHeader(headers, transactionPathPrefix,
        schemaPathPrefix + '.content', _.get(schemaResponse, 'content'), mismatchProperty, options),
      filteredHeaders = _.filter(schemaHeaders, (h, hName) => {
        // exclude empty headers from validation
        if (_.isEmpty(h)) {
          return false;
        }
        h.name = hName;

        // exclude non-required, non-composite and implicit header from further validation
        const isImplicitHeader = _.includes(IMPLICIT_HEADERS, _.toLower(hName));

        if (VALIDATE_OPTIONAL_PARAMS) {
          return !h.isComposite && !isImplicitHeader;
        }
        return h.required && !h.isComposite && !isImplicitHeader;
      });

    _.each(filteredHeaders, (header) => {
      if (header.deprecated && !includeDeprecated) {
        return;
      }

      // If optional parameters are disabled, do not report them as missing
      if (!enableOptionalParameters && header.required !== true) {
        return;
      }

      if (!_.find(resHeaders, (param) => { return param.key === header.name; })) {

        // assign parameter example(s) as schema examples;
        assignParameterExamples(header);

        mismatchObj = {
          property: mismatchProperty,
          transactionJsonPath: transactionPathPrefix,
          schemaJsonPath: schemaPathPrefix + '.headers[\'' + header.name + '\']',
          reasonCode: 'MISSING_IN_REQUEST',
          reason: `The required response header "${header.name}" was not found in the transaction`
        };

        if (options.suggestAvailableFixes) {
          const resolvedSchema = resolveSchema(context, header.schema, {
            resolveFor: PROCESSING_TYPE.VALIDATION,
            isResponseSchema: true
          });

          mismatchObj.suggestedFix = {
            key: header.name,
            actualValue: null,
            suggestedValue: {
              key: header.name,
              value: safeSchemaFaker(context, resolvedSchema || {}, PROCESSING_TYPE.VALIDATION,
                PARAMETER_SOURCE.RESPONSE, components, SCHEMA_FORMATS.DEFAULT, schemaCache),
              description: getParameterDescription(header)
            }
          };
        }
        mismatches.push(mismatchObj);
      }
    });
    callback(null, _.concat(contentHeaderMismatches, _.flatten(res), mismatches));
  });
}

// Only application/json and application/x-www-form-urlencoded is validated for now
function checkRequestBody (context, requestBody, transactionPathPrefix, schemaPathPrefix, schemaPath,
  components, options, schemaCache, jsonSchemaDialect, callback) {
  // check for body modes
  let jsonSchemaBody,
    jsonContentType,
    mismatchProperty = 'BODY',
    { includeDeprecated, enableOptionalParameters } = context.computedOptions;

  if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
    return callback(null, []);
  }

  // resolve $ref in requestBody object if present
  if (!_.isEmpty(_.get(schemaPath, 'requestBody.$ref'))) {
    schemaPath.requestBody = resolveRefFromSchema(context, schemaPath.requestBody.$ref);
  }

  // get valid json content type
  jsonContentType = getJsonContentType(_.get(schemaPath, 'requestBody.content', {}));
  jsonSchemaBody = _.get(schemaPath, ['requestBody', 'content', jsonContentType, 'schema']);

  if (requestBody && requestBody.mode === 'raw' && jsonSchemaBody) {
    setTimeout(() => {
      return checkValueAgainstSchema(context,
        mismatchProperty,
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
      pathPrefix = `${schemaPathPrefix}.requestBody.content[${URLENCODED}].schema`,
      encodingObj = _.get(schemaPath, ['requestBody', 'content', URLENCODED, 'encoding']),
      filteredUrlEncodedBody = _.filter(requestBody.urlencoded, (param) => {
        if (options.disabledParametersValidation && param.disabled) {
          return !param.disabled;
        }

        return param.value !== OAS_NOT_SUPPORTED;
      });

    urlencodedBodySchema = resolveSchema(context, urlencodedBodySchema, {
      resolveFor: PROCESSING_TYPE.VALIDATION
    });

    resolvedSchemaParams = resolveFormParamSchema(urlencodedBodySchema, '', encodingObj,
      filteredUrlEncodedBody, {}, components, options);

    return async.map(filteredUrlEncodedBody, (uParam, cb) => {
      let mismatches = [],
        index = _.findIndex(filteredUrlEncodedBody, uParam),
        resolvedParamValue = uParam.value;

      const schemaParam = _.find(resolvedSchemaParams, (param) => { return param.name === uParam.key; });

      if (!schemaParam) {
        // skip validation of complex array params
        if (isParamComplexArray(uParam.key)) {
          return cb(null, mismatches);
        }
        if (options.showMissingInSchemaErrors && _.get(urlencodedBodySchema, 'additionalProperties') !== true) {
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
        resolvedParamValue = deserialiseParamValue(schemaParam, uParam.value, PARAMETER_SOURCE.REQUEST,
          components, options, schemaCache);
      }
      // store value of transaction to use in mismatch object
      schemaParam.actualValue = uParam.value;

      // param found in spec. check param's schema
      setTimeout(() => {
        if (!schemaParam.schema) {
          // no errors to show if there's no schema present in the spec
          return cb(null, []);
        }
        checkValueAgainstSchema(context,
          mismatchProperty,
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
        // fetches property name from schema path
        getPropNameFromSchemaPath = (schemaPath) => {
          let regex = /\.properties\[(.+)\]/gm;
          return _.last(regex.exec(schemaPath));
        };

      // update actual value and suggested value from JSON to serialized strings
      _.forEach(_.flatten(res), (mismatchObj) => {
        if (!_.isEmpty(mismatchObj)) {
          let propertyName = getPropNameFromSchemaPath(mismatchObj.schemaJsonPath),
            schemaParam = _.find(resolvedSchemaParams, (param) => { return param.name === propertyName; }),
            serializedParamValue;

          if (schemaParam) {
            // serialize param value (to be used in suggested value)
            serializedParamValue = _.get(convertParamsWithStyle(schemaParam,
              _.get(mismatchObj, 'suggestedFix.suggestedValue'), PARAMETER_SOURCE.REQUEST, components, schemaCache,
              options), '[0].value');
            _.set(mismatchObj, 'suggestedFix.actualValue', schemaParam.actualValue);
            _.set(mismatchObj, 'suggestedFix.suggestedValue', serializedParamValue);
          }
        }
      });

      const filteredSchemaParams = _.filter(resolvedSchemaParams, (q) => {
        if (VALIDATE_OPTIONAL_PARAMS) {
          return !q.isComposite;
        }
        return q.required && !q.isComposite;
      });

      _.each(filteredSchemaParams, (uParam) => {
        if (uParam.deprecated && !includeDeprecated) {
          return;
        }

        // If optional parameters are disabled, do not report them as missing
        if (!enableOptionalParameters && uParam.required !== true) {
          return;
        }

        // report mismatches only for required properties
        if (!_.find(filteredUrlEncodedBody, (param) => { return param.key === uParam.name; })) {
          mismatchObj = {
            property: mismatchProperty,
            transactionJsonPath: transactionPathPrefix + '.urlencoded',
            schemaJsonPath: pathPrefix + '.properties[' + uParam.name + ']',
            reasonCode: 'MISSING_IN_REQUEST',
            reason: `The Url Encoded body param "${uParam.name}" was not found in the transaction`
          };

          if (options.suggestAvailableFixes) {
            const resolvedSchema = resolveSchema(context, uParam.schema, {
              resolveFor: PROCESSING_TYPE.VALIDATION
            });

            mismatchObj.suggestedFix = {
              key: uParam.name,
              actualValue: null,
              suggestedValue: {
                key: uParam.name,
                value: safeSchemaFaker(context, resolvedSchema || {}, PROCESSING_TYPE.VALIDATION,
                  PARAMETER_SOURCE.REQUEST, components, SCHEMA_FORMATS.DEFAULT, schemaCache),
                description: getParameterDescription(uParam)
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
}

function checkResponseBody (context, schemaResponse, body, transactionPathPrefix, schemaPathPrefix,
  components, options, schemaCache, jsonSchemaDialect, callback) {
  let schemaContent,
    jsonContentType,
    mismatchProperty = 'RESPONSE_BODY';

  if (options.validationPropertiesToIgnore.includes(mismatchProperty)) {
    return callback(null, []);
  }

  // get valid json content type
  jsonContentType = getJsonContentType(_.get(schemaResponse, 'content', {}));
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
    return checkValueAgainstSchema(context,
      mismatchProperty,
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
}

function checkResponses (context, transaction, transactionPathPrefix, schemaPathPrefix, schemaPath,
  components, options, schemaCache, jsonSchemaDialect, cb) {
  let matchedResponses = [],
    responses = transaction.response,
    mismatchProperty = 'RESPONSE';

  // responses is an array of responses recd. for one Postman request
  // we've already determined the schemaPath against which all responses need to be validated
  // loop through all responses
  // for each response, find the appropriate response from schemaPath, and then validate response body and headers
  async.map(responses, (response, responseCallback) => {
    let thisResponseCode = _.toString(response.code),
      thisSchemaResponse = _.get(schemaPath, ['responses', thisResponseCode], _.get(schemaPath, 'responses.default')),
      responsePathPrefix = thisResponseCode;

    // X can be used as wild card character, so response code like 2XX in definition are valid
    if (!thisSchemaResponse) {
      let wildcardResponseCode = thisResponseCode.charAt(0) + 'XX';

      thisSchemaResponse = _.get(schemaPath, ['responses', wildcardResponseCode]);
      responsePathPrefix = wildcardResponseCode;
    }

    // find this code from the schemaPath
    if (!thisSchemaResponse) {
      // could not find an appropriate response for this code. check default?
      thisSchemaResponse = _.get(schemaPath, ['responses', 'default']);
      responsePathPrefix = 'default';
    }

    // resolve $ref in response object if present
    if (!_.isEmpty(_.get(thisSchemaResponse, '$ref'))) {
      thisSchemaResponse = resolveRefFromSchema(context, thisSchemaResponse.$ref);
    }

    // resolve $ref in all header objects if present
    _.forEach(_.get(thisSchemaResponse, 'headers'), (header) => {
      if (_.has(header, '$ref')) {
        _.assign(header, resolveRefFromSchema(context, header.$ref));
        _.unset(header, '$ref');
      }
    });

    if (!thisSchemaResponse) {
      let mismatches = [];
      if (options.showMissingInSchemaErrors) {
        mismatches.push({
          property: mismatchProperty,
          transactionJsonPath: transactionPathPrefix + `[${response.id}]`,
          schemaJsonPath: null,
          reasonCode: 'MISSING_IN_SCHEMA',
          reason: `The response "${thisResponseCode}" was not found in the schema`
        });
      }
      return responseCallback(null, {
        id: response.id,
        matched: _.isEmpty(mismatches),
        mismatches: mismatches
      });
    }
    else {
      matchedResponses.push(responsePathPrefix);
      // check headers and body
      async.parallel({
        headers: (cb) => {
          checkResponseHeaders(context, thisSchemaResponse, response.header,
            transactionPathPrefix + '[' + response.id + '].header',
            schemaPathPrefix + '.responses.' + responsePathPrefix,
            components, options, schemaCache, jsonSchemaDialect, cb);
        },
        body: (cb) => {
          // assume it's JSON at this point
          checkResponseBody(context, thisSchemaResponse, response.body,
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
    let retVal = _.keyBy(_.reject(result, (ai) => { return !ai; }), 'id'),
      missingResponses = [];

    _.each(_.get(schemaPath, 'responses'), (responseObj, responseCode) => {
      responseCode = responseCode === 'default' ? '500' : responseCode;

      if (!_.includes(matchedResponses, responseCode)) {
        let mismatchObj = {
          property: 'RESPONSE',
          transactionJsonPath: transactionPathPrefix,
          schemaJsonPath: schemaPathPrefix + '.responses.' + responseCode,
          reasonCode: 'MISSING_IN_REQUEST',
          reason: `The response "${responseCode}" was not found in the transaction`
        };

        if (options.suggestAvailableFixes) {
          let generatedResponse,
            resolvedResponse,
            originalRequest = _.omit(_.get(transaction, 'request', {}), 'response'),
            resolvedResponses = resolveResponseForPostmanRequest(context,
              { responses: { [responseCode]: responseObj } }, originalRequest);

          resolvedResponse = _.head(resolvedResponses.responses);
          generatedResponse = utils.generatePmResponseObject(resolvedResponse);

          if (_.isFunction(generatedResponse.toJSON)) {
            generatedResponse = generatedResponse.toJSON();
          }

          mismatchObj.suggestedFix = {
            key: responseCode,
            actualValue: null,
            suggestedValue: generatedResponse
          };
        }

        missingResponses.push(mismatchObj);
      }
    });
    return cb(null, { mismatches: retVal, missingResponses });
  });
}

module.exports = {
  validateTransaction: function (context, transaction, {
    schema, options, componentsAndPaths, schemaCache, matchedEndpoints = []
  }, callback) {
    if (!transaction.id || !transaction.request) {
      return callback(new Error('All transactions must have `id` and `request` properties.'));
    }

    const jsonSchemaDialect = schema.jsonSchemaDialect;

    let requestUrl = transaction.request.url,
      matchedPaths,
      queryParams = [];

    if (typeof requestUrl === 'object') {

      // SDK.Url.toString() resolves pathvar to empty string if value is empty
      // so update path variable value to same as key in such cases
      _.forEach(requestUrl.variable, (pathVar) => {
        if (_.isNil(pathVar.value) || (typeof pathVar.value === 'string' && _.trim(pathVar.value).length === 0)) {
          pathVar.value = ':' + pathVar.key;
        }
      });

      queryParams = [...(requestUrl.query || [])];

      // SDK URL object. Get raw string representation.
      requestUrl = (new Url(requestUrl)).toString();
    }

    // 1. Look at transaction.request.URL + method, and find matching request from schema
    matchedPaths = findMatchingRequestFromSchema(
      transaction.request.method,
      requestUrl,
      schema,
      options
    );

    if (!matchedPaths.length) {
      // No matching paths found
      return callback(null, {
        requestId: transaction.id,
        endpoints: []
      });
    }

    // 2. perform validation for each identified matchedPath (schema endpoint)
    return async.map(matchedPaths, (matchedPath, pathsCallback) => {
      const transactionPathVariables = _.get(transaction, 'request.url.variable', []),
        localServers = matchedPath.path.hasOwnProperty('servers') ?
          matchedPath.path.servers :
          [],
        serversPathVars = [...getServersPathVars(localServers), ...getServersPathVars(schema.servers)],
        isNotAServerPathVar = (pathVarName) => {
          return !serversPathVars.includes(pathVarName);
        };

      matchedPath.unmatchedVariablesFromTransaction = [];
      // override path variable value with actual value present in transaction
      // as matched pathvariable contains key as value, as it is generated from url only
      _.forEach(matchedPath.pathVariables, (pathVar) => {
        const mappedPathVar = _.find(transactionPathVariables, (transactionPathVar) => {
          let matched = transactionPathVar.key === pathVar.key;
          if (
            !matched &&
            isNotAServerPathVar(transactionPathVar.key) &&
            !matchedPath.unmatchedVariablesFromTransaction.includes(transactionPathVar)
          ) {
            matchedPath.unmatchedVariablesFromTransaction.push(transactionPathVar);
          }
          return matched;
        });
        pathVar.value = _.get(mappedPathVar, 'value', pathVar.value);
        // set _varMatched flag which represents if variable was found in transaction or not
        pathVar._varMatched = !_.isEmpty(mappedPathVar);
      });

      // resolve $ref in all parameter objects if present
      _.forEach(_.get(matchedPath, 'path.parameters'), (param) => {
        if (param.hasOwnProperty('$ref')) {
          _.assign(param, resolveRefFromSchema(context, param.$ref));
          _.unset(param, '$ref');
        }
      });

      matchedEndpoints.push(matchedPath.jsonPath);
      // 3. validation involves checking these individual properties
      async.parallel({
        metadata: function(cb) {
          checkMetadata(transaction, '$', matchedPath.path, matchedPath.name, options, cb);
        },
        path: function(cb) {
          checkPathVariables(context, matchedPath, '$.request.url.variable', matchedPath.path,
            componentsAndPaths, options, schemaCache, jsonSchemaDialect, cb);
        },
        queryparams: function(cb) {
          checkQueryParams(context, queryParams, '$.request.url.query', matchedPath.path,
            componentsAndPaths, options, schemaCache, jsonSchemaDialect, cb);
        },
        headers: function(cb) {
          checkRequestHeaders(context, transaction.request.header, '$.request.header', matchedPath.jsonPath,
            matchedPath.path, componentsAndPaths, options, schemaCache, jsonSchemaDialect, cb);
        },
        requestBody: function(cb) {
          checkRequestBody(context, transaction.request.body, '$.request.body', matchedPath.jsonPath,
            matchedPath.path, componentsAndPaths, options, schemaCache, jsonSchemaDialect, cb);
        },
        responses: function (cb) {
          checkResponses(context, transaction, '$.responses', matchedPath.jsonPath,
            matchedPath.path, componentsAndPaths, options, schemaCache, jsonSchemaDialect, cb);
        }
      }, (err, result) => {
        let allMismatches = _.concat(result.metadata, result.queryparams, result.headers, result.path,
            result.requestBody),
          responseMismatchesPresent = false,
          retVal,
          responsesResult = result.responses.mismatches,
          missingResponses = result.responses.missingResponses || [];

        // adding mistmatches from responses
        _.each(responsesResult, (response) => {
          if (_.get(response, 'mismatches', []).length > 0) {
            responseMismatchesPresent = true;
            return false;
          }
        });

        retVal = {
          matched: (allMismatches.length === 0 && !responseMismatchesPresent && _.isEmpty(missingResponses)),
          endpointMatchScore: matchedPath.score,
          endpoint: matchedPath.name,
          mismatches: allMismatches,
          responses: responsesResult,
          missingResponses
        };

        pathsCallback(null, retVal);
      });
    }, (err, result) => {
      // only need to return endpoints that have the joint-highest score
      let highestScore = -Infinity,
        bestResults;
      result.forEach((endpoint) => {
        if (endpoint.endpointMatchScore > highestScore) {
          highestScore = endpoint.endpointMatchScore;
        }
      });
      bestResults = _.filter(result, (ep) => {
        return ep.endpointMatchScore === highestScore;
      });

      callback(err, {
        requestId: transaction.id,
        endpoints: bestResults
      });
    });
  },

  /**
   * @param {Object} context - Required context from related SchemaPack function
   * @param {*} schema OpenAPI spec
   * @param {Array} matchedEndpoints - All matched endpoints
   * @param {object} components - components defined in the OAS spec. These are used to
   * resolve references while generating params.
   * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {Array} - Array of all MISSING_ENDPOINT objects
   */
  getMissingSchemaEndpoints: function (context, schema, matchedEndpoints, components, options) {
    let endpoints = [],
      schemaPaths = schema.paths,
      rootCollectionVariables,
      schemaJsonPath;

    // collection variables generated for resolving for baseUrl and variables
    rootCollectionVariables = convertToPmCollectionVariables(
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
              conversionResult,
              variables = rootCollectionVariables,
              path = schemaPath,
              requestItem;

            // add common parameters of path level
            operationItem.parameters = getRequestParams(context, operationItem.parameters,
              _.get(schemaPathObj, 'parameters'));

            // discard the leading slash, if it exists
            if (path[0] === '/') {
              path = path.substring(1);
            }

            // override root level collection variables (baseUrl and vars) with path level server url and vars if exists
            // storing common path/collection vars from the server object at the path item level
            if (!_.isEmpty(_.get(schemaPathObj, 'servers'))) {
              let pathLevelServers = schemaPathObj.servers;

              // add path level server object's URL as collection variable
              variables = convertToPmCollectionVariables(
                pathLevelServers[0].variables, // these are path variables in the server block
                utils.fixPathVariableName(path), // the name of the variable
                utils.fixPathVariablesInUrl(pathLevelServers[0].url)
              );
            }

            conversionResult = resolvePostmanRequest(context, schemaPathObj, schemaPath, pathKey);

            requestItem = utils.generateRequestItemObject(conversionResult.request);
            _.set(requestItem, 'request.url.raw', conversionResult.request.request.url);

            mismatchObj.suggestedFix = {
              key: pathKey,
              actualValue: null,
              // Not adding collection variables for now
              suggestedValue: {
                request: requestItem,
                variables: _.concat(conversionResult.collectionVariables, _.values(variables))
              }
            };
          }

          endpoints.push(mismatchObj);
        }
      });
    });
    return endpoints;
  }
};
