#!/usr/bin/env node
/* eslint-env node, es6 */
// ---------------------------------------------------------------------------------------------------------------------
// This script is intended to execute all unit tests.
// ---------------------------------------------------------------------------------------------------------------------

var shell = require('shelljs'),

  // set directories and files for test and coverage report
  path = require('path'),

  NYC = require('nyc'),
  chalk = require('chalk'),
  recursive = require('recursive-readdir'),

  COV_REPORT_PATH = '.coverage',
  SPEC_SOURCE_DIR = path.join(__dirname, '..', 'test', 'unit');

module.exports = function (exit) {
  // banner line
  console.info(chalk.yellow.bold('Running unit tests using mocha on node...'));

  shell.test('-d', COV_REPORT_PATH) && shell.rm('-rf', COV_REPORT_PATH);
  shell.mkdir('-p', COV_REPORT_PATH);

  var Mocha = require('mocha'),
    nyc = new NYC({
      reportDir: COV_REPORT_PATH,
      tempDirectory: COV_REPORT_PATH,
      reporter: ['text', 'lcov', 'text-summary'],
      exclude: ['config', 'test'],
      hookRunInContext: true,
      hookRunInThisContext: true
    });

  nyc.wrap();
  // add all spec files to mocha
  recursive(SPEC_SOURCE_DIR, function (err, files) {
    if (err) { console.error(err); return exit(1); }

    var mocha = new Mocha({ timeout: 1000 * 60 });

    files.filter(function (file) { // extract all test files
      return (file.substr(-8) === '.test.js');
    }).forEach(mocha.addFile.bind(mocha));

    mocha.run(function (runError) {
      runError && console.error(runError.stack || runError);

      nyc.reset();
      nyc.writeCoverageFile();
      nyc.report();
      exit(runError ? 1 : 0);
    });
  });
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(shell.exit);
