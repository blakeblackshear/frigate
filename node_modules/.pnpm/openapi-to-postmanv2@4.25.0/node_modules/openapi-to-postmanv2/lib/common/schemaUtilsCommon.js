/**
 * This file contains util functions that are common between versions
 */

const parse = require('../parse.js'),
  _ = require('lodash'),
  typesMap = {
    integer: {
      int32: '<integer>',
      int64: '<long>'
    },
    number: {
      float: '<float>',
      double: '<double>'
    },
    string: {
      byte: '<byte>',
      binary: '<binary>',
      date: '<date>',
      'date-time': '<dateTime>',
      password: '<password>'
    },
    boolean: '<boolean>',
    array: '<array>',
    object: '<object>'
  },

  /* eslint-disable arrow-body-style */
  schemaTypeToJsValidator = {
    'string': (d) => typeof d === 'string',
    'number': (d) => !isNaN(d),
    'integer': (d) => !isNaN(d) && Number.isInteger(Number(d)),
    'boolean': (d) => _.isBoolean(d) || d === 'true' || d === 'false',
    'array': (d) => Array.isArray(d),
    'object': (d) => typeof d === 'object' && !Array.isArray(d)
  };

/**
 *  Remove the # character from the beginning of a schema path
 * @param {string} schemaPath - a defined schemaPath
 * @returns {string} - the schema path with # removed
 */
function removeSharpAndSlashFromFirstPosition(schemaPath) {
  return schemaPath[0] === '#' ? schemaPath.slice(2) : schemaPath;
}

/**
 *  Remove the defined word from the last position of a schema path
 * @param {string} schemaPath - a defined schemaPath
 * @param {string} word - word to remove
 * @returns {string} - the schema path with type removed
 */
function removeWordFromLastPosition(schemaPath, word) {
  let splittedDataPath = schemaPath.split('/');
  if (splittedDataPath[splittedDataPath.length - 1] === word) {
    splittedDataPath.splice(-1);
  }
  return splittedDataPath.join('/');
}

/**
 * Checks if value is the representation of its type like:
 * "<integer>"
 *
 * @param {string} value - Value to check for
 * @param {string} type - The type in the schema
 * @returns {Boolean} the value is the representation of its type
 */
function compareType(value, type) {
  return value === '<' + type + '>';
}

/**
 * Checks if value is the representation of its type like:
 * "<integer>"
 * Works in array types
 * @param {string} value - Value to check for
 * @param {*} types - The types in the schema
 * @returns {Boolean} the value is the representation of its type
 */
function isTypeValueArrayCheck(value, types) {
  return types.find((type) => {
    return compareType(value, type);
  }) !== undefined;
}

/**
 * Checks if value is the representation of its type like:
 * "<integer>"
 * Works in array types
 * @param {string} value - Value to check for
 * @param {*} types - The types in the schema
 * @returns {Boolean} the value is the representation of its type
 */
function checkValueOnlyTypes(value, types) {
  return Array.isArray(types) ? isTypeValueArrayCheck(value, types) : compareType(value, types);
}

/**
 * Checks if value is postman variable or not
 *
 * @param {string} type - type to look for
 * @param {string} format - format from schema
 * @returns {Boolean} postman variable or not
 */
function getDefaultFromTypeAndFormat(type, format) {
  return typesMap[type][format];
}


/**
 * Checks if value is the representation of its type like:
 * "<integer>"
 * Works in array types
 * @param {string} value - Value to check for
 * @param {*} types - The types in the schema
 * @param {*} format - format from the schema
 * @returns {Boolean} the value is the representation of its type
 */
function checkValueTypesAndFormat(value, types, format) {
  let typesNotInMap = [],
    typesArray = Array.isArray(types) ? types : [types],
    found = typesArray.find((type) => {
      let defaultValue;
      if (typesMap.hasOwnProperty(type)) {
        defaultValue = getDefaultFromTypeAndFormat(type, format);

        // in case the format is a custom format (email, hostname etc.)
        // https://swagger.io/docs/specification/data-models/data-types/#string
        if (!defaultValue && format) {
          defaultValue = '<' + format + '>';
        }
      }
      else {
        typesNotInMap.push(type);
      }
      return defaultValue === value;
    });

  if (found) {
    return true;
  }

  found = typesNotInMap.find((type) => {
    let defaultValue;
    defaultValue = '<' + type + (format ? ('-' + format) : '') + '>';
    return defaultValue === value;
  });

  return found !== undefined;
}

/**
 * Checks if value is equal to the defined default
 * Works in array types
 * @param {string} value - Value to check for
 * @param {*} definedDefault - The defined default value of the schema
 * @returns {Boolean} wheter value is equal to the defined or not
 */
function checkValueEqualsDefault(value, definedDefault) {
  return value === definedDefault;
}

/**
 * Checks if value is the representation of its type like:
 * "<integer>"
 * Works in array types
 * @param {string} value - Value to check for
 * @param {*} schema - The schema portion used in validation
 * @returns {Boolean} the value is the representation of its type
 */
function isTypeValue(value, schema) {
  if (!_.isObject(schema)) {
    return false;
  }
  if (schema.hasOwnProperty('type') && schema.hasOwnProperty('default')) {
    const isDefault = checkValueEqualsDefault(value, schema.default);
    if (isDefault) {
      return true;
    }
  }
  if (schema.hasOwnProperty('type') && !schema.hasOwnProperty('format')) {
    return checkValueOnlyTypes(value, schema.type);
  }
  if (schema.hasOwnProperty('type') && schema.hasOwnProperty('format')) {
    return checkValueTypesAndFormat(value, schema.type, schema.format);
  }
}

