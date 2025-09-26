# micromark-factory-mdx-expression

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][opencollective]
[![Backers][backers-badge]][opencollective]
[![Chat][chat-badge]][chat]

[micromark][] factory to parse MDX expressions (found in JSX attributes, flow,
text).

## Contents

* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`factoryMdxExpression(…)`](#factorymdxexpression)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install micromark-factory-mdx-expression
```

In Deno with [`esm.sh`][esmsh]:

```js
import {factoryMdxExpression} from 'https://esm.sh/micromark-factory-mdx-expression@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {factoryMdxExpression} from 'https://esm.sh/micromark-factory-mdx-expression@2?bundle'
</script>
```

## Use

```js
import {ok as assert} from 'devlop'
import {factoryMdxExpression} from 'micromark-factory-mdx-expression'
import {codes} from 'micromark-util-symbol'

// A micromark tokenizer that uses the factory:
/** @type {Tokenizer} */
function tokenizeFlowExpression(effects, ok, nok) {
  return start

  // …

  /** @type {State} */
  function start(code) {
    assert(code === codes.leftCurlyBrace, 'expected `{`')
    return factoryMdxExpression.call(
      self,
      effects,
      factorySpace(effects, after, types.whitespace),
      'mdxFlowExpression',
      'mdxFlowExpressionMarker',
      'mdxFlowExpressionChunk',
      acorn,
      acornOptions,
      addResult,
      spread,
      allowEmpty
    )(code)
  }

  // …
}
```

## API

This module exports the identifier
[`factoryMdxExpression`][api-factory-mdx-expression].
There is no default export.

The export map supports the [`development` condition][development].
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition, production code is loaded.

### `factoryMdxExpression(…)`

###### Parameters

* `effects` (`Effects`)
  — context
* `ok` (`State`)
  — state switched to when successful
* `type` (`string`)
  — token type for whole (`{}`)
* `markerType` (`string`)
  — token type for the markers (`{`, `}`)
* `chunkType` (`string`)
  — token type for the value (`1`)
* `acorn` (`Acorn`)
  — object with `acorn.parse` and `acorn.parseExpressionAt`
* `acornOptions` ([`AcornOptions`][acorn-options])
  — configuration for acorn
* `boolean` (`addResult`, default: `false`)
  — add `estree` to token
* `boolean` (`spread`, default: `false`)
  — support a spread (`{...a}`) only
* `boolean` (`allowEmpty`, default: `false`)
  — support an empty expression
* `boolean` (`allowLazy`, default: `false`)
  — support lazy continuation of an expression

###### Returns

`State`.

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`Acorn`][acorn] and
[`AcornOptions`][acorn-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`micromark-factory-mdx-expression@^2`, compatible with Node.js 16.

This package works with `micromark` version `3` and later.

## Security

This package is safe.

## Contribute

See [`contributing.md`][contributing] in [`micromark/.github`][health] for ways
to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organisation, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[acorn]: https://github.com/acornjs/acorn

[acorn-options]: https://github.com/acornjs/acorn/blob/96c721dbf89d0ccc3a8c7f39e69ef2a6a3c04dfa/acorn/dist/acorn.d.ts#L16

[api-factory-mdx-expression]: #micromark-factory-mdx-expression

[author]: https://wooorm.com

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/micromark/micromark-extension-mdx-expression/actions

[build-badge]: https://github.com/micromark/micromark-extension-mdx-expression/workflows/main/badge.svg

[chat]: https://github.com/micromark/micromark/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[coverage]: https://codecov.io/github/micromark/micromark-extension-mdx-expression

[coverage-badge]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-mdx-expression.svg

[development]: https://nodejs.org/api/packages.html#packages_resolving_user_conditions

[downloads]: https://www.npmjs.com/package/micromark-factory-mdx-expression

[downloads-badge]: https://img.shields.io/npm/dm/micromark-factory-mdx-expression.svg

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[health]: https://github.com/micromark/.github

[license]: https://github.com/micromark/micromark-extension-mdx-expression/blob/main/license

[micromark]: https://github.com/micromark/micromark

[npm]: https://docs.npmjs.com/cli/install

[opencollective]: https://opencollective.com/unified

[size]: https://bundlejs.com/?q=micromark-factory-mdx-expression

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=micromark-factory-mdx-expression

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[support]: https://github.com/micromark/.github/blob/main/support.md

[typescript]: https://www.typescriptlang.org
