# unist-util-position-from-estree

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[unist][] utility to get a position from an [estree][] node.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`positionFromEstree(node)`](#positionfromestreenode)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a tiny utility that can create a proper unist position from
an estree node

## When should I use this?

You can use this package when you want to use other unist utilities with estree
nodes.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install unist-util-position-from-estree
```

In Deno with [`esm.sh`][esmsh]:

```js
import {positionFromEstree} from 'https://esm.sh/unist-util-position-from-estree@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {positionFromEstree} from 'https://esm.sh/unist-util-position-from-estree@2?bundle'
</script>
```

## Use

```js
import {parse} from 'acorn'
import {positionFromEstree} from 'unist-util-position-from-estree'

// Make acorn support line/column.
const node = parse('function x() { console.log(1) }', {
  ecmaVersion: 2020,
  locations: true
})

console.log(positionFromEstree(node)) // `Program`
console.log(positionFromEstree(node.body[0].id)) // `x`
console.log(positionFromEstree(node.body[0].body.body[0].expression)) // Call
```

Yields:

```js
{
  start: {line: 1, column: 1, offset: 0},
  end: {line: 1, column: 32, offset: 31}
}
{
  start: {line: 1, column: 10, offset: 9},
  end: {line: 1, column: 11, offset: 10}
}
{
  start: {line: 1, column: 16, offset: 15},
  end: {line: 1, column: 30, offset: 29}
}
```

## API

This package exports the identifier [`positionFromEstree`][positionfromestree].
There is no default export.

### `positionFromEstree(node)`

Turn an estree `node` into a unist `position`.

###### Parameters

*   `node` ([`Node`][node])
    — estree node

###### Returns

unist position, if valid ([`Position`][position] or `undefined`).

## Types

This package is fully typed with [TypeScript][].
It exports no additional types.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`unist-util-position-from-estree@^2`, compatible with Node.js 16.

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definition -->

[build-badge]: https://github.com/syntax-tree/unist-util-position-from-estree/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/unist-util-position-from-estree/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/unist-util-position-from-estree.svg

[coverage]: https://codecov.io/github/syntax-tree/unist-util-position-from-estree

[downloads-badge]: https://img.shields.io/npm/dm/unist-util-position-from-estree.svg

[downloads]: https://www.npmjs.com/package/unist-util-position-from-estree

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=unist-util-position-from-estree

[size]: https://bundlejs.com/?q=unist-util-position-from-estree

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

[estree]: https://github.com/estree/estree

[node]: https://github.com/estree/estree/blob/master/es5.md#node-objects

[unist]: https://github.com/syntax-tree/unist

[position]: https://github.com/syntax-tree/unist#position

[positionfromestree]: #positionfromestreenode
