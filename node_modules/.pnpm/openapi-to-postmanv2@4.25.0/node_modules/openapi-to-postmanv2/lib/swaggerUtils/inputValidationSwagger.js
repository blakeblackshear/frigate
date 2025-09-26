const _ = require('lodash');
module.exports = {

  /**
   * Validate Spec to check if some of the required fields are present.
   * @param {Object} spec OpenAPI spec
   * @param {object} options Validation options
   * @return {Object} Validation result
   */
  validateSpec: function (spec, options) {
    if (_.isNil(spec)) {
      return {
        result: false,
        reason: 'The Specification is null or undefined'
      };
    }
    if (spec.swagger !== '2.0') {
      return {
        result: false,
        reason: 'The value of "swagger" field must be 2.0'
      };
    }
    if (!spec.info) {
      return {
        result: false,
        reason: 'The Swagger specification must have an "info" field'
      };
    }
    if (!(_.get(spec, 'info.title') && _.get(spec, 'info.version')) && !options.isFolder) {
      return {
        result: false,
        reason: 'Title, and version fields are required for the Info Object'
      };
    }
    if (!spec.paths) {
      return {
        result: false,
        reason: 'The Swagger specification must have a "paths" field'
      };
    }

    // Valid. No reason needed
    return {
      result: true,
      openapi: spec
    };
  }
};
