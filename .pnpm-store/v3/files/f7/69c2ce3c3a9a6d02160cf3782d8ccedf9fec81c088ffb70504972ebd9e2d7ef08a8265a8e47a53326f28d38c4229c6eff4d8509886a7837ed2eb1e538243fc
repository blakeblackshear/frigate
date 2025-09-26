# Base64

Fast Base64 encoder and decoder for browser and Node.js.

## Encoder

- Implements Base64 encoding algorithm compatible with Node's Buffer.
- Isomorphic&mdash;it can be used in, both, Node and the browser.
- Faster than the Node's implementation for short blobs, smaller than 40 bytes.
- Uses Node's implementation for long blobs, if available. Hence, it also works
  in browser, but in Node environment will perform faster for short strings.
- Can encode into Base64 text or Base64 `Uint8Array`.


### Usage

Use encoder compatible with Node's Buffer:

```ts
import {toBase64} from '@jsonjoy.com/base64';

toBase64(new Uint8Array([1, 2, 3]));
```

Create your custom encoder:

```ts
import {createToBase64} from '@jsonjoy.com/base64';

const encode = createToBase64('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+_');

encode(new Uint8Array([1, 2, 3]));
```


### Benchmark

Below benchmark encodes random binary blobs of sizes 8, 16, 32, 64, 128, 256, 512, and 1024 byes.
`@jsonjoy.com/base64` is faster, because for short strings (less than 40 chars) it uses a
native JavaScript implementation, which is faster and also works in browsers. For blobs larger
than 40 chars, it falls back to Node `Buffer` implementation, if available.

Encoding:

```
node src/__bench__/encode.js
util/base64 toBase64(uint8) x 1,531,283 ops/sec ±0.30% (92 runs sampled), 653 ns/op
util/base64 createToBase64()(uint8) x 946,364 ops/sec ±0.76% (100 runs sampled), 1057 ns/op
js-base64 x 1,103,190 ops/sec ±1.27% (96 runs sampled), 906 ns/op
fast-base64-encode x 500,225 ops/sec ±0.64% (96 runs sampled), 1999 ns/op
base64-js x 328,368 ops/sec ±0.25% (95 runs sampled), 3045 ns/op
Buffer.from(uint8).toString('base64'); x 1,099,420 ops/sec ±0.20% (100 runs sampled), 910 ns/op
Fastest is util/base64 toBase64(uint8)
```

Decoding:

```
node src/__bench__/decode.js
@jsonjoy.com/base64 fromBase64(str) x 756,989 ops/sec ±0.46% (97 runs sampled), 1321 ns/op
@jsonjoy.com/base64 createFromBase64()(str) x 475,591 ops/sec ±0.37% (96 runs sampled), 2103 ns/op
Buffer.from(str, 'base64') x 545,012 ops/sec ±0.33% (101 runs sampled), 1835 ns/op
base64-js x 487,015 ops/sec ±1.19% (94 runs sampled), 2053 ns/op
js-base64 x 173,049 ops/sec ±0.20% (99 runs sampled), 5779 ns/op
Fastest is @jsonjoy.com/base64 fromBase64(str)
```


## Decoder

- Uses Node.js built-in `Buffer`, if available.
- When `Buffer` is not available, uses JavaScript implementation.


### Usage

Use decoder compatible with Node's Buffer:

```ts
import {toBase64, fromBase64} from '@jsonjoy.com/base64';

fromBase64(toBase64(new Uint8Array([1, 2, 3])));
```

Create your custom encoder:

```ts
import {createFromBase64} from '@jsonjoy.com/base64';

const decoder = createFromBase64('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+_');

decoder(toBase64(new Uint8Array([1, 2, 3])));
```
