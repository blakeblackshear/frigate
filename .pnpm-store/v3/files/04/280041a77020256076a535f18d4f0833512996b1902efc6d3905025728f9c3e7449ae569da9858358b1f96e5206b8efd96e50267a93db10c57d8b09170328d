# JSON Pointer - `json-pointer`

Fast implementation of [JSON Pointer (RFC 6901)][json-pointer]
specification in TypeScript.

[json-pointer]: https://tools.ietf.org/html/rfc6901


## Usage

Can find a value in a JSON object using three methods: (1) JSON Pointer string,
(2) array of steps, or (3) a pre-compiled function.


## Examples

Find the value in a JSON document at some specific location.


### Find by JSON Pointer string

```js
import { findByPointer } from '@jsonjoy.com/json-pointer';

const doc = {
  foo: {
    bar: 123,
  },
};

const res = findByPointer(doc, '/foo/bar');
```


### Find by path array

Alternatively, you can specify an array of steps, such as `['foo', 'bar']`. Or,
use the `parseJsonPointer` function to convert a JSON Pointer string to an array.

```js
import { find, parseJsonPointer } from '@jsonjoy.com/json-pointer';

const doc = {
  foo: {
    bar: 123,
  },
};

const path = parseJsonPointer('/foo/bar');
const ref = find(doc, path);

console.log(ref);
// { val: 123, obj: { bar: 123 }, key: 'bar' }
```


### Pre-compiled function

If you know the path in advance, you can compile a function that will find the
value at that location, it will work few times faster than the previous methods.

```js
import { $$find } from '@jsonjoy.com/json-pointer/lib/codegen';

const doc = {
  foo: {
    bar: 123,
  },
};
const finder = $$find(['foo', 'bar']);

const res = finder(doc);
```


## Low-level API

Convert JSON Pointer to path array and back.

```js
import { parseJsonPointer } from '@jsonjoy.com/json-pointer';

console.log(parseJsonPointer('/f~0o~1o/bar/1/baz'));
// [ 'f~o/o', 'bar', '1', 'baz' ]

console.log(formatJsonPointer(['f~o/o', 'bar', '1', 'baz']));
// /f~0o~1o/bar/1/baz
```

Decode and encode a single step of JSON Pointer.

```js
console.log(unescapeComponent('~0~1'));
// ~/

console.log(escapeComponent('~/'));
// ~0~1
```
