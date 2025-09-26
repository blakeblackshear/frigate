const _ = require('lodash'),
  VERSION_30 = { key: 'openapi', version: '3.0' },
  VERSION_31 = { key: 'openapi', version: '3.1' },
  VERSION_20 = { key: 'swagger', version: '2.0' },
  GENERIC_VERSION2 = { key: 'swagger', version: '2.' },
  GENERIC_VERSION3 = { key: 'openapi', version: '3.' },
  DEFAULT_SPEC_VERSION = VERSION_30.version,
  SWAGGER_VERSION = VERSION_20.version,
  VERSION_3_1 = VERSION_31.version,
  fs = require('fs'),
  { RULES_30 } = require('./../bundleRules/spec30'),
  { RULES_31 } = require('./../bundleRules/spec31'),
  { RULES_20 } = require('./../bundleRules/spec20');

/**
 * gets the version key and the version and generates a regular expression that
 * could be used to match with any content
 * @param {*} key could be 'openapi' or 'swagger' depending on the version of
 * provided spec
 * @param {*} version could be 2. or 3. depending on the provided spec
 * @returns {object} the resultant regular expresion using the provided data
 */
function getVersionRegexp({ key, version }) {
  return new RegExp(`${key}['|"]?\\s*:\\s*[\\\]?['|"]?${version}`);
}

/**
 * When the array of files is provided as a list of parsed objects
 * it returns the content from file that contains the version data
 * @param {array} data An array of the provided file's content parsed
 * @returns {object} object with hasDefinedVersion property and
 * The content of the file that contains the version data
 */
function getFileByContent(data) {
  const version2RegExp = getVersionRegexp(GENERIC_VERSION2),
    version3RegExp = getVersionRegexp(GENERIC_VERSION3),
    file = data.find((element) => {
      return element.content.match(version2RegExp) || element.content.match(version3RegExp);
    });
  return file.content;
}

/**
   * compares a version with an input
   * @param {string} input The input to compare
   * @param {string} version The version that will be used
   * @returns {boolean} wheter the input corresponds to the version
   */
function compareVersion(input, version) {
  let numberInput,
    numberVersion;
  numberInput = parseFloat(input);
  numberVersion = parseFloat(version);
  if (!isNaN(numberInput) && !isNaN(numberVersion)) {
    return numberInput === numberVersion;
  }
  return false;
}

/**
 * Determins the version regex according to the specificationVersion
 * @param {string} specificationVersion the string of the desired version
 * @returns {object} the resultant regular expresion using the provided data
 */
function getVersionRegexBySpecificationVersion(specificationVersion) {
  let versionRegExp;
  if (compareVersion(specificationVersion, '2.0')) {
    versionRegExp = getVersionRegexp(VERSION_20);
  }
  else if (compareVersion(specificationVersion, '3.1')) {
    versionRegExp = getVersionRegexp(VERSION_31);
  }
  else {
    versionRegExp = getVersionRegexp(VERSION_30);
  }
  return versionRegExp;
}

/**
 * When the array of files is provided as a list of parsed objects
 * it returns the content from file that contains the version data
 * specified in the specificationVersion parameter
 * @param {array} data An array of the provided file's content parsed
 * @param {string} specificationVersion the string of the desired version
 * @returns {object} object with hasDefinedVersion property and
 * The content of the file that contains the version data
 */
function getFileByContentSpecificationVersion(data, specificationVersion) {
  let versionRegExp,
    file;
  versionRegExp = getVersionRegexBySpecificationVersion(specificationVersion);
  file = data.find((element) => {
    return element.content.match(versionRegExp);
  });
  if (!file) {
    throw new Error('Not files with version');
  }
  return file.content;
}

/**
 * When the array of files is provided as a list of file's paths it returns the
 * content of the file that contains the version data
 * @param {array} data The array of files in the folder provided by the user
 * @returns {string} the content of the file that contains the version data
 */
function getFileByFileName(data) {
  const version2RegExp = getVersionRegexp(GENERIC_VERSION2),
    version3RegExp = getVersionRegexp(GENERIC_VERSION3);
  let file = data.map((element) => {
    return fs.readFileSync(element.fileName, 'utf8');
  }).find((content) => {
    return content.match(version2RegExp) || content.match(version3RegExp);
  });
  return file;
}

/**
 * When the array of files is provided as a list of file's paths it returns the
 * content of the file that contains the version data
 * @param {array} data The array of files in the folder provided by the user
 * @param {string} specificationVersion the string of the desired version
 * @returns {string} the content of the file that contains the version data
 */
function getFileByFileNameSpecificVersion(data, specificationVersion) {
  const versionRegExp = getVersionRegexBySpecificationVersion(specificationVersion);

  let file = data.map((element) => {
    return fs.readFileSync(element.fileName, 'utf8');
  }).find((content) => {
    return content.match(versionRegExp);
  });
  return file;
}

/** When the user provides a folder, this function returns the file
 * that contains the version data
 * @param {array} data An array of file's paths
 * @param {string} specificationVersion the string of the desired version
 * @returns {object} object with hasDefinedVersion property and
 * The content of the file that contains the version data
 */
