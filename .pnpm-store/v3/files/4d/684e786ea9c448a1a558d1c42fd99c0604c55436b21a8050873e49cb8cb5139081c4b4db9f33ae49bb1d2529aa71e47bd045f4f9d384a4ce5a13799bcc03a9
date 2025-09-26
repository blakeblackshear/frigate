var makestr5_36 = require("./str5_36").makestr5_36;

function makestr10_36() {
  var gen1 = makestr5_36();
  var gen2 = makestr5_36();
  return function str10_36() {
    return gen1() + gen2();
  }
}

exports.makestr10_36 = makestr10_36;
exports.str10_36 = makestr10_36();

// const {map2, map3} = require('./maps');

// function makestr10_36() {
//   var x = (1 + (Math.random() * (0xFFFF - 1))) | 0;
//   var y = (1 + (Math.random() * (0xFFFF - 1))) | 0;
//   return function str10_36() {
//     x ^= x << 13;
//     x ^= x >> 17;
//     x ^= x << 5;
//     y ^= y << 13;
//     y ^= y >> 17;
//     y ^= y << 5;
//     var a = x >>> 1;
//     var b = y >>> 1;
//     return map3[a % 46656] + map2[(a >> 18) % 1296] + map3[b % 46656] + map2[(b >> 18) % 1296];
//   }
// }

// console.log(exports.str10_36());
// console.log(exports.str10_36());
// console.log(exports.str10_36());
// console.log(exports.str10_36());
// console.log(exports.str10_36());