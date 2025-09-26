/* eslint-disable */

var Converter = require('./index.js'),
  fs = require('fs'),
  path = require('path'),
  VALID_OPENAPI_PATH = './test/data/validationData/spec-to-validate-against.json',
  HISTORY_PATH = './test/data/validationData/history_obj.json';

var openapi = JSON.parse(fs.readFileSync(path.join(__dirname, VALID_OPENAPI_PATH), 'utf8')),
  historyRequest = JSON.parse(fs.readFileSync(path.join(__dirname, HISTORY_PATH), 'utf8'));

let schemaPack = new Converter.SchemaPack({ type: 'json', data: openapi }, {});

schemaPack.validateTransaction(historyRequest, (err, result) => {
  // result is as described in the Schema <> Validation Doc
});
