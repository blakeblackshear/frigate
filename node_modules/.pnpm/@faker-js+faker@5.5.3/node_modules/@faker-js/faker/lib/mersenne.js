var Gen = require('../vendor/mersenne').MersenneTwister19937;

function Mersenne() {
  var gen = new Gen();
  gen.init_genrand((new Date).getTime() % 1000000000);

  this.rand = function(max, min) {
    if (max === undefined)
    {
      min = 0;
      max = 32768;
    }
    return Math.floor(gen.genrand_real2() * (max - min) + min);
  }
  this.seed = function(S) {
    if (typeof(S) != 'number')
    {
      throw new Error("seed(S) must take numeric argument; is " + typeof(S));
    }
    gen.init_genrand(S);
  }
  this.seed_array = function(A) {
    if (typeof(A) != 'object')
    {
      throw new Error("seed_array(A) must take array of numbers; is " + typeof(A));
    }
    gen.init_by_array(A, A.length);
  }
}

module.exports = Mersenne;
