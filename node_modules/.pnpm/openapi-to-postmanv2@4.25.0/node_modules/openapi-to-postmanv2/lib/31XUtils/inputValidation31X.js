const _ = require('lodash');
module.exports = {

  /**
   * Validate Spec to check if some of the required fields are present.
   * OpenAPI 3.1 only openapi and info are always required,
   * but the document must also contain at least one of paths or webhooks or components.
   * @param {Object} spec OpenAPI spec
   * @param {Object} options computed process options
   * @return {Object} Validation result
   */
  validateSpec: function (spec, options) {
    const includeWebhooksOption = options.includeWebhooks;
    if (_.isNil(spec)) {
      return {
        result: false,
        reason: 'The Specification is null or undefined'
      };
    }
    if (_.isNil(spec.openapi)) {
      return {
        result: false,
        reason: 'Specification must contain a semantic version number of the OAS specification'
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

    if (_.isNil(spec.paths) && !includeWebhooksOption) {
      return {
        result: false,
        reason: 'Specification must contain Paths Object for the available operational paths'
      };
    }

    if (includeWebhooksOption && _.isNil(spec.paths) &&
      _.isNil(spec.webhooks) && _.isNil(spec.components)) {
      return {
        result: false,
        reason: 'Specification must contain either Paths, Webhooks or Components sections'
      };
    }

    return {
      result: true,
      openapi: spec
    };
  }
};
