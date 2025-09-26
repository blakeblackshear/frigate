const Ajv = require('../../assets/ajv6faker'),
  draft4MetaSchema = require('../../assets/json-schema-draft-04.json');

/**
 * Used to validate schema against a value.
 *
 * @param {*} schema - schema to validate
 * @param {*} valueToUse - value to validate schema against
 * @param {*} options - a standard list of options that's globally passed around. Check options.js for more.
 * @returns {*} - Found Validation Errors
 */
function validateSchemaAJVDraft04 (schema, valueToUse) {
  let ajv,
    validate,
    filteredValidationError;

  try {
    // add Ajv options to support validation of OpenAPI schema.
    // For more details see https://ajv.js.org/#options
    ajv = new Ajv({
      // check all rules collecting all errors. instead returning after the first error.
      allErrors: true,
      strict: false,
      schemaId: 'id',
      unknownFormats: ['int32', 'int64'],
      nullable: true
    });
    ajv.addMetaSchema(draft4MetaSchema);
    validate = ajv.compile(schema);
    validate(valueToUse);
  }
  catch (e) {
    // something went wrong validating the schema
    // input was invalid. Don't throw mismatch
    return { filteredValidationError };
  }

  if (validate.errors && validate.errors.length > 0) {
    let mapped = validate.errors.map(((error) => {
      return {
        instancePath: error.dataPath,
        keyword: error.keyword,
        message: error.message,
        params: error.params,
        schemaPath: error.schemaPath
      };
    }));
    validate.errors = mapped;
  }
  return { filteredValidationError, validate };
}

module.exports = {
  validateSchemaAJVDraft04
};
