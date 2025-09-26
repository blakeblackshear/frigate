const runNewmanTest = require('../../../../test/codegen/newman/newmanTestUtil').runNewmanTest,
  convert = require('../../index').convert;

describe('Convert for different types of request', function () {
  const testConfig = {
      runScript: 'cargo run -q',
      compileScript: null,
      fileName: 'src/main.rs'
    },
    options = {
      indentCount: 4,
      indentType: 'Space'
    };
  runNewmanTest(convert, options, testConfig);
});
