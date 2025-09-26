pako
==========================================

[![CI](https://github.com/nodeca/pako/workflows/CI/badge.svg)](https://github.com/nodeca/pako/actions)
[![NPM version](https://img.shields.io/npm/v/pako.svg)](https://www.npmjs.org/package/pako)

> zlib port to javascript, very fast!

__Why pako is cool:__

- Results are binary equal to well known [zlib](http://www.zlib.net/) (now contains ported zlib v1.2.8).
- Almost as fast in modern JS engines as C implementation (see benchmarks).
- Works in browsers, you can browserify any separate component.

This project was done to understand how fast JS can be and is it necessary to
develop native C modules for CPU-intensive tasks. Enjoy the result!


__Benchmarks:__


node v12.16.3 (zlib 1.2.9), 1mb input sample:

```
deflate-imaya x 4.75 ops/sec ±4.93% (15 runs sampled)
deflate-pako x 10.38 ops/sec ±0.37% (29 runs sampled)
deflate-zlib x 17.74 ops/sec ±0.77% (46 runs sampled)
gzip-pako x 8.86 ops/sec ±1.41% (29 runs sampled)
inflate-imaya x 107 ops/sec ±0.69% (77 runs sampled)
inflate-pako x 131 ops/sec ±1.74% (82 runs sampled)
inflate-zlib x 258 ops/sec ±0.66% (88 runs sampled)
ungzip-pako x 115 ops/sec ±1.92% (80 runs sampled)
```

node v14.15.0 (google's zlib), 1mb output sample:

```
deflate-imaya x 4.93 ops/sec ±3.09% (16 runs sampled)
deflate-pako x 10.22 ops/sec ±0.33% (29 runs sampled)
deflate-zlib x 18.48 ops/sec ±0.24% (48 runs sampled)
gzip-pako x 10.16 ops/sec ±0.25% (28 runs sampled)
inflate-imaya x 110 ops/sec ±0.41% (77 runs sampled)
inflate-pako x 134 ops/sec ±0.66% (83 runs sampled)
inflate-zlib x 402 ops/sec ±0.74% (87 runs sampled)
ungzip-pako x 113 ops/sec ±0.62% (80 runs sampled)
```

zlib's test is partially affected by marshalling (that make sense for inflate only).
You can change deflate level to 0 in benchmark source, to investigate details.
For deflate level 6 results can be considered as correct.

__Install:__

```
npm install pako
```


Examples / API
--------------

Full docs - http://nodeca.github.io/pako/

```javascript
const pako = require('pako');

// Deflate
//
const input = new Uint8Array();
//... fill input data here
const output = pako.deflate(input);

// Inflate (simple wrapper can throw exception on broken stream)
//
const compressed = new Uint8Array();
//... fill data to uncompress here
try {
  const result = pako.inflate(compressed);
  // ... continue processing
} catch (err) {
  console.log(err);
}

//
// Alternate interface for chunking & without exceptions
//

const deflator = new pako.Deflate();

deflator.push(chunk1, false);
deflator.push(chunk2); // second param is false by default.
...
deflator.push(chunk_last, true); // `true` says this chunk is last

if (deflator.err) {
  console.log(deflator.msg);
}

const output = deflator.result;


const inflator = new pako.Inflate();

inflator.push(chunk1);
inflator.push(chunk2);
...
inflator.push(chunk_last); // no second param because end is auto-detected

if (inflator.err) {
  console.log(inflator.msg);
}

const output = inflator.result;
```

Sometime you can wish to work with strings. For example, to send
stringified objects to server. Pako's deflate detects input data type, and
automatically recode strings to utf-8 prior to compress. Inflate has special
option, to say compressed data has utf-8 encoding and should be recoded to
javascript's utf-16.

```javascript
const pako = require('pako');

const test = { my: 'super', puper: [456, 567], awesome: 'pako' };

const compressed = pako.deflate(JSON.stringify(test));

const restored = JSON.parse(pako.inflate(compressed, { to: 'string' }));
```


Notes
-----

Pako does not contain some specific zlib functions:

- __deflate__ -  methods `deflateCopy`, `deflateBound`, `deflateParams`,
  `deflatePending`, `deflatePrime`, `deflateTune`.
- __inflate__ - methods `inflateCopy`, `inflateMark`,
  `inflatePrime`, `inflateGetDictionary`, `inflateSync`, `inflateSyncPoint`, `inflateUndermine`.
- High level inflate/deflate wrappers (classes) may not support some flush
  modes.


pako for enterprise
-------------------

Available as part of the Tidelift Subscription

The maintainers of pako and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-pako?utm_source=npm-pako&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)


Authors
-------

- Andrey Tupitsin [@anrd83](https://github.com/andr83)
- Vitaly Puzrin [@puzrin](https://github.com/puzrin)

Personal thanks to:

- Vyacheslav Egorov ([@mraleph](https://github.com/mraleph)) for his awesome
  tutorials about optimising JS code for v8, [IRHydra](http://mrale.ph/irhydra/)
  tool and his advices.
- David Duponchel ([@dduponchel](https://github.com/dduponchel)) for help with
  testing.

Original implementation (in C):

- [zlib](http://zlib.net/) by Jean-loup Gailly and Mark Adler.


License
-------

- MIT - all files, except `/lib/zlib` folder
- ZLIB - `/lib/zlib` content
