# collapse-white-space

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]

Collapse white space.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`collapseWhiteSpace(value[, options|style])`](#collapsewhitespacevalue-optionsstyle)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This is a small package that collapses multiple white space characters into one.

## When should I use this?

You can use this package if you want to HTML or JavaScript (default) white space
to a single character.
You can optionally drop initial and final white space.
By default it collapses to a single space, but optionally line endings can be
preserved.

## Install

This package is [ESM only][esm].
In Node.js (version 12.20+, 14.14+, or 16.0+), install with [npm][]:

```sh
npm install collapse-white-space
```

In Deno with [Skypack][]:

```js
import {collapseWhiteSpace} from 'https://cdn.skypack.dev/collapse-white-space@2?dts'
```

In browsers with [Skypack][]:

```html
<script type="module">
  import {collapseWhiteSpace} from 'https://cdn.skypack.dev/collapse-white-space@2?min'
</script>
```

## Use

```js
import {collapseWhiteSpace} from 'collapse-white-space'

collapseWhiteSpace('\tfoo \n\tbar  \t\r\nbaz') //=> ' foo bar baz'
```

## API

This package exports the following identifier: `collapseWhiteSpace`.
There is no default export.

### `collapseWhiteSpace(value[, options|style])`

Collapse white space in `value` (`string`).

##### `style`

Treated as `options.style`.

##### `options`

Configuration.

###### `options.style`

Style of white space to support (`'html'` or `'js'`, default: `'js'`).
JavaScript white space matches the pattern `\s+`.
HTML white space matches `[\t\n\v\f\r ]`.

###### `options.preserveLineEndings`

Whether to collapse white space containing a line ending to that line ending
(`boolean`, default: `false`).
The default is to collapse to a single space.
Line endings matches the pattern `\r?\n|\r`.

###### `options.trim`

Whether to drop white space at the start and end of `value` (`boolean`, default:
`false`).
The default is to keep it.

###### Returns

`string` – value with collapsed white space.

## Types

This package is fully typed with [TypeScript][].
It exports `Options` and `Style` types, which specify the interface of the
accepted options.

## Compatibility

This package is at least compatible with all maintained versions of Node.js.
As of now, that is Node.js 12.20+, 14.14+, and 16.0+.
It also works in Deno and modern browsers.

## Security

This package is safe.

## Related

*   [`wooorm/is-whitespace-character`](https://github.com/wooorm/is-whitespace-character)
    — check if a character is a white space character
*   [`wooorm/detab`](https://github.com/wooorm/detab)
    — convert tabs to spaces
*   [`wooorm/trim-lines`](https://github.com/wooorm/trim-lines)
    — remove tabs and spaces around line-breaks

## Contribute

Yes please!
See [How to Contribute to Open Source][contribute].

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/wooorm/collapse-white-space/workflows/main/badge.svg

[build]: https://github.com/wooorm/collapse-white-space/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/wooorm/collapse-white-space.svg

[coverage]: https://codecov.io/github/wooorm/collapse-white-space

[downloads-badge]: https://img.shields.io/npm/dm/collapse-white-space.svg

[downloads]: https://www.npmjs.com/package/collapse-white-space

[size-badge]: https://img.shields.io/bundlephobia/minzip/collapse-white-space.svg

[size]: https://bundlephobia.com/result?p=collapse-white-space

[npm]: https://docs.npmjs.com/cli/install

[skypack]: https://www.skypack.dev

[license]: license

[author]: https://wooorm.com

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[typescript]: https://www.typescriptlang.org

[contribute]: https://opensource.guide/how-to-contribute/
