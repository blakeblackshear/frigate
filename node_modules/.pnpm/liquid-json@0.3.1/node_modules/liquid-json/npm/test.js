#!/usr/bin/env node
require('shelljs/global');
require('colors');

var prettyms = require('pretty-ms'),
    startedAt = Date.now();

require('async').series([
    require('./test-lint'),
    require('./test-unit')
], function (code) {
    // eslint-disable-next-line max-len
    console.info(`\nliquid-json: duration ${prettyms(Date.now() - startedAt)}\nliquid-json: ${code ? 'not ok' : 'ok'}!`[code ?
        'red' : 'green']);
    exit(code && (typeof code === 'number' ? code : 1) || 0);
});
