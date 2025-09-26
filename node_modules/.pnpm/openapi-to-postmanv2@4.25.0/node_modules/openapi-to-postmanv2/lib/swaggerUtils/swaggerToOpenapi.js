const Swagger2OpenAPI = require('swagger2openapi'),
  { isSwagger } = require('../common/versionUtils');

module.exports = {

  /**
   * Converts a Swagger 2.0 API definition into an OpenAPI 3.0 specification
   * @param {Object} concreteUtils Concrete schema utils according to the specification version
   * @param {object} parsedSwagger Parsed Swagger spec
   * @param {function} convertExecution Function to perform the OAS-PM convertion after the Spec convertion
   * @return {Object} {error, newOpenapi} The new open api spec or error if there was an error in the process
   */
  convertToOAS30IfSwagger: function(concreteUtils, parsedSwagger, convertExecution) {
    if (isSwagger(concreteUtils.version)) {
      Swagger2OpenAPI.convertObj(
        parsedSwagger,
        {
          fatal: false,
          patch: true,
          anchors: true,
          warnOnly: true
        },
        (error, newOpenapi) => {
          if (error) {
            return convertExecution(error);
          }
          return convertExecution(null, newOpenapi.openapi);
        }
      );
    }
    else {
      return convertExecution(null, parsedSwagger);
    }
  }
};
