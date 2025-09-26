const runNewmanTest = require('../../../../test/codegen/newman/newmanTestUtil').runNewmanTest,
  convert = require('../../lib/index').convert;

describe('Convert for different types of request', function () {
  const options = {indentCount: 2, indentType: 'Space'},
    testConfig = {
      compileScript: null,
      runScript: 'node run.js',
      fileName: 'run.js',
      headerSnippet: '/* eslint-disable */\n',
      skipCollections: ['unsupportedMethods']
    };

  runNewmanTest(convert, options, testConfig);

  describe('Convert for request incorporating async/await features', function () {
    const options = {indentCount: 2, indentType: 'Space', asyncAwaitEnabled: true},
      testConfig = {
        compileScript: null,
        runScript: 'node run.js',
        fileName: 'run.js',
        headerSnippet: '/* eslint-disable */\n',
        skipCollections: ['unsupportedMethods']
      };

    runNewmanTest(convert, options, testConfig);
  });

});
