const {map3} = require('./maps');

function makestr6_36() {
  var x = 1 + Math.round(Math.random()*((-1>>>0)-1));
  return function str6_36() {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    var val = x >>> 1;
    return map3[val % 46656] + map3[(val >> 16) % 46656];
  }
}

exports.makestr6_36 = makestr6_36;
exports.str6_36 = makestr6_36();
