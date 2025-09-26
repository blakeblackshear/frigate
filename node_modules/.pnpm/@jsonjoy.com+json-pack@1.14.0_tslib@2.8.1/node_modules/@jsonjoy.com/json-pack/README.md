# json-pack

The fastest JSON serialization and deserialization library for JavaScript, Node.js, browser.


## Supported Formats

This library implements the following serialization formats:

- **[MessagePack](./src/msgpack/README.md)** - The classic, *MessagePack*
- **[CBOR](./src/cbor/README.md)** - Concise Binary Object Representation codec
- **[UBJSON](./src/ubjson/README.md)** - Universal Binary JSON codec
- **[JSON](./src/json/README.md)** - Enhanced JSON encoder/decoder with additional features
- **[JSON Binary](./src/json-binary/README.md)** - JSON with binary data support using Uint8Array
- **[Amazon Ion](./src/ion/README.md)** - Amazon's Ion data serialization format
- **[BSON](./src/bson/README.md)** - Binary JSON format used by MongoDB
- **[RESP](./src/resp/README.md)** - Redis Serialization Protocol (v2 and v3)
- **[Bencode](./src/bencode/README.md)** - BitTorrent's encoding format

Each format comes with optimized encoders and decoders designed for maximum performance.


## Installation

```bash
npm install @jsonjoy.com/json-pack
```


## Quick Start

```ts
import {MessagePackEncoder, MessagePackDecoder} from '@jsonjoy.com/json-pack/lib/msgpack';

const encoder = new MessagePackEncoder();
const decoder = new MessagePackDecoder();

const data = {hello: 'world', numbers: [1, 2, 3]};
const binary = encoder.encode(data);
const restored = decoder.decode(binary);

console.log(restored); // {hello: 'world', numbers: [1, 2, 3]}
```


## Benchmarks

Encoding:

