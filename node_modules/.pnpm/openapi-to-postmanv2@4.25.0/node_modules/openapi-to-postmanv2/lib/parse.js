var yaml = require('js-yaml'),
  fs = require('fs'),
  _ = require('lodash'),
  // use path based on platform it's running on (web or node)
  path = require('path'),
  pathBrowserify = require('path-browserify'),
  resolver = require('oas-resolver-browser'),
  yamlParse = require('yaml'),
  { compareVersion, getVersionFromSpec } = require('./common/versionUtils.js');
const BROWSER = 'browser',
  YAML_FORMAT = 'yaml',
  JSON_FORMAT = 'json',
  UNSUPPORTED_FORMAT = 'unsupported';

/** Converts OpenAPI input to OpenAPI Object
* @param {String} spec OpenAPI input in string
* @returns {boolean} wheter the input looks like a json
*/
function looksLikeJson(spec) {
  return typeof spec === 'string' && spec.startsWith('{');
}

module.exports = {

  asJson: function (spec) {
    try {
      return JSON.parse(spec);
    }
    catch (jsonException) {
      throw new SyntaxError(`Specification is not a valid JSON. ${jsonException}`);
    }
  },

  asYaml: function (spec) {
    try {
      let obj = yaml.load(spec, {
        schema: yaml.JSON_SCHEMA
      });
      // yaml.safeLoad does not throw errors for most of the cases in invalid yaml
      // yaml.safeLoad is removed in js-yaml 4. Hence Using yaml.load instead, which is now safe by default.
      // hence check if it returned an object
      if (typeof obj !== 'object') {
        throw new Error('');
      }
      return obj;
    }
    catch (yamlException) {
      throw new SyntaxError(`Specification is not a valid YAML. ${yamlException}`);
    }
  },

  /** Converts OpenAPI input to OpenAPI Object
   * @param {String} openApiSpec OpenAPI input in string
   * @returns {Object} oasObject
   */
  getOasObject: function (openApiSpec) {
    let oasObject = openApiSpec,
      inputFormat = UNSUPPORTED_FORMAT,
      detailedError = 'Invalid format. Input must be in YAML or JSON format.';
    try {
      oasObject = this.asYaml(openApiSpec);
      inputFormat = looksLikeJson(openApiSpec) ? JSON_FORMAT : YAML_FORMAT;
    }
    catch (yamlException) {
      // Not valid YAML, could be a JSON as well
      try {
        oasObject = this.asJson(openApiSpec);
        inputFormat = JSON_FORMAT;
      }
      catch (jsonException) {
        // It's neither JSON nor YAML
        // try and determine json-ness or yaml-ness
        if (openApiSpec && openApiSpec[0] === '{') {
          // probably JSON
          detailedError += ' ' + jsonException.message;
        }
        else if (openApiSpec && openApiSpec.indexOf('openapi:') === 0) {
          // probably YAML
          detailedError += ' ' + yamlException.message;
        }
        return {
          result: false,
          reason: detailedError
        };
      }
    }

    return {
      result: true,
      oasObject,
      inputFormat
    };
  },

  /** Given an array of files returns the root OAS file if present
   *
   * @param {Array} input input object that contains files array
   * @param {Object} inputValidation Validator according to version
   * @param {Object} options computed process options
   * @param {Object} files Files map
   * @param {string} specificationVersion the string of the desired version
   * @param {boolean} allowReadingFS wheter to allow reading content from file system
   * @return {String} rootFile
   */
  getRootFiles: function (input, inputValidation, options, files = {}, specificationVersion,
    allowReadingFS = true) {
    let rootFilesArray = [],
      filesPathArray = input.data,
      origin = input.origin || '';
    filesPathArray.forEach((filePath) => {
      let obj,
        file,
        oasObject;
      try {
        if (origin === BROWSER) {
          path = pathBrowserify;
        }
        // Use files map if present to read files.
        if (!_.isEmpty(files)) {
          file = files[path.resolve(filePath.fileName)];
        }
        else if (allowReadingFS) {
          file = fs.readFileSync(filePath.fileName, 'utf8');
        }

        obj = this.getOasObject(file);

        if (obj.result) {
          oasObject = obj.oasObject;
        }
        else {
          // Ignore this file.
          return;
        }
        if (inputValidation.validateSpec(oasObject, options).result) {
          if (specificationVersion) {
            if (compareVersion(specificationVersion, getVersionFromSpec(oasObject))) {
              rootFilesArray.push(filePath.fileName);
            }
          }
          else {
            rootFilesArray.push(filePath.fileName);
          }
        }
      }
      catch (e) {
        throw new Error(e.message);
      }
    });
    return rootFilesArray;
  },

  /**
   * Resolve file references and generate single OAS Object
   *
   * @param {Object} openapi OpenAPI
   * @param {Object} options options
   * @param {Object} files Map of files path and content
   * @return {Object} Resolved content
   */
  resolveContent: function (openapi, options, files) {
    return resolver.resolve(openapi, options.source, {
      options: Object.assign({}, options),
      resolve: true,
      cache: [],
      externals: [],
      externalRefs: {},
      rewriteRefs: true,
      openapi: openapi,
      files: files,
      browser: options.browser || '',
      resolveInternal: true
    });
  },

  /** Resolves all OpenAPI file references and returns a single OAS Object
   *
   * @param {Object} source Root file path
   * @param {Object} options Configurable options as per oas-resolver module.
   * @param {Object} files Map of files path and content
   * @return {Object} Resolved OpenAPI Schema
   */
  mergeFiles: function(source, options = {}, files = {}) {
    options.source = source;
    options.origin = source;

    // Use files map if present instead of reading files.
    if (!_.isEmpty(files)) {

      // Use pathBrowserify if the origin of input is browser.
      if (options.browser) {
        path = pathBrowserify;
      }

      let content = files[path.resolve(source)],
        unresolved;
      try {
        unresolved = yamlParse.parse(content, { prettyErrors: true });
      }
      // Used to indicate to users where is the issue with their API
      catch (err) {
        throw new Error('\nLine: ' + err.linePos.start.line + ', col: ' +
          err.linePos.start.col + ' ' + err.message);
      }
      return new Promise((resolve, reject) => {
        return this.resolveContent(unresolved, options, files)
          .then((result) => {
            return resolve(result.openapi);
          }, (err) => {
            return reject(err);
          });
      });
    }
    return this.readFileAsync(source, 'utf8')
      .then((content) => {
        try {
          return yamlParse.parse(content, { prettyErrors: true });
        }
        catch (err) {
          throw new Error('\nLine: ' + err.linePos.start.line + ', col: ' +
           err.linePos.start.col + ' ' + err.message);
        }
      }, (err) => {
        throw new Error(err.message);
      })
      .then((unresolved) => {
        if (options.resolve === true) {
          return this.resolveContent(unresolved, options);
        }
      }, (err) => {
        throw err;
      })
      .then((result) => {
        return result.openapi;
      }, (err) => {
        throw err;
      });
  },

  /** Read File asynchronously
   *
   * @param {String} filePath Path of the file.
   * @param {String} encoding encoding
   * @return {String} Contents of the file
   */
  readFileAsync: function(filePath, encoding) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, encoding, (err, data) => {
        if (err) { reject(err); }
        else { resolve(data); }
      });
    });
  },

  /**
   * Serializes the given API as JSON, using the given spaces for formatting.
   *
   * @param {object} api specification to parse
   * @param {string|number} spaces number of spaces to use for tabulation
   *
   * @return {String} Contents of the file in json format
   */
  toJSON: function (api, spaces) {
    return JSON.stringify(api, null, spaces);
  },

  /**
   * Serializes the given API as YAML, using the given spaces for formatting.
   *
   * @param {object} api API to convert to YAML
   * @param {string|number} spaces number of spaces to ident
   * @param {number} lineWidth set max line width. (default: 80)
   *
   * @return {String} Contents of the file in yaml format
   */
  toYAML: function (api, spaces, lineWidth) {
    return yaml.dump(api, {
      indent: spaces,
      lineWidth: lineWidth,
      noRefs: true
    });
  },
  YAML_FORMAT,
  JSON_FORMAT

};