function getFileWithVersion(data, specificationVersion) {
  let file;

  if (_.has(data[0], 'content')) {
    if (specificationVersion) {
      file = getFileByContentSpecificationVersion(data, specificationVersion);
    }
    else {
      file = getFileByContent(data);
    }
  }
  else if (_.has(data[0], 'fileName')) {
    if (specificationVersion) {
      file = getFileByFileNameSpecificVersion(data, specificationVersion);
    }
    else {
      file = getFileByFileName(data);
    }

  }
  return file;
}

/**
 * Gets the named version constant from an string input
 * @param {string} version The spec version we are bundling
 * @returns {string} The constant version
 */
function getVersionByStringInput(version) {
  if (!version) {
    return false;
  }
  let found = [DEFAULT_SPEC_VERSION, SWAGGER_VERSION, VERSION_3_1].find((supportedVersion) => {
    return compareVersion(version, supportedVersion);
  });
  return found;
}

/**
 * Return the version of the provided specification
 * @param {string} spec Data from input file
 * @returns {string} version of specification
 */
function getSpecVersion({ type, data, specificationVersion }) {
  if (!data) {
    return DEFAULT_SPEC_VERSION;
  }
  if (['multiFile'].includes(type)) {
    if (!specificationVersion) {
      return DEFAULT_SPEC_VERSION;
    }
    return getVersionByStringInput(specificationVersion);
  }

  if (['folder'].includes(type)) {
    data = getFileWithVersion(data, specificationVersion);
  }
  else if (['file'].includes(type)) {
    try {
      data = fs.readFileSync(data, 'utf8');
    }
    catch (error) {
      return DEFAULT_SPEC_VERSION; // If path is invalid it will follow the OAS 3.0 way
    }
  }

  if (type === 'json') {
    data = JSON.stringify(data);
  }
  const openapi30 = getVersionRegexp(VERSION_30),
    openapi31 = getVersionRegexp(VERSION_31),
    openapi20 = getVersionRegexp(VERSION_20),
    is30 = typeof data === 'string' && data.match(openapi30),
    is31 = typeof data === 'string' && data.match(openapi31),
    is20 = typeof data === 'string' && data.match(openapi20);

  let version = DEFAULT_SPEC_VERSION;

  if (is30) {
    version = VERSION_30.version;
  }
  else if (is31) {
    version = VERSION_31.version;
  }
  else if (is20) {
    version = VERSION_20.version;
  }
  return version;
}

/**
 *
 * @param {string} specVersion - the OAS specification version
 * @returns {NodeRequire} the schema utils according to version
 */
function getConcreteSchemaUtils({ type, data, specificationVersion }) {
  const specVersion = getSpecVersion({ type, data, specificationVersion });
  let concreteUtils = {};

  if (specVersion === DEFAULT_SPEC_VERSION) {
    concreteUtils = require('../30XUtils/schemaUtils30X');
  }
  else if (specVersion === VERSION_20.version) {
    concreteUtils = require('../swaggerUtils/schemaUtilsSwagger');
  }
  else {
    concreteUtils = require('../31XUtils/schemaUtils31X');
  }
  return concreteUtils;
}

/**
   * Filter the options by the version provided by the user
   * @param {array} options The options to be filtered
   * @param {string} version The version that will be used
   * @returns {array} the filtered options related to the version used
   */
function filterOptionsByVersion(options, version) {
  options = options.filter((option) => {
    return option.supportedIn.includes(version);
  });
  return options;
}

/**
 * Calculates if thew current input is using swagger 2.0 spec
 * @param {string} version The current spec version
 * @returns {boolean} True if the current spec is using swagger 2.0 spec
 */
function isSwagger(version) {
  return compareVersion(version, VERSION_20.version);
}

/**
 * Validates if the input version is valid
 * @param {string} version The current spec version
 * @returns {boolean} True if the current version is supported
 */
function validateSupportedVersion(version) {
  if (!version) {
    return false;
  }
  let isValid = [DEFAULT_SPEC_VERSION, VERSION_3_1, SWAGGER_VERSION].find((supportedVersion) => {
    return compareVersion(version, supportedVersion);
  });
  return isValid !== undefined;
}

/**
 * Return the bundling rules to follow in the bundling process
 * @param {string} version The spec version we are bundling
 * @returns {object} The bundling rules related with the spec
 */
function getBundleRulesDataByVersion(version) {
  const is31 = compareVersion(version, VERSION_31.version),
    is20 = compareVersion(version, VERSION_20.version);
  if (is20) {
    return RULES_20;
  }
  else if (is31) {
    return RULES_31;
  }
  else {
    return RULES_30;
  }
}

/**
 * Gets the version of a parsed Spec
 * @param {object} spec The parsed openapi spec
 * @returns {object} The bundling rules related with the spec
 */
function getVersionFromSpec(spec) {
  if (!_.isNil(spec) && _.has(spec, 'swagger')) {
    return spec.swagger;
  }
  if (!_.isNil(spec) && _.has(spec, 'openapi')) {
    return spec.openapi;
  }
}

module.exports = {
  getSpecVersion,
  getConcreteSchemaUtils,
  filterOptionsByVersion,
  isSwagger,
  compareVersion,
  getVersionRegexBySpecificationVersion,
  SWAGGER_VERSION,
  VERSION_3_1,
  validateSupportedVersion,
  getBundleRulesDataByVersion,
  getVersionFromSpec
};
