function makexorshift32() {
  var x = 1 + Math.round(Math.random() * ((-1>>>0)-1));

  return function xorshift32() {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return x;
  };
}

var xorshift32 = makexorshift32();

exports.makexorshift32 = makexorshift32;
exports.xorshift32 = xorshift32;
