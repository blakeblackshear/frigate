#!/usr/bin/env node
var chalk = require('chalk'),
  exit = require('shelljs').exit,
  prettyms = require('pretty-ms'),
  startedAt = Date.now(),
  name = require('../package.json').name;

require('async').series([
  require('./test-lint'),
  require('./test-newman'),
  require('./test-unit')
  // Add a separate folder for every new suite of tests
  // require('./test-unit')
  // require('./test-browser')
  // require('./test-integration')
], function (code) {
  // eslint-disable-next-line max-len
  console.info(chalk[code ? 'red' : 'green'](`\n${name}: duration ${prettyms(Date.now() - startedAt)}\n${name}: ${code ? 'not ok' : 'ok'}!`));
  exit(code && (typeof code === 'number' ? code : 1) || 0);
});
