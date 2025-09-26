# d3-random

Generate random numbers from various distributions.

See the [d3-random collection on Observable](https://observablehq.com/collection/@d3/d3-random) for examples.

## Installing

If you use npm, `npm install d3-random`. You can also download the [latest release on GitHub](https://github.com/d3/d3-random/releases/latest). For vanilla HTML in modern browsers, import d3-random from Skypack:

```html
<script type="module">

import {randomUniform} from "https://cdn.skypack.dev/d3-random@3";

const random = randomUniform(1, 10);

</script>
```

For legacy environments, you can load d3-random’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-random@3"></script>
<script>

const random = d3.randomUniform(1, 10);

</script>
```

## API Reference

<a name="randomUniform" href="#randomUniform">#</a> d3.<b>randomUniform</b>([<i>min</i>, ][<i>max</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/uniform.js), [Examples](https://observablehq.com/@d3/d3-random#uniform)

Returns a function for generating random numbers with a [uniform distribution](https://en.wikipedia.org/wiki/Uniform_distribution_\(continuous\)). The minimum allowed value of a returned number is *min* (inclusive), and the maximum is *max* (exclusive). If *min* is not specified, it defaults to 0; if *max* is not specified, it defaults to 1. For example:

```js
d3.randomUniform(6)(); // Returns a number greater than or equal to 0 and less than 6.
d3.randomUniform(1, 5)(); // Returns a number greater than or equal to 1 and less than 5.
```

<a name="randomInt" href="#randomInt">#</a> d3.<b>randomInt</b>([<i>min</i>, ][<i>max</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/int.js), [Examples](https://observablehq.com/@d3/d3-random#int)

Returns a function for generating random integers with a [uniform distribution](https://en.wikipedia.org/wiki/Uniform_distribution_\(continuous\)). The minimum allowed value of a returned number is ⌊*min*⌋ (inclusive), and the maximum is ⌊*max* - 1⌋ (inclusive). If *min* is not specified, it defaults to 0. For example:

```js
d3.randomInt(6)(); // Returns an integer greater than or equal to 0 and less than 6.
d3.randomInt(1, 5)(); // Returns an integer greater than or equal to 1 and less than 5.
```

<a name="randomNormal" href="#randomNormal">#</a> d3.<b>randomNormal</b>([<i>mu</i>][, <i>sigma</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/normal.js), [Examples](https://observablehq.com/@d3/d3-random#normal)

Returns a function for generating random numbers with a [normal (Gaussian) distribution](https://en.wikipedia.org/wiki/Normal_distribution). The expected value of the generated numbers is *mu*, with the given standard deviation *sigma*. If *mu* is not specified, it defaults to 0; if *sigma* is not specified, it defaults to 1.

<a name="randomLogNormal" href="#randomLogNormal">#</a> d3.<b>randomLogNormal</b>([<i>mu</i>][, <i>sigma</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/logNormal.js), [Examples](https://observablehq.com/@d3/d3-random#logNormal)

Returns a function for generating random numbers with a [log-normal distribution](https://en.wikipedia.org/wiki/Log-normal_distribution). The expected value of the random variable’s natural logarithm is *mu*, with the given standard deviation *sigma*. If *mu* is not specified, it defaults to 0; if *sigma* is not specified, it defaults to 1.

<a name="randomBates" href="#randomBates">#</a> d3.<b>randomBates</b>(<i>n</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/bates.js), [Examples](https://observablehq.com/@d3/d3-random#bates)

Returns a function for generating random numbers with a [Bates distribution](https://en.wikipedia.org/wiki/Bates_distribution) with *n* independent variables. The case of fractional *n* is handled as with d3.randomIrwinHall, and d3.randomBates(0) is equivalent to d3.randomUniform().

<a name="randomIrwinHall" href="#randomIrwinHall">#</a> d3.<b>randomIrwinHall</b>(<i>n</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/irwinHall.js), [Examples](https://observablehq.com/@d3/d3-random#irwinHall)

Returns a function for generating random numbers with an [Irwin–Hall distribution](https://en.wikipedia.org/wiki/Irwin–Hall_distribution) with *n* independent variables. If the fractional part of *n* is non-zero, this is treated as adding d3.randomUniform() times that fractional part to the integral part.

<a name="randomExponential" href="#randomExponential">#</a> d3.<b>randomExponential</b>(<i>lambda</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/exponential.js), [Examples](https://observablehq.com/@d3/d3-random#exponential)

Returns a function for generating random numbers with an [exponential distribution](https://en.wikipedia.org/wiki/Exponential_distribution) with the rate *lambda*; equivalent to time between events in a [Poisson process](https://en.wikipedia.org/wiki/Poisson_point_process) with a mean of 1 / *lambda*. For example, exponential(1/40) generates random times between events where, on average, one event occurs every 40 units of time.

<a name="randomPareto" href="#randomPareto">#</a> d3.<b>randomPareto</b>(<i>alpha</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/pareto.js), [Examples](https://observablehq.com/@d3/d3-random#pareto)

Returns a function for generating random numbers with a [Pareto distribution](https://en.wikipedia.org/wiki/Pareto_distribution) with the shape *alpha*. The value *alpha* must be a positive value.

<a name="randomBernoulli" href="#randomBernoulli">#</a> d3.<b>randomBernoulli</b>(<i>p</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/bernoulli.js), [Examples](https://observablehq.com/@d3/d3-random#bernoulli)

Returns a function for generating either 1 or 0 according to a [Bernoulli distribution](https://en.wikipedia.org/wiki/Binomial_distribution) with 1 being returned with success probability *p* and 0 with failure probability *q* = 1 - *p*. The value *p* is in the range [0, 1].

<a name="randomGeometric" href="#randomGeometric">#</a> d3.<b>randomGeometric</b>(<i>p</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/geometric.js), [Examples](https://observablehq.com/@d3/d3-random#geometric)

Returns a function for generating numbers with a [geometric distribution](https://en.wikipedia.org/wiki/Geometric_distribution) with success probability *p*. The value *p* is in the range [0, 1].

<a name="randomBinomial" href="#randomBinomial">#</a> d3.<b>randomBinomial</b>(<i>n</i>, <i>p</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/binomial.js), [Examples](https://observablehq.com/@d3/d3-random#binomial)

Returns a function for generating random numbers with a [binomial distribution](https://en.wikipedia.org/wiki/Binomial_distribution) with *n* the number of trials and *p* the probability of success in each trial. The value *n* is greater or equal to 0, and the value *p* is in the range [0, 1].

<a name="randomGamma" href="#randomGamma">#</a> d3.<b>randomGamma</b>(<i>k</i>, [<i>theta</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/gamma.js), [Examples](https://observablehq.com/@parcly-taxel/the-gamma-and-beta-distributions)

Returns a function for generating random numbers with a [gamma distribution](https://en.wikipedia.org/wiki/Gamma_distribution) with *k* the shape parameter and *theta* the scale parameter. The value *k* must be a positive value; if *theta* is not specified, it defaults to 1.

<a name="randomBeta" href="#randomBeta">#</a> d3.<b>randomBeta</b>(<i>alpha</i>, <i>beta</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/beta.js), [Examples](https://observablehq.com/@parcly-taxel/the-gamma-and-beta-distributions)

Returns a function for generating random numbers with a [beta distribution](https://en.wikipedia.org/wiki/Beta_distribution) with *alpha* and *beta* shape parameters, which must both be positive.

<a name="randomWeibull" href="#randomWeibull">#</a> d3.<b>randomWeibull</b>(<i>k</i>, [<i>a</i>], [<i>b</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/weibull.js), [Examples](https://observablehq.com/@parcly-taxel/frechet-gumbel-weibull)

Returns a function for generating random numbers with one of the [generalized extreme value distributions](https://en.wikipedia.org/wiki/Generalized_extreme_value_distribution), depending on *k*:

* If *k* is positive, the [Weibull distribution](https://en.wikipedia.org/wiki/Weibull_distribution) with shape parameter *k*
* If *k* is zero, the [Gumbel distribution](https://en.wikipedia.org/wiki/Gumbel_distribution)
* If *k* is negative, the [Fréchet distribution](https://en.wikipedia.org/wiki/Fréchet_distribution) with shape parameter −*k*

In all three cases, *a* is the location parameter and *b* is the scale parameter. If *a* is not specified, it defaults to 0; if *b* is not specified, it defaults to 1.

<a name="randomCauchy" href="#randomCauchy">#</a> d3.<b>randomCauchy</b>([<i>a</i>], [<i>b</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/cauchy.js), [Examples](https://observablehq.com/@parcly-taxel/cauchy-and-logistic-distributions)

Returns a function for generating random numbers with a [Cauchy distribution](https://en.wikipedia.org/wiki/Cauchy_distribution). *a* and *b* have the same meanings and default values as in d3.randomWeibull.

<a name="randomLogistic" href="#randomLogistic">#</a> d3.<b>randomLogistic</b>([<i>a</i>], [<i>b</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/logistic.js), [Examples](https://observablehq.com/@parcly-taxel/cauchy-and-logistic-distributions)

Returns a function for generating random numbers with a [logistic distribution](https://en.wikipedia.org/wiki/Logistic_distribution). *a* and *b* have the same meanings and default values as in d3.randomWeibull.

<a name="randomPoisson" href="#randomPoisson">#</a> d3.<b>randomPoisson</b>(<i>lambda</i>) · [Source](https://github.com/d3/d3-random/blob/master/src/poisson.js), [Examples](https://observablehq.com/@parcly-taxel/the-poisson-distribution)

Returns a function for generating random numbers with a [Poisson distribution](https://en.wikipedia.org/wiki/Poisson_distribution) with mean *lambda*.

<a name="random_source" href="#random_source">#</a> <i>random</i>.<b>source</b>(<i>source</i>) · [Examples](https://observablehq.com/@d3/random-source)

Returns the same type of function for generating random numbers but where the given random number generator *source* is used as the source of randomness instead of Math.random. The given random number generator must implement the same interface as Math.random and only return values in the range [0, 1). This is useful when a seeded random number generator is preferable to Math.random. For example:

```js
import {randomLcg, randomNumber} from "d3-random";

const seed = 0.44871573888282423; // any number in [0, 1)
const random = randomNormal.source(randomLcg(seed))(0, 1);

random(); // -0.6253955998897069
```

<a name="randomLcg" href="#randomLcg">#</a> d3.<b>randomLcg</b>([<i>seed</i>]) · [Source](https://github.com/d3/d3-random/blob/master/src/lcg.js), [Examples](https://observablehq.com/@d3/d3-randomlcg)

Returns a [linear congruential generator](https://en.wikipedia.org/wiki/Linear_congruential_generator); this function can be called repeatedly to obtain pseudorandom values well-distributed on the interval [0,1) and with a long period (up to 1 billion numbers), similar to Math.random. A *seed* can be specified as a real number in the interval [0,1) or as any integer. In the latter case, only the lower 32 bits are considered. Two generators instanced with the same seed generate the same sequence, allowing to create reproducible pseudo-random experiments. If the *seed* is not specified, one is chosen using Math.random.