```
npx ts-node benchmarks/json-pack/bench.encoding.ts
=============================================================================== Benchmark: Encoding
Warmup: 1000x , Node.js: v20.0.0 , Arch: arm64 , CPU: Apple M1
---------------------------------------------------------------------------- Small object, 44 bytes
🤞 json-pack JsonEncoder x 5,385,617 ops/sec ±0.53% (100 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 2,254,954 ops/sec ±0.83% (97 runs sampled)
🤞 json-pack CborEncoderFast x 5,953,159 ops/sec ±1.12% (92 runs sampled)
🤞 json-pack CborEncoder x 6,248,036 ops/sec ±0.29% (98 runs sampled)
🤞 json-pack MsgPackEncoderFast x 3,121,940 ops/sec ±0.16% (99 runs sampled)
🤞 JSON.stringify() x 3,866,116 ops/sec ±0.11% (101 runs sampled)
🤞 @msgpack/msgpack x 1,406,546 ops/sec ±0.94% (93 runs sampled)
🤞 msgpackr x 2,404,916 ops/sec ±3.22% (86 runs sampled)
🤞 cbor-x x 4,737,433 ops/sec ±1.00% (97 runs sampled)
🤞 msgpack-lite x 987,201 ops/sec ±2.84% (91 runs sampled)
🤞 msgpack5 x 197,867 ops/sec ±3.65% (84 runs sampled)
🤞 messagepack x 171,865 ops/sec ±4.44% (74 runs sampled)
Fastest is 🤞 json-pack CborEncoder
------------------------------------------------------------------------- Typical object, 993 bytes
🤞 json-pack JsonEncoder x 299,970 ops/sec ±0.30% (97 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 211,651 ops/sec ±0.18% (100 runs sampled)
🤞 json-pack CborEncoderFast x 429,535 ops/sec ±3.38% (93 runs sampled)
🤞 json-pack CborEncoder x 428,848 ops/sec ±0.71% (97 runs sampled)
🤞 json-pack MsgPackEncoderFast x 322,982 ops/sec ±0.67% (97 runs sampled)
🤞 JSON.stringify() x 306,828 ops/sec ±1.94% (90 runs sampled)
🤞 @msgpack/msgpack x 199,937 ops/sec ±5.52% (93 runs sampled)
🤞 msgpackr x 317,457 ops/sec ±2.18% (90 runs sampled)
🤞 cbor-x x 401,854 ops/sec ±3.20% (92 runs sampled)
🤞 msgpack-lite x 135,110 ops/sec ±1.29% (94 runs sampled)
🤞 msgpack5 x 15,217 ops/sec ±3.72% (85 runs sampled)
🤞 messagepack x 13,853 ops/sec ±4.73% (71 runs sampled)
Fastest is 🤞 json-pack CborEncoder
-------------------------------------------------------------------------- Large object, 3741 bytes
🤞 json-pack JsonEncoder x 87,312 ops/sec ±1.10% (96 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 64,718 ops/sec ±0.45% (96 runs sampled)
🤞 json-pack CborEncoderFast x 134,615 ops/sec ±0.19% (97 runs sampled)
🤞 json-pack CborEncoder x 128,975 ops/sec ±0.20% (98 runs sampled)
🤞 json-pack MsgPackEncoderFast x 103,325 ops/sec ±1.62% (98 runs sampled)
🤞 JSON.stringify() x 101,067 ops/sec ±1.36% (95 runs sampled)
🤞 @msgpack/msgpack x 61,715 ops/sec ±0.22% (98 runs sampled)
🤞 msgpackr x 95,175 ops/sec ±3.84% (95 runs sampled)
🤞 cbor-x x 111,658 ops/sec ±1.34% (95 runs sampled)
🤞 msgpack-lite x 41,364 ops/sec ±0.28% (100 runs sampled)
🤞 msgpack5 x 3,262 ops/sec ±4.32% (71 runs sampled)
🤞 messagepack x 4,167 ops/sec ±7.29% (65 runs sampled)
Fastest is 🤞 json-pack CborEncoderFast
-------------------------------------------------------------------- Very large object, 45750 bytes
🤞 json-pack JsonEncoder x 5,687 ops/sec ±1.92% (94 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 5,813 ops/sec ±2.51% (97 runs sampled)
🤞 json-pack CborEncoderFast x 5,749 ops/sec ±0.67% (98 runs sampled)
🤞 json-pack CborEncoder x 5,515 ops/sec ±0.70% (98 runs sampled)
🤞 json-pack MsgPackEncoderFast x 5,027 ops/sec ±0.19% (100 runs sampled)
🤞 JSON.stringify() x 7,687 ops/sec ±0.87% (99 runs sampled)
🤞 @msgpack/msgpack x 3,379 ops/sec ±2.20% (97 runs sampled)
🤞 msgpackr x 5,929 ops/sec ±15.26% (96 runs sampled)
🤞 cbor-x x 5,032 ops/sec ±5.17% (90 runs sampled)
🤞 msgpack-lite x 2,173 ops/sec ±1.17% (97 runs sampled)
🤞 msgpack5 x 179 ops/sec ±2.95% (68 runs sampled)
🤞 messagepack x 167 ops/sec ±1.09% (79 runs sampled)
Fastest is 🤞 JSON.stringify()
------------------------------------------------------------------ Object with many keys, 969 bytes
🤞 json-pack JsonEncoder x 213,447 ops/sec ±3.31% (95 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 168,303 ops/sec ±2.13% (95 runs sampled)
🤞 json-pack CborEncoderFast x 275,511 ops/sec ±0.40% (95 runs sampled)
🤞 json-pack CborEncoder x 270,949 ops/sec ±0.32% (97 runs sampled)
🤞 json-pack MsgPackEncoderFast x 210,525 ops/sec ±0.66% (99 runs sampled)
🤞 JSON.stringify() x 200,767 ops/sec ±0.19% (101 runs sampled)
🤞 @msgpack/msgpack x 163,665 ops/sec ±0.81% (98 runs sampled)
🤞 msgpackr x 151,889 ops/sec ±0.27% (96 runs sampled)
🤞 cbor-x x 191,010 ops/sec ±0.44% (96 runs sampled)
🤞 msgpack-lite x 93,537 ops/sec ±0.68% (99 runs sampled)
🤞 msgpack5 x 28,581 ops/sec ±1.74% (93 runs sampled)
🤞 messagepack x 8,330 ops/sec ±5.00% (61 runs sampled)
Fastest is 🤞 json-pack CborEncoderFast
------------------------------------------------------------------------- String ladder, 3398 bytes
🤞 json-pack JsonEncoder x 147,755 ops/sec ±0.23% (97 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 128,378 ops/sec ±0.15% (96 runs sampled)
🤞 json-pack CborEncoderFast x 298,037 ops/sec ±0.73% (98 runs sampled)
🤞 json-pack CborEncoder x 293,608 ops/sec ±0.22% (97 runs sampled)
🤞 json-pack MsgPackEncoderFast x 244,864 ops/sec ±3.92% (92 runs sampled)
🤞 JSON.stringify() x 165,819 ops/sec ±1.72% (94 runs sampled)
🤞 @msgpack/msgpack x 79,127 ops/sec ±1.43% (93 runs sampled)
🤞 msgpackr x 236,254 ops/sec ±1.45% (94 runs sampled)
🤞 cbor-x x 206,835 ops/sec ±1.26% (92 runs sampled)
🤞 msgpack-lite x 157,499 ops/sec ±0.39% (98 runs sampled)
🤞 msgpack5 x 55,363 ops/sec ±2.75% (88 runs sampled)
🤞 messagepack x 8,261 ops/sec ±2.97% (72 runs sampled)
Fastest is 🤞 json-pack CborEncoderFast
-------------------------------------------------------------------------- Long strings, 7011 bytes
🤞 json-pack JsonEncoder x 51,334 ops/sec ±0.16% (99 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 27,108 ops/sec ±4.89% (90 runs sampled)
🤞 json-pack CborEncoderFast x 374,042 ops/sec ±6.39% (91 runs sampled)
🤞 json-pack CborEncoder x 424,864 ops/sec ±0.35% (97 runs sampled)
🤞 json-pack MsgPackEncoderFast x 363,465 ops/sec ±1.91% (85 runs sampled)
🤞 JSON.stringify() x 59,793 ops/sec ±0.14% (100 runs sampled)
🤞 @msgpack/msgpack x 57,373 ops/sec ±0.13% (98 runs sampled)
🤞 msgpackr x 372,751 ops/sec ±2.17% (90 runs sampled)
🤞 cbor-x x 389,277 ops/sec ±1.60% (93 runs sampled)
🤞 msgpack-lite x 170,279 ops/sec ±0.82% (97 runs sampled)
🤞 msgpack5 x 83,809 ops/sec ±2.80% (83 runs sampled)
🤞 messagepack x 20,076 ops/sec ±1.45% (87 runs sampled)
Fastest is 🤞 json-pack CborEncoder
-------------------------------------------------------------------------- Short strings, 170 bytes
🤞 json-pack JsonEncoder x 1,577,757 ops/sec ±0.16% (98 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 1,057,420 ops/sec ±0.38% (100 runs sampled)
🤞 json-pack CborEncoderFast x 1,844,775 ops/sec ±0.20% (100 runs sampled)
🤞 json-pack CborEncoder x 1,468,011 ops/sec ±0.23% (98 runs sampled)
🤞 json-pack MsgPackEncoderFast x 1,240,577 ops/sec ±0.19% (98 runs sampled)
🤞 JSON.stringify() x 1,852,916 ops/sec ±0.20% (100 runs sampled)
🤞 @msgpack/msgpack x 781,414 ops/sec ±0.42% (92 runs sampled)
🤞 msgpackr x 1,672,474 ops/sec ±0.23% (99 runs sampled)
🤞 cbor-x x 1,351,338 ops/sec ±0.20% (97 runs sampled)
🤞 msgpack-lite x 416,300 ops/sec ±0.76% (96 runs sampled)
🤞 msgpack5 x 151,657 ops/sec ±1.97% (91 runs sampled)
🤞 messagepack x 35,124 ops/sec ±5.60% (61 runs sampled)
Fastest is 🤞 JSON.stringify()
-------------------------------------------------------------------------------- Numbers, 136 bytes
🤞 json-pack JsonEncoder x 1,708,133 ops/sec ±1.09% (98 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 1,135,630 ops/sec ±1.67% (95 runs sampled)
🤞 json-pack CborEncoderFast x 2,658,037 ops/sec ±1.33% (97 runs sampled)
🤞 json-pack CborEncoder x 3,084,914 ops/sec ±0.24% (101 runs sampled)
🤞 json-pack MsgPackEncoderFast x 1,620,958 ops/sec ±2.15% (94 runs sampled)
🤞 JSON.stringify() x 1,602,303 ops/sec ±0.24% (98 runs sampled)
🤞 @msgpack/msgpack x 997,885 ops/sec ±1.70% (97 runs sampled)
🤞 msgpackr x 2,659,862 ops/sec ±0.51% (96 runs sampled)
🤞 cbor-x x 3,116,954 ops/sec ±0.89% (95 runs sampled)
🤞 msgpack-lite x 892,281 ops/sec ±2.19% (92 runs sampled)
🤞 msgpack5 x 144,567 ops/sec ±3.06% (88 runs sampled)
🤞 messagepack x 383,134 ops/sec ±2.95% (74 runs sampled)
Fastest is 🤞 cbor-x
--------------------------------------------------------------------------------- Tokens, 308 bytes
🤞 json-pack JsonEncoder x 1,370,517 ops/sec ±0.52% (98 runs sampled)
🤞 Buffer.from(JSON.stringify()) x 1,016,856 ops/sec ±0.16% (93 runs sampled)
🤞 json-pack CborEncoderFast x 1,347,193 ops/sec ±0.20% (96 runs sampled)
🤞 json-pack CborEncoder x 1,353,358 ops/sec ±0.20% (101 runs sampled)
🤞 json-pack MsgPackEncoderFast x 1,130,418 ops/sec ±0.14% (96 runs sampled)
🤞 JSON.stringify() x 1,549,669 ops/sec ±0.49% (97 runs sampled)
🤞 @msgpack/msgpack x 871,477 ops/sec ±0.92% (98 runs sampled)
🤞 msgpackr x 1,716,378 ops/sec ±0.20% (99 runs sampled)
🤞 cbor-x x 1,951,639 ops/sec ±0.16% (100 runs sampled)
🤞 msgpack-lite x 622,495 ops/sec ±1.03% (96 runs sampled)
🤞 msgpack5 x 81,727 ops/sec ±2.04% (91 runs sampled)
🤞 messagepack x 609,651 ops/sec ±1.64% (89 runs sampled)
Fastest is 🤞 cbor-x
```

