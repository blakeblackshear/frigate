'use strict';
var $ = require('../internals/export');
var aCallable = require('../internals/a-callable');
var aWeakMap = require('../internals/a-weak-map');
var aWeakKey = require('../internals/a-weak-key');
var WeakMapHelpers = require('../internals/weak-map-helpers');
var IS_PURE = require('../internals/is-pure');

var get = WeakMapHelpers.get;
var has = WeakMapHelpers.has;
var set = WeakMapHelpers.set;

// `WeakMap.prototype.getOrInsertComputed` method
// https://github.com/tc39/proposal-upsert
$({ target: 'WeakMap', proto: true, real: true, forced: IS_PURE }, {
  getOrInsertComputed: function getOrInsertComputed(key, callbackfn) {
    aWeakMap(this);
    aWeakKey(key);
    aCallable(callbackfn);
    if (has(this, key)) return get(this, key);
    var value = callbackfn(key);
    set(this, key, value);
    return value;
  }
});
