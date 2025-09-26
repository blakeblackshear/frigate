"use strict";

var _fs = require("fs");
var _path = require("path");
var _package = require("../package.json");
var _globals = _interopRequireDefault(require("./globals.json"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// copied from https://github.com/babel/babel/blob/d8da63c929f2d28c401571e2a43166678c555bc4/packages/babel-helpers/src/helpers.js#L602-L606
/* istanbul ignore next */
const interopRequireDefault = obj => obj && obj.__esModule ? obj : {
  default: obj
};
const importDefault = moduleName =>
// eslint-disable-next-line @typescript-eslint/no-require-imports
interopRequireDefault(require(moduleName)).default;
const rulesDir = (0, _path.join)(__dirname, 'rules');
const excludedFiles = ['__tests__', 'detectJestVersion', 'utils'];
const rules = Object.fromEntries((0, _fs.readdirSync)(rulesDir).map(rule => (0, _path.parse)(rule).name).filter(rule => !excludedFiles.includes(rule)).map(rule => [rule, importDefault((0, _path.join)(rulesDir, rule))]));
const recommendedRules = {
  'jest/expect-expect': 'warn',
  'jest/no-alias-methods': 'error',
  'jest/no-commented-out-tests': 'warn',
  'jest/no-conditional-expect': 'error',
  'jest/no-deprecated-functions': 'error',
  'jest/no-disabled-tests': 'warn',
  'jest/no-done-callback': 'error',
  'jest/no-export': 'error',
  'jest/no-focused-tests': 'error',
  'jest/no-identical-title': 'error',
  'jest/no-interpolation-in-snapshots': 'error',
  'jest/no-jasmine-globals': 'error',
  'jest/no-mocks-import': 'error',
  'jest/no-standalone-expect': 'error',
  'jest/no-test-prefixes': 'error',
  'jest/valid-describe-callback': 'error',
  'jest/valid-expect': 'error',
  'jest/valid-expect-in-promise': 'error',
  'jest/valid-title': 'error'
};
const styleRules = {
  'jest/no-alias-methods': 'warn',
  'jest/prefer-to-be': 'error',
  'jest/prefer-to-contain': 'error',
  'jest/prefer-to-have-length': 'error'
};
const allRules = Object.fromEntries(Object.entries(rules).filter(([, rule]) => !rule.meta.deprecated).map(([name]) => [`jest/${name}`, 'error']));
const plugin = {
  meta: {
    name: _package.name,
    version: _package.version
  },
  // ugly cast for now to keep TypeScript happy since
  // we don't have types for flat config yet
  configs: {},
  environments: {
    globals: {
      globals: _globals.default
    }
  },
  rules
};
const createRCConfig = rules => ({
  plugins: ['jest'],
  env: {
    'jest/globals': true
  },
  rules
});
const createFlatConfig = rules => ({
  plugins: {
    jest: plugin
  },
  languageOptions: {
    globals: _globals.default
  },
  rules
});
plugin.configs = {
  all: createRCConfig(allRules),
  recommended: createRCConfig(recommendedRules),
  style: createRCConfig(styleRules),
  'flat/all': createFlatConfig(allRules),
  'flat/recommended': createFlatConfig(recommendedRules),
  'flat/style': createFlatConfig(styleRules)
};
module.exports = plugin;