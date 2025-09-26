# estree-util-is-identifier-name

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[estree][] utility to check if something can be an identifier.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`cont(code[, options])`](#contcode-options)
    *   [`name(name[, options])`](#namename-options)
    *   [`start(code)`](#startcode)
    *   [Options](#options)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that can be used to check if something can be an
identifier name.
For example, `a`, `_`, and `a1` are fine, but `1` and `-` are not.

## When should I use this?

You can use this utility when generating IDs from strings or parsing IDs.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install estree-util-is-identifier-name
```

In Deno with [`esm.sh`][esmsh]:

```js
import {cont, name, start} from 'https://esm.sh/estree-util-is-identifier-name@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {cont, name, start} from 'https://esm.sh/estree-util-is-identifier-name@3?bundle'
</script>
```

## Use

```js
import {cont, name, start} from 'estree-util-is-identifier-name'

name('$something69') // => true
name('69') // => false
name('var') // => true (this does not handle keywords)

start(48) // => false (code point for `'0'`)
cont(48) // => true (code point for `'0'`)
```

## API

This package exports the identifiers [`cont`][api-cont],
[`name`][api-name], and
[`start`][api-start].
There is no default export.

### `cont(code[, options])`

Checks if the given code point can continue an identifier.

###### Parameters

*   `code` (`number`)
    — code point to check
*   `options` ([`Options`][api-options], optional)
    — configuration

###### Returns

Whether `code` can continue an identifier (`boolean`).

### `name(name[, options])`

Checks if the given value is a valid identifier name.

###### Parameters

*   `name` (`string`)
    — identifier to check
*   `options` ([`Options`][api-options], optional)
    — configuration

###### Returns

Whether `name` can be an identifier (`boolean`).

### `start(code)`

Checks if the given code point can start an identifier.

###### Parameters

*   `code` (`number`)
    — code point to check

###### Returns

Whether `code` can start an identifier (`boolean`).

### Options

Configuration (TypeScript type).

###### Fields

*   `jsx` (`boolean`, default: `false`)
    — support JSX identifiers.

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`estree-util-is-identifier-name@^3`, compatible with Node.js 16.

## Related

*   [`goto-bus-stop/estree-is-identifier`](https://github.com/goto-bus-stop/estree-is-identifier)
    — check if an AST node is an identifier

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

[build-badge]: https://github.com/syntax-tree/estree-util-is-identifier-name/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/estree-util-is-identifier-name/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/estree-util-is-identifier-name.svg

[coverage]: https://codecov.io/github/syntax-tree/estree-util-is-identifier-name

[downloads-badge]: https://img.shields.io/npm/dm/estree-util-is-identifier-name.svg

[downloads]: https://www.npmjs.com/package/estree-util-is-identifier-name

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=estree-util-is-identifier-name

[size]: https://bundlejs.com/?q=estree-util-is-identifier-name

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

[api-cont]: #contcode-options

[api-name]: #namename-options

[api-start]: #startcode

[api-options]: #options
