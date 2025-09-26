const { formatDataPath,
  formatSchemaPathFromAJVErrorToConvertToDataPath,
  isTypeValue } = require('../common/schemaUtilsCommon');

var _ = require('lodash');
const IGNORED_KEYWORDS = ['propertyNames', 'const', 'additionalItems', 'dependencies'],
  { validateSchemaAJV } = require('./ajvValidator'),
  { validateSchemaAJVDraft04 } = require('./ajvValidatorDraft04'),
  specialDraft = 'http://json-schema.org/draft-04/schema#';

/**
 * Checks if value is postman variable or not
 *
 * @param {*} value - Value to check for
 * @returns {Boolean} postman variable or not
 */
function isPmVariable (value) {
  // collection/environment variables are in format - {{var}}
  return _.isString(value) && _.startsWith(value, '{{') && _.endsWith(value, '}}');
}

/**
 * returns the local $schema value
 *
 * @param {*} schema - Schema to obtain the draft definition
 * @returns {string} the id
 */
function getLocalDraft(schema) {
  return schema.$schema;
}

/**
 * Gets the correct validator according to the draft
 *
 * @param {string} draftToUse - the draft to use in validation
 * @returns {string} the draft identifier
 */
function getAjvValidator(draftToUse) {
  return draftToUse === specialDraft ? validateSchemaAJVDraft04 : validateSchemaAJV;
}

/**
 * Defines the draft to use in validation
 *
 * @param {string} localDraft - the draft from the schema object
 * @param {string} jsonSchemaDialect - the draft from the OAS object
 * @returns {string} the draft to use
 */
function getDraftToUse(localDraft, jsonSchemaDialect) {
  return localDraft ? localDraft : jsonSchemaDialect;
}

/**
 * Filter composite schema related mismatches.
 *
 * @param {*} schema - schema to validate
 * @param {Array} validationMismatches - Array of standard AJV mismatches
 * @returns {Array} Filtered mismatches after removing composite schema mismatches for valid data
 */
function filterCompositeSchemaErrors (schema, validationMismatches) {
  _.forEach(['anyOf', 'oneOf'], (compositeSchemaKeyword) => {
    const compositeSchemaMismatches = _.filter(validationMismatches, (validationMismatch) => {
      return validationMismatch.keyword === compositeSchemaKeyword &&
        _.endsWith(validationMismatch.schemaPath, compositeSchemaKeyword);
    });

    _.forEach(compositeSchemaMismatches, (compositeSchemaMismatch) => {
      let compositeSchemaMismatchPath = compositeSchemaMismatch.schemaPath,
        schemaDataPath = formatDataPath(formatSchemaPathFromAJVErrorToConvertToDataPath(compositeSchemaMismatchPath)),
        schemaToUse = schemaDataPath ? _.get(schema, schemaDataPath) : schema,
        isCompositeSchemaValid = false;

      if (!_.isArray(schemaToUse)) {
        return false;
      }

      for (let index = 0; index < schemaToUse.length; index++) {
        const isCurrentElementInvalid = _.some(validationMismatches, (mismatch) => {
          return _.startsWith(mismatch.schemaPath, compositeSchemaMismatchPath + `/${index}`);
        });

        if (!isCurrentElementInvalid) {
          isCompositeSchemaValid = true;
          break;
        }
      }

      if (isCompositeSchemaValid) {
        validationMismatches = _.reject(validationMismatches, (mismatch) => {
          return _.startsWith(mismatch.schemaPath, compositeSchemaMismatchPath);
        });
      }
    });
  });

  return validationMismatches;
}

/**
 * Used to validate schema against a value.
 * NOTE: Used in assets/json-schema-faker.js to validate schema example
 *
 * @param {*} schema - schema to validate
 * @param {*} valueToUse - value to validate schema against
 * @param {*} options - a standard list of options that's globally passed around. Check options.js for more.
 * @param {string} jsonSchemaDialect - the defined schema in the OAS object
 * @returns {*} - Found Validation Errors
 */
function validateSchema (schema, valueToUse, options = {}, jsonSchemaDialect) {
  let validate,
    compoundResult,
    filteredValidationError,
    localDraft = getLocalDraft(schema),
    draftToUse = getDraftToUse(localDraft, jsonSchemaDialect);
  const validator = getAjvValidator(draftToUse);
  compoundResult = validator(schema, valueToUse, draftToUse);
  if (compoundResult.filteredValidationError) {
    return filteredValidationError;
  }
  validate = compoundResult.validate;

  // Filter validation errors for following cases
  filteredValidationError = _.filter(_.get(validate, 'errors', []), (validationError) => {
    let dataPath = _.get(validationError, 'instancePath', '');
    dataPath = formatDataPath(dataPath);

    // discard the leading '.' if it exists
    if (dataPath[0] === '.') {
      dataPath = dataPath.slice(1);
    }

    // for invalid `propertyNames` two error are thrown by Ajv, which include error with `pattern` keyword
    if (validationError.keyword === 'pattern' && _.has(validationError, 'propertyName')) {
      return false;
    }

    // As OAS only supports some of Json Schema keywords, and Ajv is supporting all keywords from Draft 7
    // Remove keyword currently not supported in OAS to make both compatible with each other
    else if (_.includes(IGNORED_KEYWORDS, validationError.keyword)) {
      return false;
    }

    // Ignore unresolved variables from mismatch if option is set
    else if (options.ignoreUnresolvedVariables &&
      isPmVariable(dataPath === '' ? valueToUse : _.get(valueToUse, dataPath))) {
      return false;
    }

    if (validationError.keyword === 'type' || validationError.keyword === 'format' ||
      ((validationError.keyword === 'minLength' || validationError.keyword === 'maxLength') &&
      _.get(options, 'parametersResolution') === 'schema')
    ) {
      let schemaDataPath = formatDataPath(formatSchemaPathFromAJVErrorToConvertToDataPath(validationError.schemaPath)),
        schemaToUse = schemaDataPath ? _.get(schema, schemaDataPath) : schema,
        valueToValidate = dataPath ? _.get(valueToUse, dataPath) : valueToUse;
      return !isTypeValue(valueToValidate, schemaToUse);
    }

    return true;
  });

  /**
   * AJV will provide mismatches for all elements of composite schema and as we consider
   *  a schema valid after filtering. Now even though one element is valid,
   *  AJV mismatches for other elements still remains. Such mismatches will be filtered here.
   */
  filteredValidationError = filterCompositeSchemaErrors(schema, filteredValidationError);

  // sort errors based on dataPath, as this will ensure no overriding later
  filteredValidationError = _.sortBy(filteredValidationError, ['dataPath']);

  return filteredValidationError;
}

module.exports = {
  validateSchema,
  getLocalDraft,
  getAjvValidator,
  getDraftToUse,
  isTypeValue
};
