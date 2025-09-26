var common = exports;

var path = require('path');
var root = path.dirname(__dirname);

common.dir = {
  lib: root + '/lib',
  fixture: root + '/test/fixture',
};

common.assert = require('assert');
