const {map2, map3} = require('./maps');

function makestr5_36() {
  var x = 1 + Math.round(Math.random()*((-1>>>0)-1));
  return function str5_36() {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    var val = x >>> 1;
    return map3[val % 46656] + map2[(val >> 18) % 1296];
  }
}

exports.makestr5_36 = makestr5_36;
exports.str5_36 = makestr5_36();
