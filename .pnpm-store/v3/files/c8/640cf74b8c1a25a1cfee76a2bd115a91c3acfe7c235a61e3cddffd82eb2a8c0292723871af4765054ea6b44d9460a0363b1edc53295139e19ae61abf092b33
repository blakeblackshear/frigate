# estree-util-value-to-estree

[![github actions](https://github.com/remcohaszing/estree-util-value-to-estree/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/estree-util-value-to-estree/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/remcohaszing/estree-util-value-to-estree/branch/main/graph/badge.svg)](https://codecov.io/gh/remcohaszing/estree-util-value-to-estree)
[![npm version](https://img.shields.io/npm/v/estree-util-value-to-estree)](https://www.npmjs.com/package/estree-util-value-to-estree)
[![npm downloads](https://img.shields.io/npm/dm/estree-util-value-to-estree)](https://www.npmjs.com/package/estree-util-value-to-estree)

Convert a JavaScript value to an [ESTree](https://github.com/estree/estree) expression.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [`valueToEstree(value, options?)`](#valuetoestreevalue-options)
- [Compatibility](#compatibility)
- [License](#license)

## Installation

```sh
npm install estree-util-value-to-estree
```

## Usage

This package converts a JavaScript value to an [ESTree](https://github.com/estree/estree) expression
for values that can be constructed without the need for a context.

Currently the following types are supported:

- [`bigint`](https://developer.mozilla.org/docs/Glossary/BigInt)
- [`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)
- [`null`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Operators/null)
- [`number`](https://developer.mozilla.org/docs/Glossary/Number) (Including
  [Infinity](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Infinity)
  and [NaN](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/NaN))
- [`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)
- [`symbol`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
  ([shared](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Symbol#shared_symbols_in_the_global_symbol_registry)
  and
  [well-known](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Symbol#well-known_symbols))
- [`object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)
- [null-prototype `Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object#null-prototype_objects)
- [`undefined`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Undefined)
- [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [`BigInt64Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/BigInt64Array)
- [`BigUint64Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/BigUint64Array)
- [`Boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)
- [`Buffer`](https://nodejs.org/api/buffer.html)
- [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [`Float16Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Float16Array)
- [`Float32Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Float32Array)
- [`Float64Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Float64Array)
- [`Int16Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Int16Array)
- [`Int32Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Int32Array)
- [`Int8Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Int8Array)
- [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [`Number`](https://developer.mozilla.org/docs/Glossary/Number)
- [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- [`Set`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [`String`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)
- [`Temporal.Duration`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Duration)
- [`Temporal.Instant`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Instant)
- [`Temporal.PlainDate`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate)
- [`Temporal.PlainDateTime`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime)
- [`Temporal.PlainYearMonth`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainYearMonth)
- [`Temporal.PlainMonthDay`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainMonthDay)
- [`Temporal.PlainTime`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainTime)
- [`Temporal.ZonedDateTime`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime)
- [`Uint8Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)
- [`Uint8ClampedArray`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8ClampedArray)
- [`Uint16Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint16Array)
- [`Uint32Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array)
- [`URL`](https://developer.mozilla.org/docs/Web/API/URL)
- [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams)

If `options.instanceAsObject` is set to `true`, other objects are turned into plain object.

```ts
import assert from 'node:assert/strict'

import { valueToEstree } from 'estree-util-value-to-estree'

const result = valueToEstree({
  null: null,
  undefined,
  string: 'Hello world!',
  number: 42,
  negativeNumber: -1337,
  infinity: Number.POSITIVE_INFINITY,
  notANumber: Number.NaN,
  regex: /\w+/i,
  date: new Date('1970-01-01'),
  array: ['I’m an array item!'],
  object: { nested: 'value' }
})

assert.deepEqual(result, {
  type: 'ObjectExpression',
  properties: [
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'null' },
      value: { type: 'Literal', value: null }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'undefined' },
      value: { type: 'Identifier', name: 'undefined' }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'string' },
      value: { type: 'Literal', value: 'Hello world!' }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'number' },
      value: { type: 'Literal', value: 42 }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'negativeNumber' },
      value: {
        type: 'UnaryExpression',
        operator: '-',
        prefix: true,
        argument: { type: 'Literal', value: 1337 }
      }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'infinity' },
      value: { type: 'Identifier', name: 'Infinity' }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'notANumber' },
      value: { type: 'Identifier', name: 'NaN' }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'regex' },
      value: {
        type: 'Literal',
        value: /\w+/i,
        regex: { pattern: '\\w+', flags: 'i' }
      }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'date' },
      value: {
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'Date' },
        arguments: [{ type: 'Literal', value: 0 }]
      }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'array' },
      value: {
        type: 'ArrayExpression',
        elements: [{ type: 'Literal', value: 'I’m an array item!' }]
      }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'object' },
      value: {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'Property',
            method: false,
            shorthand: false,
            computed: false,
            kind: 'init',
            key: { type: 'Literal', value: 'nested' },
            value: { type: 'Literal', value: 'value' }
          }
        ]
      }
    }
  ]
})

class Point {
  line: number

  column: number

  constructor(line: number, column: number) {
    this.line = line
    this.column = column
  }
}

// Normally complex objects throw.
assert.throws(() => valueToEstree(new Point(2, 3)))

// `instanceAsObject: true` treats them as plain objects.
assert.deepEqual(valueToEstree(new Point(2, 3), { instanceAsObject: true }), {
  type: 'ObjectExpression',
  properties: [
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'line' },
      value: { type: 'Literal', value: 2 }
    },
    {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      kind: 'init',
      key: { type: 'Literal', value: 'column' },
      value: { type: 'Literal', value: 3 }
    }
  ]
})
```

## API

This API exports the function `valueToEstree`.

### `valueToEstree(value, options?)`

Convert a value to an [ESTree](https://github.com/estree/estree) node.

#### options

- `instanceAsObject` (boolean, default: `false`) — If true, treat objects that have a prototype as
  plain objects.
- `preserveReferences` (boolean, default: `false`) — If true, preserve references to the same object
  found within the input. This also allows to serialize recursive structures. If needed, the
  resulting expression will be an iife.

## Compatibility

This project is compatible with Node.js 16 or greater.

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
