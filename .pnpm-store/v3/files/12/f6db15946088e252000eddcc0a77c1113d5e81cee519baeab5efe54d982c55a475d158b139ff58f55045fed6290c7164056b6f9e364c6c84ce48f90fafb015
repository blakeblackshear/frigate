'use strict';

const { MODULE_VERSION } = require('./lib/schemapack.js');

const _ = require('lodash'),
  SchemaPack = require('./lib/schemapack.js').SchemaPack,
  UserError = require('./lib/common/UserError'),
  DEFAULT_INVALID_ERROR = 'Provided definition is invalid';

module.exports = {
  // Old API wrapping the new API
  convert: function(input, options, cb) {
    var schema = new SchemaPack(input, options);

    if (schema.validated) {
      return schema.convert(cb);
    }
    return cb(new UserError(_.get(schema, 'validationResult.reason', DEFAULT_INVALID_ERROR)));
  },

  convertV2: function(input, options, cb) {
    var schema = new SchemaPack(input, options, MODULE_VERSION.V2);

    if (schema.validated) {
      return schema.convertV2(cb);
    }

    return cb(new UserError(_.get(schema, 'validationResult.reason', DEFAULT_INVALID_ERROR)));
  },

  convertV2WithTypes: function(input, options, cb) {
    const enableTypeFetching = true;
    var schema = new SchemaPack(input, options, MODULE_VERSION.V2, enableTypeFetching);

    if (schema.validated) {
      return schema.convertV2(cb);
    }

    return cb(new UserError(_.get(schema, 'validationResult.reason', DEFAULT_INVALID_ERROR)));
  },

  validate: function (input) {
    var schema = new SchemaPack(input);
    return schema.validationResult;
  },

  getMetaData: function (input, cb) {
    var schema = new SchemaPack(input);
    schema.getMetaData(cb);
  },

  mergeAndValidate: function (input, cb) {
    var schema = new SchemaPack(input);
    schema.mergeAndValidate(cb);
  },

  getOptions: function(mode, criteria) {
    return SchemaPack.getOptions(mode, criteria);
  },

  detectRootFiles: async function(input) {
    var schema = new SchemaPack(input);
    return schema.detectRootFiles();
  },

  detectRelatedFiles: async function(input) {
    var schema = new SchemaPack(input);
    return schema.detectRelatedFiles();
  },

  bundle: async function(input) {
    var schema = new SchemaPack(input, _.has(input, 'options') ? input.options : {});
    return schema.bundle();
  },

  // new API
  SchemaPack
};
