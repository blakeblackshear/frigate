const _ = require('lodash');
module.exports = {

  /**
   * Validate Spec to check if some of the required fields are present.
   *
   * @param {Object} spec OpenAPI spec
   * @return {Object} Validation result
   */
  validateSpec: function (spec) {
    if (_.isNil(spec)) {
      return {
        result: false,
        reason: 'The Specification is null or undefined'
      };
    }
    // Checking for the all the required properties in the specification
    if (_.isNil(spec.openapi)) {
      return {
        result: false,
        reason: 'Specification must contain a semantic version number of the OAS specification'
      };
    }

    if (_.isNil(spec.paths)) {
      return {
        result: false,
        reason: 'Specification must contain Paths Object for the available operational paths'
      };
    }

    if (_.isNil(spec.info)) {
      return {
        result: false,
        reason: 'Specification must contain an Info Object for the meta-data of the API'
      };
    }

    if (!_.has(spec.info, '$ref')) {
      if (_.isNil(_.get(spec, 'info.title'))) {
        return {
          result: false,
          reason: 'Specification must contain a title in order to generate a collection'
        };
      }

      if (_.isNil(_.get(spec, 'info.version'))) {
        return {
          result: false,
          reason: 'Specification must contain a semantic version number of the API in the Info Object'
        };
      }
    }

    // Valid specification
    return {
      result: true,
      openapi: spec
    };
  }
};
