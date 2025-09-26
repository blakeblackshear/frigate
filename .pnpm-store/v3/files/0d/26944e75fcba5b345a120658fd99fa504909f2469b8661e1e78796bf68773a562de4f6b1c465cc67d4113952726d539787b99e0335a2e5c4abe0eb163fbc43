const Ajv = require('ajv'),
  Ajv2019 = require('ajv/dist/2019'),
  addFormats = require('ajv-formats'),
  draft7MetaSchema = require('ajv/dist/refs/json-schema-draft-07.json'),
  draft6MetaSchema = require('ajv/dist/refs/json-schema-draft-06.json'),
  drafts2019 = ['https://json-schema.org/draft/2019-09/schema', 'https://json-schema.org/draft/2020-12/schema'],
  draft06 = 'http://json-schema.org/draft-06/schema#',
  draft07 = 'http://json-schema.org/draft-07/schema#';

/**
* Used to validate schema against a value.
* NOTE: Used in assets/json-schema-faker.js to validate schema example
* @param {*} draftToUse - draft to use in this validation
* @returns {*} - Found Validation Errors
*/
function buildValidatorObject(draftToUse) {
  if (drafts2019.includes(draftToUse)) {
    return new Ajv2019({
      // check all rules collecting all errors. instead returning after the first error.
      allErrors: true,
      strict: false
    });
  }
  let ajv = new Ajv({
    // check all rules collecting all errors. instead returning after the first error.
    allErrors: true,
    strict: false
  });

  if (draftToUse === draft06) {
    ajv.addMetaSchema(draft6MetaSchema);
  }

  if (draftToUse === draft07) {
    ajv.addMetaSchema(draft7MetaSchema);
  }
  return ajv;
}

/**
 * Used to validate schema against a value.
 *
 * @param {*} schema - schema to validate
 * @param {*} valueToUse - value to validate schema against
 * @param {*} draftToUse - draft to use in this validation
 * @param {*} options - a standard list of options that's globally passed around. Check options.js for more.
 * @returns {*} - Found Validation Errors
 */
function validateSchemaAJV (schema, valueToUse, draftToUse) {
  let ajv,
    validate,
    filteredValidationError;

  try {
    // add Ajv options to support validation of OpenAPI schema.
    // For more details see https://ajv.js.org/#options
    ajv = buildValidatorObject(draftToUse);
    addFormats(ajv);
    validate = ajv.compile(schema);
    validate(valueToUse);
  }
  catch (e) {
    // something went wrong validating the schema
    // input was invalid. Don't throw mismatch
    return { filteredValidationError };
  }
  return { filteredValidationError, validate };
}

module.exports = {
  validateSchemaAJV
};
