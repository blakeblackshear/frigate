# estree-util-to-js

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[estree][] (and [esast][]) utility to serialize estrees as JavaScript.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`toJs(tree[, options])`](#tojstree-options)
    *   [`jsx`](#jsx)
    *   [`Handler`](#handler)
    *   [`Handlers`](#handlers)
    *   [`Map`](#map)
    *   [`Options`](#options)
    *   [`Result`](#result)
    *   [`State`](#state)
*   [Examples](#examples)
    *   [Example: source maps](#example-source-maps)
    *   [Example: comments](#example-comments)
    *   [Example: JSX](#example-jsx)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that turns an estree syntax tree into a string of
JavaScript.

## When should I use this?

You can use this utility when you want to get the serialized JavaScript that is
represented by the syntax tree, either because you’re done with the syntax tree,
or because you’re integrating with another tool that does not support syntax
trees.

This utility is particularly useful when integrating with other unified tools,
such as unist and vfile.

The utility [`esast-util-from-js`][esast-util-from-js] does the inverse of this
utility.
It turns JS into esast.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install estree-util-to-js
```

In Deno with [`esm.sh`][esmsh]:

```js
import {toJs} from 'https://esm.sh/estree-util-to-js@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {toJs} from 'https://esm.sh/estree-util-to-js@2?bundle'
</script>
```

## Use

```js
import fs from 'node:fs/promises'
import {parse} from 'acorn'
import {toJs} from 'estree-util-to-js'

const file = String(await fs.readFile('index.js'))

const tree = parse(file, {ecmaVersion: 2022, sourceType: 'module', locations: true})

// @ts-expect-error: acorn is funky but it works fine.
console.log(toJs(tree))
```

Yields:

```js
{
  value: "export {toJs} from './lib/index.js';\nexport {jsx} from './lib/jsx.js';\n",
  map: undefined
}
```

## API

This package exports the identifiers [`jsx`][api-jsx] and [`toJs`][api-to-js].
There is no default export.

### `toJs(tree[, options])`

Serialize an estree as JavaScript.

###### Parameters

*   `tree` ([`Program`][program])
    — estree
*   `options` ([`Options`][api-options])
    — configuration

###### Returns

Result, optionally with source map ([`Result`][api-result]).

### `jsx`

Map of handlers to handle the nodes of JSX extensions in JavaScript
([`Handlers`][api-handlers]).

### `Handler`

Handle a particular node (TypeScript type).

###### Parameters

*   `this` (`Generator`)
    — `astring` generator
*   `node` ([`Node`][node])
    — node to serialize
*   `state` ([`State`][api-state])
    — info passed around

###### Returns

Nothing (`undefined`).

### `Handlers`

Handlers of nodes (TypeScript type).

###### Type

```ts
type Handlers = Partial<Record<Node['type'], Handler>>
```

### `Map`

Raw source map from `source-map` (TypeScript type).

### `Options`

Configuration (TypeScript type).

###### Fields

*   `SourceMapGenerator` ([`SourceMapGenerator`][source-map])
    — generate a source map with this class
*   `filePath` (`string`)
    — path to original input file
*   `handlers` ([`Handlers`][api-handlers])
    — extra handlers

### `Result`

Result (TypeScript type).

###### Fields

*   `value` (`string`)
    — serialized JavaScript
*   `map` ([`Map`][api-map] or `undefined`)
    — source map as (parsed) JSON

### `State`

State from `astring` (TypeScript type).

## Examples

### Example: source maps

Source maps are supported when passing the `SourceMapGenerator` class from
[`source-map`][source-map].
You should also pass `filePath`.
Modified example from § Use above:

```diff
 import fs from 'node:fs/promises'
 import {parse} from 'acorn'
+import {SourceMapGenerator} from 'source-map'
 import {toJs} from 'estree-util-to-js'

-const file = String(await fs.readFile('index.js'))
+const filePath = 'index.js'
+const file = String(await fs.readFile(filePath))

 const tree = parse(file, {
   ecmaVersion: 2022,
@@ -11,4 +13,4 @@ const tree = parse(file, {
 })

 // @ts-expect-error: acorn is funky but it works fine.
-console.log(toJs(tree))
+console.log(toJs(tree, {filePath, SourceMapGenerator}))
```

Yields:

```js
{
  value: "export {toJs} from './lib/index.js';\nexport {jsx} from './lib/jsx.js';\n",
  map: {
    version: 3,
    sources: [ 'index.js' ],
    names: [],
    mappings: 'QAOQ,WAAW;QACX,UAAU',
    file: 'index.js'
  }
}
```

### Example: comments

To get comments to work, they have to be inside the tree.
This is not done by Acorn.
[`estree-util-attach-comments`][estree-util-attach-comments] can do that.
Modified example from § Use above:

```diff
 import fs from 'node:fs/promises'
 import {parse} from 'acorn'
+import {attachComments} from 'estree-util-attach-comments'
 import {toJs} from 'estree-util-to-js'

 const file = String(await fs.readFile('index.js'))

+/** @type {Array<import('estree-jsx').Comment>} */
+const comments = []
 const tree = parse(file, {
   ecmaVersion: 2022,
   sourceType: 'module',
-  locations: true
+  locations: true,
+  // @ts-expect-error: acorn is funky these comments are fine.
+  onComment: comments
 })
+attachComments(tree, comments)

 // @ts-expect-error: acorn is funky but it works fine.
 console.log(toJs(tree))
```

Yields:

```js
{
  value: '/**\n' +
    "* @typedef {import('./lib/index.js').Options} Options\n" +
    "* @typedef {import('./lib/types.js').Handler} Handler\n" +
    "* @typedef {import('./lib/types.js').Handlers} Handlers\n" +
    "* @typedef {import('./lib/types.js').State} State\n" +
    '*/\n' +
    "export {toJs} from './lib/index.js';\n" +
    "export {jsx} from './lib/jsx.js';\n",
  map: undefined
}
```

### Example: JSX

To get JSX to work, handlers need to be registered.
This is not done by default, but they are exported as `jsx` and can be passed.
Modified example from § Use above:

```diff
 import fs from 'node:fs/promises'
-import {parse} from 'acorn'
-import {toJs} from 'estree-util-to-js'
+import {Parser} from 'acorn'
+import acornJsx from 'acorn-jsx'
+import {jsx, toJs} from 'estree-util-to-js'

-const file = String(await fs.readFile('index.js'))
+const file = '<>{1 + 1}</>'

-const tree = parse(file, {
+const tree = Parser.extend(acornJsx()).parse(file, {
   ecmaVersion: 2022,
   sourceType: 'module',
   locations: true
 })

 // @ts-expect-error: acorn is funky but it works fine.
-console.log(toJs(tree))
+console.log(toJs(tree, {handlers: jsx}))
```

Yields:

```js
{ value: '<>{1 + 1}</>;\n', map: undefined }
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`Handler`][api-handler],
[`Handlers`][api-handlers],
[`Map`][api-map],
[`Options`][api-options],
[`Result`][api-result], and
[`State`][api-state].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `estree-util-to-js@^2`,
compatible with Node.js 16.

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/estree-util-to-js/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/estree-util-to-js/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/estree-util-to-js.svg

[coverage]: https://codecov.io/github/syntax-tree/estree-util-to-js

[downloads-badge]: https://img.shields.io/npm/dm/estree-util-to-js.svg

[downloads]: https://www.npmjs.com/package/estree-util-to-js

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=estree-util-to-js

[size]: https://bundlejs.com/?q=estree-util-to-js

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[license]: license

[author]: https://wooorm.com

[health]: https://github.com/syntax-tree/.github

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[esast]: https://github.com/syntax-tree/esast

[esast-util-from-js]: https://github.com/syntax-tree/esast-util-from-js

[estree]: https://github.com/estree/estree

[estree-util-attach-comments]: https://github.com/syntax-tree/estree-util-attach-comments

[program]: https://github.com/estree/estree/blob/master/es2015.md#programs

[node]: https://github.com/estree/estree/blob/master/es5.md#node-objects

[source-map]: https://github.com/mozilla/source-map

[api-jsx]: #jsx

[api-to-js]: #tojstree-options

[api-handler]: #handler

[api-handlers]: #handlers

[api-map]: #map

[api-options]: #options

[api-state]: #state

[api-result]: #result
