# `hyperdyperid`

Fastest random ID and random string generation for Node.js

- `str3_36` &mdash; generates random 3 character Base36 alphanumeric string.
- `str5_36` &mdash; generates random 5 character Base36 alphanumeric string.
- `str6_36` &mdash; generates random 6 character Base36 alphanumeric string.
- `str10_36` &mdash; generates random 10 character alphanumeric string.
- `str(len [, alphabet])` &mdash; generates any length random string using an `alphabet`. Use like `str(10, '0123456789')`.
- `hyperid` &mdash; generates "hyperid" like ID.
- `xorshift32` &mdash; iterates through pseudo random numbers using "xorshift32" algorithm. This used
  to be the algorithm behind `Math.random()` in V8, then it switched to "xorshift64".
- `randomU32(min, max)` &mdash; generate a random 32-bit integer.


## Usage

Install

```
yarn add hyperdyperid
```

Generate base36 10-character string:

```js
const {str10_36} = require('hyperdyperid/lib/str10_36');

str10_36();
// lxifpmidcr
// cn41vpmtxo
// dj2u5ghp3r
// 6yro5d0g9l
```


## Performance

Ran on Mac Mini M1.

Random ID generation:

```
node -v
v16.14.2
node benchmarks/main.js 
hyperdyperid xorshift32() x 241,258,490 ops/sec ±1.97% (78 runs sampled)
hyperdyperid str3_36() x 203,361,942 ops/sec ±1.57% (82 runs sampled)
hyperdyperid str5_36() x 124,134,559 ops/sec ±1.74% (85 runs sampled)
hyperdyperid str6_36() x 125,011,053 ops/sec ±2.48% (70 runs sampled)
hyperdyperid str10_36() x 19,445,199 ops/sec ±1.92% (84 runs sampled)
hyperdyperid str(5) x 5,940,801 ops/sec ±1.70% (82 runs sampled)
hyperdyperid str(10) x 2,798,758 ops/sec ±1.45% (65 runs sampled)
hyperdyperid hyperid() x 26,317,209 ops/sec ±2.61% (76 runs sampled)
hyperid x 17,018,022 ops/sec ±1.66% (84 runs sampled)
Math.random() x 72,294,752 ops/sec ±1.65% (83 runs sampled)
Math.random().toString() x 4,503,932 ops/sec ±2.68% (80 runs sampled)
nanoid x 470,470 ops/sec ±3.17% (77 runs sampled)
shortid x 41,870 ops/sec ±6.21% (67 runs sampled)
Fastest is hyperdyperid xorshift32()
```

Random integer generation:

```
node -v
v16.14.2
node benchmarks/randomU32.js 
randomU32(min, max) x 248,233,310 ops/sec ±1.91% (73 runs sampled)
Math.random() * (max - min + 1) + min x 35,034,863 ops/sec ±1.75% (81 runs sampled)
Fastest is randomU32(min, max)
```


## License

[MIT © Vadim Dalecky](LICENSE).