Decoding:

```
node benchmarks/json-pack/bench.decoding.js
=============================================================================== Benchmark: Decoding
Warmup: 1000x , Node.js: v16.14.2 , Arch: arm64 , CPU: Apple M1
-------------------------------------------------------------------- Very large object, 45750 bytes
👍 JSON.parse() x 3,506 ops/sec ±0.19% (100 runs sampled)
👍 sjson.parse() x 3,336 ops/sec ±0.11% (99 runs sampled)
👍 json-pack CborDecoderBase x 4,915 ops/sec ±0.18% (100 runs sampled)
👍 cbor-x x 4,747 ops/sec ±0.15% (100 runs sampled)
👍 cbor x 260 ops/sec ±0.29% (90 runs sampled)
👍 json-pack MsgPackDecoderFast x 5,506 ops/sec ±0.48% (100 runs sampled)
👍 msgpackr x 4,729 ops/sec ±0.23% (101 runs sampled)
👍 @msgpack/msgpack x 4,096 ops/sec ±0.25% (100 runs sampled)
👍 msgpack5 x 920 ops/sec ±0.34% (99 runs sampled)
👍 msgpack-lite x 1,223 ops/sec ±0.10% (100 runs sampled)
👍 messagepack x 194 ops/sec ±1.93% (73 runs sampled)
Fastest is 👍 json-pack MsgPackDecoderFast
-------------------------------------------------------------------------- Large object, 3741 bytes
👍 JSON.parse() x 91,582 ops/sec ±0.30% (100 runs sampled)
👍 sjson.parse() x 84,411 ops/sec ±0.16% (99 runs sampled)
👍 json-pack CborDecoderBase x 94,618 ops/sec ±0.27% (97 runs sampled)
👍 cbor-x x 108,102 ops/sec ±0.37% (101 runs sampled)
👍 cbor x 4,845 ops/sec ±0.79% (95 runs sampled)
👍 json-pack MsgPackDecoderFast x 102,544 ops/sec ±0.39% (99 runs sampled)
👍 msgpackr x 111,668 ops/sec ±0.16% (101 runs sampled)
👍 @msgpack/msgpack x 56,952 ops/sec ±0.51% (97 runs sampled)
👍 msgpack5 x 17,420 ops/sec ±0.60% (101 runs sampled)
👍 msgpack-lite x 20,536 ops/sec ±0.23% (98 runs sampled)
👍 messagepack x 3,247 ops/sec ±2.30% (87 runs sampled)
Fastest is 👍 msgpackr
------------------------------------------------------------------------- Typical object, 993 bytes
👍 JSON.parse() x 304,670 ops/sec ±0.98% (97 runs sampled)
👍 sjson.parse() x 283,259 ops/sec ±0.20% (98 runs sampled)
👍 json-pack CborDecoderBase x 298,666 ops/sec ±0.19% (100 runs sampled)
👍 cbor-x x 322,995 ops/sec ±0.71% (97 runs sampled)
👍 cbor x 14,391 ops/sec ±0.88% (95 runs sampled)
👍 json-pack MsgPackDecoderFast x 321,984 ops/sec ±0.23% (100 runs sampled)
👍 msgpackr x 328,671 ops/sec ±0.31% (99 runs sampled)
👍 @msgpack/msgpack x 198,604 ops/sec ±0.85% (96 runs sampled)
👍 msgpack5 x 51,549 ops/sec ±0.32% (99 runs sampled)
👍 msgpack-lite x 67,171 ops/sec ±0.19% (99 runs sampled)
👍 messagepack x 9,464 ops/sec ±1.95% (92 runs sampled)
Fastest is 👍 msgpackr
---------------------------------------------------------------------------- Small object, 44 bytes
👍 JSON.parse() x 2,654,389 ops/sec ±0.28% (98 runs sampled)
👍 sjson.parse() x 2,325,941 ops/sec ±0.21% (98 runs sampled)
👍 json-pack CborDecoderBase x 3,357,402 ops/sec ±0.31% (99 runs sampled)
👍 cbor-x x 4,133,737 ops/sec ±0.29% (101 runs sampled)
👍 cbor x 112,776 ops/sec ±5.79% (88 runs sampled)
👍 json-pack MsgPackDecoderFast x 3,359,127 ops/sec ±0.56% (98 runs sampled)
👍 msgpackr x 3,436,592 ops/sec ±0.35% (97 runs sampled)
👍 @msgpack/msgpack x 2,288,251 ops/sec ±0.52% (94 runs sampled)
👍 msgpack5 x 377,061 ops/sec ±0.67% (96 runs sampled)
👍 msgpack-lite x 872,569 ops/sec ±0.31% (100 runs sampled)
👍 messagepack x 116,422 ops/sec ±1.84% (86 runs sampled)
Fastest is 👍 cbor-x
------------------------------------------------------------------ Object with many keys, 969 bytes
👍 JSON.parse() x 270,312 ops/sec ±0.57% (98 runs sampled)
👍 sjson.parse() x 242,328 ops/sec ±3.10% (97 runs sampled)
👍 json-pack CborDecoderBase x 81,403 ops/sec ±0.42% (96 runs sampled)
👍 cbor-x x 93,131 ops/sec ±0.48% (99 runs sampled)
👍 cbor x 8,760 ops/sec ±0.93% (95 runs sampled)
👍 json-pack MsgPackDecoderFast x 84,014 ops/sec ±0.31% (96 runs sampled)
👍 msgpackr x 91,477 ops/sec ±0.77% (90 runs sampled)
👍 @msgpack/msgpack x 73,089 ops/sec ±0.56% (89 runs sampled)
👍 msgpack5 x 23,468 ops/sec ±0.72% (97 runs sampled)
👍 msgpack-lite x 34,630 ops/sec ±0.48% (100 runs sampled)
👍 messagepack x 6,161 ops/sec ±1.77% (86 runs sampled)
Fastest is 👍 JSON.parse()
------------------------------------------------------------------------- String ladder, 3398 bytes
👍 JSON.parse() x 287,387 ops/sec ±0.36% (99 runs sampled)
👍 sjson.parse() x 192,836 ops/sec ±0.40% (95 runs sampled)
👍 json-pack CborDecoderBase x 177,787 ops/sec ±0.48% (98 runs sampled)
👍 cbor-x x 320,303 ops/sec ±0.51% (94 runs sampled)
👍 cbor x 15,416 ops/sec ±0.61% (94 runs sampled)
👍 json-pack MsgPackDecoderFast x 179,625 ops/sec ±0.59% (100 runs sampled)
👍 msgpackr x 375,452 ops/sec ±0.69% (94 runs sampled)
👍 @msgpack/msgpack x 36,544 ops/sec ±0.75% (84 runs sampled)
👍 msgpack5 x 54,428 ops/sec ±0.46% (98 runs sampled)
👍 msgpack-lite x 25,309 ops/sec ±0.81% (75 runs sampled)
👍 messagepack x 10,117 ops/sec ±3.99% (82 runs sampled)
Fastest is 👍 msgpackr
-------------------------------------------------------------------------- Long strings, 7011 bytes
👍 JSON.parse() x 117,335 ops/sec ±3.32% (89 runs sampled)
👍 sjson.parse() x 103,275 ops/sec ±0.64% (94 runs sampled)
👍 json-pack CborDecoderBase x 74,140 ops/sec ±7.50% (81 runs sampled)
👍 cbor-x x 92,753 ops/sec ±0.78% (96 runs sampled)
👍 cbor x 24,292 ops/sec ±27.70% (75 runs sampled)
👍 json-pack MsgPackDecoderFast x 88,124 ops/sec ±1.65% (90 runs sampled)
👍 msgpackr x 94,352 ops/sec ±0.91% (94 runs sampled)
👍 @msgpack/msgpack x 33,256 ops/sec ±30.68% (71 runs sampled)
👍 msgpack5 x 68,367 ops/sec ±0.70% (95 runs sampled)
👍 msgpack-lite x 14,764 ops/sec ±2.04% (63 runs sampled)
👍 messagepack x 17,522 ops/sec ±28.57% (66 runs sampled)
Fastest is 👍 JSON.parse()
-------------------------------------------------------------------------- Short strings, 170 bytes
👍 JSON.parse() x 1,077,084 ops/sec ±6.88% (77 runs sampled)
👍 sjson.parse() x 837,130 ops/sec ±2.70% (80 runs sampled)
👍 json-pack CborDecoderBase x 698,901 ops/sec ±4.69% (88 runs sampled)
👍 cbor-x x 1,182,303 ops/sec ±0.39% (94 runs sampled)
👍 cbor x 26,810 ops/sec ±14.70% (73 runs sampled)
👍 json-pack MsgPackDecoderFast x 742,562 ops/sec ±5.06% (88 runs sampled)
👍 msgpackr x 1,041,143 ops/sec ±2.66% (85 runs sampled)
👍 @msgpack/msgpack x 440,652 ops/sec ±1.38% (92 runs sampled)
👍 msgpack5 x 133,387 ops/sec ±1.14% (96 runs sampled)
👍 msgpack-lite x 206,844 ops/sec ±0.63% (97 runs sampled)
👍 messagepack x 23,818 ops/sec ±2.13% (94 runs sampled)
Fastest is 👍 cbor-x,👍 JSON.parse()
-------------------------------------------------------------------------------- Numbers, 136 bytes
👍 JSON.parse() x 1,747,460 ops/sec ±0.61% (95 runs sampled)
👍 sjson.parse() x 1,553,635 ops/sec ±1.04% (93 runs sampled)
👍 json-pack CborDecoderBase x 2,289,002 ops/sec ±0.93% (87 runs sampled)
👍 cbor-x x 3,775,727 ops/sec ±2.86% (82 runs sampled)
👍 cbor x 77,650 ops/sec ±4.32% (83 runs sampled)
👍 json-pack MsgPackDecoderFast x 2,287,682 ops/sec ±1.54% (80 runs sampled)
👍 msgpackr x 3,391,489 ops/sec ±0.59% (80 runs sampled)
👍 @msgpack/msgpack x 2,297,255 ops/sec ±1.54% (78 runs sampled)
👍 msgpack5 x 112,373 ops/sec ±1.19% (91 runs sampled)
👍 msgpack-lite x 1,378,387 ops/sec ±0.84% (95 runs sampled)
👍 messagepack x 1,174,740 ops/sec ±0.97% (89 runs sampled)
Fastest is 👍 cbor-x
--------------------------------------------------------------------------------- Tokens, 308 bytes
👍 JSON.parse() x 1,303,300 ops/sec ±2.26% (92 runs sampled)
👍 sjson.parse() x 1,091,921 ops/sec ±2.85% (86 runs sampled)
👍 json-pack CborDecoderBase x 1,203,319 ops/sec ±2.12% (90 runs sampled)
👍 cbor-x x 1,787,591 ops/sec ±2.94% (74 runs sampled)
👍 cbor x 45,127 ops/sec ±24.11% (64 runs sampled)
👍 json-pack MsgPackDecoderFast x 1,283,322 ops/sec ±1.93% (94 runs sampled)
👍 msgpackr x 1,890,533 ops/sec ±2.66% (90 runs sampled)
👍 @msgpack/msgpack x 1,364,025 ops/sec ±3.78% (67 runs sampled)
👍 msgpack5 x 117,205 ops/sec ±2.72% (90 runs sampled)
👍 msgpack-lite x 1,316,133 ops/sec ±0.74% (99 runs sampled)
👍 messagepack x 733,566 ops/sec ±1.55% (87 runs sampled)
Fastest is 👍 msgpackr
```

