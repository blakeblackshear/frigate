# esast-util-from-js

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[esast][] (and [estree][]) utility to parse trees from JavaScript.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`fromJs(value[, options])`](#fromjsvalue-options)
    *   [`Options`](#options)
    *   [`Plugin`](#plugin)
    *   [`Value`](#value)
    *   [`Version`](#version-1)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that turns a string of JavaScript into an esast
(estree with some extra cleanliness) syntax tree.

## When should I use this?

You can use this utility when you want to deal with ASTs of JavaScript
combined with other [unist][] and [`vfile`][vfile] things.
You can use [`acorn`][acorn] itself if you don’t care about unified.

The utility [`estree-util-to-js`][estree-util-to-js] does the inverse of this
utility.
It turns the tree into a string of JavaScript.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install esast-util-from-js
```

In Deno with [`esm.sh`][esmsh]:

```js
import {fromJs} from 'https://esm.sh/esast-util-from-js@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {fromJs} from 'https://esm.sh/esast-util-from-js@2?bundle'
</script>
```

## Use

```js
import fs from 'node:fs/promises'
import {fromJs} from 'esast-util-from-js'

const tree = fromJs(await fs.readFile('example.js'), {module: true})

console.log(tree)
```

Yields:

```js
{
  type: 'Program',
  body: [
    {
      type: 'ImportDeclaration',
      specifiers: [Array],
      source: [Object],
      position: [Object]
    },
    {
      type: 'ImportDeclaration',
      specifiers: [Array],
      source: [Object],
      position: [Object]
    },
    {
      type: 'VariableDeclaration',
      declarations: [Array],
      kind: 'const',
      position: [Object]
    },
    {
      type: 'ExpressionStatement',
      expression: [Object],
      position: [Object]
    }
  ],
  sourceType: 'module',
  comments: [],
  position: {
    start: {line: 1, column: 1, offset: 0},
    end: {line: 7, column: 1, offset: 157}
  }
}
```

## API

This package exports the identifier [`fromJs`][api-from-js].
There is no default export.

### `fromJs(value[, options])`

Parse JavaScript to an esast.

###### Parameters

*   `value` ([`Value`][api-value])
    — serialized JavaScript to parse
*   `options` ([`Options`][api-options], optional)
    — configuration

###### Returns

Tree ([`Node`][node]).

###### Throws

When the JavaScript cannot be parsed with `acorn`, a
[`VFileMessage`][vfile-message] is thrown.

This can for example happen when passing modern syntax (you could maybe use a
newer `version`, or it might be that the syntax is not yet supported), or just
otherwise invalid JavaScript (you might need a plugin).

### `Options`

Configuration (TypeScript type).

##### Fields

###### `version`

JavaScript version ([`Version`][api-version], default: `'latest'`).

When a number, must be a year in the range `2015` and `2023` (both including).
`'latest'` is the same as passing the latest supported year.

> ☢️ **Danger**: `'latest'` is a sliding thing, you could consider it as
> breaking semver.
> Pass an actual year to lock that down.

###### `module`

Whether this is a module (ESM) or a script (`boolean`, default: `false`).

###### `allowReturnOutsideFunction`

Whether a return statement is allowed in the top scope (`boolean`, default:
`false`).

###### `allowImportExportEverywhere`

Whether import/export statements are allowed in the every scope (`boolean`,
default: `false`).

###### `allowAwaitOutsideFunction`

Whether `await` is allowed in the top scope (`boolean`, default: depends).
Defaults to `version >= 2022`.

###### `allowSuperOutsideMethod`

Whether `super` is allowed outside methods (`boolean`, default: `false`).

###### `allowHashBang`

Whether a shell hasbang is allowed (`boolean`, default: `false`).

###### `plugins`

List of acorn plugins ([`Array<Plugin>`][api-plugin], default: `[]`).
Examples are [`acorn-jsx`][acorn-jsx] and [`acorn-stage3`][acorn-stage3].

### `Plugin`

Acorn plugin (TypeScript type).

###### Type

```ts
type Plugin = (Parser: ParserClass) => ParserClass
```

### `Value`

Input value (TypeScript type).

When a typed array, must be UTF-8.

###### Type

```ts
type Value = Uint8Array | string
```

### `Version`

JavaScript version (TypeScript type).

`'latest'` is equivalent to the latest supported year.

###### Type

```ts
type Version = 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 'latest'
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`Options`][api-options],
[`Plugin`][api-plugin],
[`Value`][api-value], and
[`Version`][api-version].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `esast-util-from-js@^2`,
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

[build-badge]: https://github.com/syntax-tree/esast-util-from-js/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/esast-util-from-js/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/esast-util-from-js.svg

[coverage]: https://codecov.io/github/syntax-tree/esast-util-from-js

[downloads-badge]: https://img.shields.io/npm/dm/esast-util-from-js.svg

[downloads]: https://www.npmjs.com/package/esast-util-from-js

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=esast-util-from-js

[size]: https://bundlejs.com/?q=esast-util-from-js

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

[node]: https://github.com/syntax-tree/esast#node

[estree]: https://github.com/estree/estree

[unist]: https://github.com/syntax-tree/unist

[vfile]: https://github.com/vfile/vfile

[acorn]: https://github.com/acornjs/acorn

[acorn-jsx]: https://github.com/acornjs/acorn-jsx

[acorn-stage3]: https://github.com/acornjs/acorn-stage3

[estree-util-to-js]: https://github.com/syntax-tree/estree-util-to-js

[vfile-message]: https://github.com/vfile/vfile-message

[api-from-js]: #fromjsvalue-options

[api-options]: #options

[api-plugin]: #plugin

[api-value]: #value

[api-version]: #version-1
