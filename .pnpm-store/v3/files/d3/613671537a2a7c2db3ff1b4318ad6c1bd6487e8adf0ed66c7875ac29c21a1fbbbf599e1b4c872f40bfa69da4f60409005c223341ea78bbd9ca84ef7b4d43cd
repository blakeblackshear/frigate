#!/usr/bin/env node
require('shelljs/global');
require('colors');

var async = require('async'),
    ESLintCLIEngine = require('eslint').CLIEngine,

    LINT_SOURCE_DIRS = [
        './lib',
        './bin',
        './test',
        './examples/*.js',
        './npm/*.js',
        './index.js'
    ];

module.exports = function (exit) {
    // banner line
    console.info('\nLinting files using eslint...'.yellow.bold);

    async.waterfall([
        // execute the CLI engine
        function (next) {
            next(null, (new ESLintCLIEngine()).executeOnFiles(LINT_SOURCE_DIRS));
        },

        // output results
        function (report, next) {
            var errorReport = ESLintCLIEngine.getErrorResults(report.results);
            // log the result to CLI
            console.info(ESLintCLIEngine.getFormatter()(report.results));
            // log the success of the parser if it has no errors
            (errorReport && !errorReport.length) && console.info('eslint ok!'.green);
            // ensure that the exit code is non zero in case there was an error
            next(Number(errorReport && errorReport.length) || 0);
        }
    ], exit);
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(exit);
