const inputValidation30X = require('./inputValidation'),
  schemaUtilsCommon = require('../common/schemaUtilsCommon'),
  _ = require('lodash');


module.exports = {
  version: '3.0.x',

  /**
     * Parses an OAS string/object as a YAML or JSON
     * @param {YAML/JSON} openApiSpec - The OAS 3.x specification specified in either YAML or JSON
     * @param {object} options - The parsing options
     * @returns {Object} - Contains the parsed JSON-version of the OAS spec, or an error
     * @no-unit-test
     */
  parseSpec: function (openApiSpec, options) {
    return schemaUtilsCommon.parseSpec(openApiSpec, inputValidation30X, options);
  },

  /**
   * Get the required elements for conversion from spec parsed data
   * @param {object} spec openapi parsed value
   * @returns {object} required elements to convert
   */
  getRequiredData(spec) {
    return {
      info: spec.info,
      components: spec.components ? spec.components : [],
      paths: spec.paths
    };
  },

  /**
   * Compares two types and return if they match or not
   * @param {string} currentType the type in schema
   * @param {string} typeToValidate the type to compare
   * @returns {boolean} the result of the comparation
   */
  compareTypes(currentType, typeToValidate) {
    return currentType === typeToValidate;
  },

  /**
   * This method is to make this module matches with schemaUtilsXXX interface content
   * It only returns the provided schema
   * @param {object} schema a provided schema
   * @returns {object} it returns the same schema
   */
  fixExamplesByVersion(schema) {
    return schema;
  },

  /**
   * Check if request body type is binary type
   * @param {string} bodyType the bodyType provided in a request body content
   * @param {object} contentObj The request body content provided in spec
   * @returns {boolean} Returns true if content is a binary type
   */
  isBinaryContentType (bodyType, contentObj) {
    return bodyType &&
      !_.isEmpty(_.get(contentObj, [bodyType, 'schema'])) &&
      contentObj[bodyType].schema.type === 'string' &&
      contentObj[bodyType].schema.format === 'binary';
  },

  getOuterPropsIfIsSupported() {
    return undefined;
  },

  addOuterPropsToRefSchemaIfIsSupported(refSchema) {
    return refSchema;
  },
  inputValidation: inputValidation30X
};
