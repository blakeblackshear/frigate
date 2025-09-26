const {map3} = require('./maps');

function makestr3_36() {
  var x = 1 + Math.round(Math.random()*((-1>>>0)-1));
  return function str3_36() {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    var val = x >>> 1;
    return map3[val % 46656];
  }
}

exports.makestr3_36 = makestr3_36;
exports.str3_36 = makestr3_36();