/**
 * Checks if value is correct according to schema
 * If the value should be numeric, it tries to convert and then validate
 * also validates if the value is a correct representation in the form of
 * <long> or <integer> etc for integers format 32 or format 64
 * @param {string} value - Value to check for
 * @param {*} schema - The schema portion used in validation
 * @returns {Boolean} the value is the representation of its type
 */
function checkIsCorrectType(value, schema) {
  if (_.has(schema, 'type') &&
    typeof schemaTypeToJsValidator[schema.type] === 'function') {
    const isCorrectType = schemaTypeToJsValidator[schema.type](value);
    if (isCorrectType) {
      return true;
    }
  }
  return isTypeValue(value, schema);
}

module.exports = {

  /**
   * Parses an OAS string/object as a YAML or JSON
   * @param {YAML/JSON} openApiSpec - The OAS 3.x specification specified in either YAML or JSON
   * @param {object} inputValidation - Concrete validator according to version
   * @param {Object} options computed process options
   * @returns {Object} - Contains the parsed JSON-version of the OAS spec, or an error
   * @no-unit-test
   */
  parseSpec: function (openApiSpec, inputValidation, options) {
    var openApiObj = openApiSpec,
      obj,
      rootValidation;

    // If the open api specification is a string could be YAML or JSON
    if (typeof openApiSpec === 'string') {
      obj = parse.getOasObject(openApiSpec);
      if (obj.result) {
        openApiObj = obj.oasObject;
      }
      else {
        return obj;
      }
    }

    // spec is a valid JSON object at this point

    // Validate the root level object for semantics
    rootValidation = inputValidation.validateSpec(openApiObj, options);
    if (!rootValidation.result) {
      return {
        result: false,
        reason: rootValidation.reason
      };
    }

    // Valid openapi root object
    return {
      result: true,
      openapi: rootValidation.openapi
    };
  },

  formatDataPath: function(dataPath) {
    let initialDotIfExist = dataPath[0] === '/' ? '.' : '',
      // AJV returns encoded datapath in mismatches
      decodedDataPath = decodeURIComponent(dataPath),
      splittedDataPath = decodedDataPath.split('/'),
      isANumber = (value) => {
        return !isNaN(value);
      },
      formattedElements = splittedDataPath.map((element, index) => {
        if (element !== '' && isANumber(element)) {
          return `[${element}]`;
        }
        if (element === '' || element[0] === '.') {
          return element;
        }
        if (index === 0 && !initialDotIfExist) {
          return `${element}`;
        }
        return `.${element}`;
      }),
      formattedDataPath = formattedElements.join('');

    return `${formattedDataPath}`;
  },

  handleExclusiveMaximum: function(schema, max) {
    max = _.has(schema, 'maximum') ?
      schema.maximum :
      max;
    if (_.has(schema, 'exclusiveMaximum')) {
      if (typeof schema.exclusiveMaximum === 'boolean') {
        return schema.multipleOf ?
          max - schema.multipleOf :
          max - 1;
      }
      else if (typeof schema.exclusiveMaximum === 'number') {
        return schema.multipleOf ?
          schema.exclusiveMaximum - schema.multipleOf :
          schema.exclusiveMaximum - 1;
      }
    }
    return max;
  },

  handleExclusiveMinimum: function(schema, min) {
    min = _.has(schema, 'minimum') ?
      schema.minimum :
      min;
    if (_.has(schema, 'exclusiveMinimum')) {
      if (typeof schema.exclusiveMinimum === 'boolean') {
        return schema.multipleOf ?
          min + schema.multipleOf :
          min + 1;
      }
      else if (typeof schema.exclusiveMinimum === 'number') {
        return schema.multipleOf ?
          schema.exclusiveMinimum + schema.multipleOf :
          schema.exclusiveMinimum + 1;
      }
    }
    return min;
  },

  /**
   * Removes initial "#/" from a schema path and the last "/type" segment
   * @param {string} schemaPath - The OAS 3.x specification specified in either YAML or JSON
   * @returns {string} - The schemaPath with initial #/ and last "/type" removed
   */
  formatSchemaPathFromAJVErrorToConvertToDataPath: function (schemaPath) {
    let result = removeSharpAndSlashFromFirstPosition(schemaPath),
      keywordsToRemoveFromPath = ['type', 'format', 'maxLength', 'minLength'];

    _.forEach(keywordsToRemoveFromPath, (keyword) => {
      result = removeWordFromLastPosition(result, keyword);
    });

    return result;
  },

  typesMap,

  /**
   * Checks if value is the representation of its type like:
   * "<integer>"
   * Works in array types
   * @param {string} value - Value to check for
   * @param {*} schema - The schema portion used in validation
   * @returns {Boolean} the value is the representation of its type
   */
  isTypeValue,

  /**
   * Checks if value is correct according to schema
   * If the value should be numeric, it tries to convert and then validate
   * also validates if the value is a correct representation in the form of
   * <long> or <integer> etc for integers format 32 or format 64
   * @param {string} value - Value to check for
   * @param {*} schema - The schema portion used in validation
   * @returns {Boolean} the value is the representation of its type
   */
  checkIsCorrectType,


  isKnownType: function(schema) {
    return typeof schemaTypeToJsValidator[schema.type] === 'function';
  },

  getServersPathVars: function(servers) {
    return servers.reduce((acc, current) => {
      const newVarNames = _.has(current, 'variables') ?
        Object.keys(current.variables).filter((varName) => {
          return !acc.includes(varName);
        }) :
        [];
      return [...acc, ...newVarNames];
    }, []);
  }
};
