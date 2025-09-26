var x = 1 + Math.round(Math.random() * ((-1>>>0)-1));

/** Generate a random 32-bit unsigned integer in the specified [min, max] range. */
function randomU32(min, max) {
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) % (max - min + 1) + min;
}

exports.randomU32 = randomU32;