Encoder comparison:

```
npx ts-node benchmarks/json-pack/bench.encoders.ts
=============================================================================== Benchmark: Encoding
Warmup: 1000x , Node.js: v20.2.0 , Arch: arm64 , CPU: Apple M1 Max
---------------------------------------------------------------------------- Small object, 44 bytes
👍 CborEncoderFast x 6,319,117 ops/sec ±0.11% (101 runs sampled)
👍 CborEncoder x 6,001,443 ops/sec ±0.15% (101 runs sampled)
👎 MsgPackEncoderFast x 6,047,466 ops/sec ±0.20% (99 runs sampled)
👎 MsgPackEncoder x 5,493,093 ops/sec ±0.10% (101 runs sampled)
👎 JsonEncoder x 6,018,890 ops/sec ±0.11% (97 runs sampled)
👎 UbjsonEncoder x 6,545,118 ops/sec ±0.10% (97 runs sampled)
👎 IonEncoderFast x 1,032,434 ops/sec ±0.14% (99 runs sampled)
👎 Buffer.from(JSON.stringify()) x 2,300,069 ops/sec ±0.15% (100 runs sampled)
Fastest is 👎 UbjsonEncoder
------------------------------------------------------------------------- Typical object, 993 bytes
👍 CborEncoderFast x 460,125 ops/sec ±0.14% (98 runs sampled)
👍 CborEncoder x 439,506 ops/sec ±0.18% (98 runs sampled)
👎 MsgPackEncoderFast x 458,530 ops/sec ±0.15% (99 runs sampled)
👎 MsgPackEncoder x 449,540 ops/sec ±0.16% (100 runs sampled)
👎 JsonEncoder x 303,410 ops/sec ±0.12% (101 runs sampled)
👎 UbjsonEncoder x 479,450 ops/sec ±0.13% (99 runs sampled)
👎 IonEncoderFast x 68,000 ops/sec ±0.11% (102 runs sampled)
👎 Buffer.from(JSON.stringify()) x 207,747 ops/sec ±0.11% (98 runs sampled)
Fastest is 👎 UbjsonEncoder
-------------------------------------------------------------------------- Large object, 3741 bytes
👍 CborEncoderFast x 133,608 ops/sec ±0.15% (100 runs sampled)
👍 CborEncoder x 128,019 ops/sec ±0.13% (97 runs sampled)
👎 MsgPackEncoderFast x 133,863 ops/sec ±0.14% (99 runs sampled)
👎 MsgPackEncoder x 131,521 ops/sec ±0.18% (99 runs sampled)
👎 JsonEncoder x 93,018 ops/sec ±0.13% (98 runs sampled)
👎 UbjsonEncoder x 140,969 ops/sec ±0.15% (101 runs sampled)
👎 IonEncoderFast x 11,523 ops/sec ±0.15% (101 runs sampled)
👎 Buffer.from(JSON.stringify()) x 63,389 ops/sec ±0.13% (101 runs sampled)
Fastest is 👎 UbjsonEncoder
-------------------------------------------------------------------- Very large object, 45750 bytes
👍 CborEncoderFast x 5,790 ops/sec ±0.15% (100 runs sampled)
👍 CborEncoder x 5,579 ops/sec ±0.14% (100 runs sampled)
👎 MsgPackEncoderFast x 6,005 ops/sec ±0.13% (100 runs sampled)
👎 MsgPackEncoder x 5,670 ops/sec ±0.18% (99 runs sampled)
👎 JsonEncoder x 6,351 ops/sec ±0.16% (101 runs sampled)
👎 UbjsonEncoder x 6,248 ops/sec ±0.18% (99 runs sampled)
👎 IonEncoderFast x 1,868 ops/sec ±0.21% (98 runs sampled)
👎 Buffer.from(JSON.stringify()) x 7,240 ops/sec ±0.19% (99 runs sampled)
Fastest is 👎 Buffer.from(JSON.stringify())
------------------------------------------------------------------ Object with many keys, 969 bytes
👍 CborEncoderFast x 283,371 ops/sec ±0.18% (99 runs sampled)
👍 CborEncoder x 268,056 ops/sec ±0.17% (96 runs sampled)
👎 MsgPackEncoderFast x 285,224 ops/sec ±0.17% (96 runs sampled)
👎 MsgPackEncoder x 272,416 ops/sec ±0.21% (98 runs sampled)
👎 JsonEncoder x 234,921 ops/sec ±0.21% (98 runs sampled)
👎 UbjsonEncoder x 292,228 ops/sec ±0.19% (95 runs sampled)
👎 IonEncoderFast x 63,456 ops/sec ±0.14% (98 runs sampled)
👎 Buffer.from(JSON.stringify()) x 175,341 ops/sec ±0.86% (93 runs sampled)
Fastest is 👎 UbjsonEncoder
------------------------------------------------------------------------- String ladder, 3398 bytes
👍 CborEncoderFast x 280,167 ops/sec ±0.20% (100 runs sampled)
👍 CborEncoder x 283,404 ops/sec ±0.20% (97 runs sampled)
👎 MsgPackEncoderFast x 272,800 ops/sec ±0.18% (99 runs sampled)
👎 MsgPackEncoder x 283,433 ops/sec ±0.23% (98 runs sampled)
👎 JsonEncoder x 147,390 ops/sec ±0.16% (98 runs sampled)
👎 UbjsonEncoder x 290,624 ops/sec ±0.21% (98 runs sampled)
👎 IonEncoderFast x 25,452 ops/sec ±0.17% (101 runs sampled)
👎 Buffer.from(JSON.stringify()) x 145,352 ops/sec ±0.23% (99 runs sampled)
Fastest is 👎 UbjsonEncoder
-------------------------------------------------------------------------- Long strings, 7011 bytes
👍 CborEncoderFast x 394,386 ops/sec ±0.53% (95 runs sampled)
👍 CborEncoder x 394,442 ops/sec ±0.49% (94 runs sampled)
👎 MsgPackEncoderFast x 386,894 ops/sec ±0.54% (95 runs sampled)
👎 MsgPackEncoder x 394,019 ops/sec ±0.50% (95 runs sampled)
👎 JsonEncoder x 50,781 ops/sec ±0.13% (97 runs sampled)
👎 UbjsonEncoder x 396,184 ops/sec ±0.57% (95 runs sampled)
👎 IonEncoderFast x 11,799 ops/sec ±0.22% (99 runs sampled)
👎 Buffer.from(JSON.stringify()) x 28,742 ops/sec ±0.11% (102 runs sampled)
Fastest is 👎 UbjsonEncoder,👍 CborEncoder,👍 CborEncoderFast,👎 MsgPackEncoder
-------------------------------------------------------------------------- Short strings, 170 bytes
👍 CborEncoderFast x 1,816,742 ops/sec ±0.16% (100 runs sampled)
👍 CborEncoder x 1,831,503 ops/sec ±0.22% (97 runs sampled)
👎 MsgPackEncoderFast x 1,641,743 ops/sec ±0.17% (101 runs sampled)
👎 MsgPackEncoder x 1,694,803 ops/sec ±0.17% (97 runs sampled)
👎 JsonEncoder x 1,595,041 ops/sec ±0.12% (99 runs sampled)
👎 UbjsonEncoder x 1,779,112 ops/sec ±0.24% (98 runs sampled)
👎 IonEncoderFast x 422,031 ops/sec ±0.10% (101 runs sampled)
👎 Buffer.from(JSON.stringify()) x 1,001,976 ops/sec ±0.24% (98 runs sampled)
Fastest is 👍 CborEncoder
-------------------------------------------------------------------------------- Numbers, 136 bytes
👍 CborEncoderFast x 2,822,683 ops/sec ±0.14% (99 runs sampled)
👍 CborEncoder x 3,111,311 ops/sec ±0.20% (97 runs sampled)
👎 MsgPackEncoderFast x 2,918,971 ops/sec ±0.14% (100 runs sampled)
👎 MsgPackEncoder x 2,862,193 ops/sec ±0.13% (100 runs sampled)
👎 JsonEncoder x 1,706,584 ops/sec ±0.18% (96 runs sampled)
👎 UbjsonEncoder x 3,238,810 ops/sec ±0.15% (97 runs sampled)
👎 IonEncoderFast x 545,885 ops/sec ±0.16% (98 runs sampled)
👎 Buffer.from(JSON.stringify()) x 1,216,907 ops/sec ±0.20% (98 runs sampled)
Fastest is 👎 UbjsonEncoder
--------------------------------------------------------------------------------- Tokens, 308 bytes
👍 CborEncoderFast x 1,360,976 ops/sec ±0.20% (96 runs sampled)
👍 CborEncoder x 1,367,625 ops/sec ±0.16% (101 runs sampled)
👎 MsgPackEncoderFast x 1,753,202 ops/sec ±0.19% (99 runs sampled)
👎 MsgPackEncoder x 1,733,298 ops/sec ±0.16% (100 runs sampled)
👎 JsonEncoder x 1,411,382 ops/sec ±0.27% (98 runs sampled)
👎 UbjsonEncoder x 1,734,304 ops/sec ±0.17% (101 runs sampled)
👎 IonEncoderFast x 369,161 ops/sec ±0.21% (97 runs sampled)
👎 Buffer.from(JSON.stringify()) x 1,092,623 ops/sec ±0.15% (101 runs sampled)
Fastest is 👎 MsgPackEncoderFast
```


### Shallow reading

```
node benchmarks/json-pack/bench.shallow-read.js
=============================================================================== Benchmark: Encoding
Warmup: 10000x , Node.js: v16.14.2 , Arch: arm64 , CPU: Apple M1
------------------------------------------------------------------------- Typical object, 993 bytes
👍 JSON.parse() x 314,451 ops/sec ±0.24% (94 runs sampled)
👍 msgpackr x 332,628 ops/sec ±0.09% (99 runs sampled)
👍 cbor-x x 326,509 ops/sec ±0.05% (101 runs sampled)
👍 MsgPackDecoder x 368,088 ops/sec ±0.15% (100 runs sampled)
👍 CborDecoder x 327,286 ops/sec ±0.15% (101 runs sampled)
👍 MsgPackDecoder.{findKey,findIndex}() x 1,815,090 ops/sec ±0.07% (99 runs sampled)
👍 MsgPackDecoder.find() x 1,797,098 ops/sec ±0.15% (98 runs sampled)
👍 genShallowReader()(MsgPackDecoder) x 2,085,260 ops/sec ±0.19% (99 runs sampled)
Fastest is 👍 genShallowReader()(MsgPackDecoder)
```
