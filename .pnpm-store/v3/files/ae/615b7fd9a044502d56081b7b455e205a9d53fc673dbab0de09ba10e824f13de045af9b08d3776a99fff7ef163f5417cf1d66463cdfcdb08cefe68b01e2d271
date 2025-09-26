# micromark-extension-mdxjs-esm

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[micromark][] extension to support [MDX][mdxjs] ESM (`import x from 'y'`).

## Contents

*   [What is this?](#what-is-this)
*   [When to use this](#when-to-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`mdxjsEsm(options)`](#mdxjsesmoptions)
    *   [`Options`](#options)
*   [Authoring](#authoring)
*   [Syntax](#syntax)
*   [Errors](#errors)
    *   [Could not parse import/exports with acorn](#could-not-parse-importexports-with-acorn)
    *   [Unexpected `$type` in code: only import/exports are supported](#unexpected-type-in-code-only-importexports-are-supported)
*   [Tokens](#tokens)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package contains an extension that adds support for the ESM syntax enabled
by [MDX][mdxjs] to [`micromark`][micromark].
These extensions are used inside MDX.
It matches how imports and exports work in JavaScript through acorn.

This package is aware of JavaScript syntax.

## When to use this

This project is useful when you want to support ESM in markdown.

You can use this extension when you are working with [`micromark`][micromark].
To support all MDX features, use
[`micromark-extension-mdxjs`][micromark-extension-mdxjs] instead.

When you need a syntax tree, combine this package with
[`mdast-util-mdxjs-esm`][mdast-util-mdxjs-esm].

All these packages are used in [`remark-mdx`][remark-mdx], which focusses on
making it easier to transform content by abstracting these internals away.

When you are using [`mdx-js/mdx`][mdxjs], all of this is already included.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install micromark-extension-mdxjs-esm
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxjsEsm} from 'https://esm.sh/micromark-extension-mdxjs-esm@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxjsEsm} from 'https://esm.sh/micromark-extension-mdxjs-esm@2?bundle'
</script>
```

## Use

```js
import {Parser} from 'acorn'
import acornJsx from 'acorn-jsx'
import {micromark} from 'micromark'
import {mdxjsEsm} from 'micromark-extension-mdxjs-esm'

const acorn = Parser.extend(acornJsx())

const output = micromark('import a from "b"\n\n# c', {
  extensions: [mdxjsEsm({acorn})]
})

console.log(output)
```

Yields:

```html
<h1>c</h1>
```

…which is useless: go to a syntax tree with
[`mdast-util-from-markdown`][mdast-util-from-markdown] and
[`mdast-util-mdxjs-esm`][mdast-util-mdxjs-esm] instead.

## API

This package exports the identifier [`mdxjsEsm`][api-mdxjs-esm].
There is no default export.

The export map supports the [`development` condition][development].
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition, production code is loaded.

### `mdxjsEsm(options)`

Create an extension for `micromark` to enable MDX ESM syntax.

###### Parameters

*   `options` ([`Options`][api-options], required)
    — configuration

###### Returns

Extension for `micromark` that can be passed in `extensions` to enable MDX
ESM syntax ([`Extension`][micromark-extension]).

### `Options`

Configuration (TypeScript type).

###### Fields

*   `acorn` ([`Acorn`][acorn], required)
    — acorn parser to use
*   `acornOptions` ([`AcornOptions`][acorn-options], default:
    `{ecmaVersion: 2024, locations: true, sourceType: 'module'}`)
    — configuration for acorn; all fields except `locations` can be set
*   `addResult` (`boolean`, default: `false`)
    — whether to add `estree` fields to tokens with results from acorn

## Authoring

When authoring markdown with ESM, make sure to follow export and import
statements with blank lines before more markdown.

All valid imports and exports are supported, depending on what the given acorn
instance and configuration supports.

When the lowercase strings `export` or `import` are found, followed by a space,
we expect JavaScript.
Otherwise, like normal in markdown, we exit and it’ll end up as a paragraph.
We continue parsing until we find a blank line.
At that point, we parse with acorn: it if parses, we found our block.
Otherwise, if parsing failed at the last character, we assume it’s a blank line
in code: we continue on until the next blank line and try again.
Otherwise, the acorn error is thrown.

Some examples of valid export and import statements:

```mdx
import a from 'b'
import * as a from 'b'
import {a} from 'b'
import {a as b} from 'c'
import a, {b as c} from 'd'
import a, * as b from 'c'
import 'a'

export var a = ''
export const a = ''
export let a = ''
export var a, b
export var a = 'a', b = 'b'
export function a() {}
export class a {}
export var {a} = {}
export var {a: b} = {}
export var [a] = []
export default a = 1
export default function a() {}
export default class a {}
export * from 'a'
export * as a from 'b'
export {a} from 'b'
export {a as b} from 'c'
export {default} from 'b'
export {default as a, b} from 'c'

{/* Blank lines are supported in expressions: */}

export function a() {

  return 'b'

}
```

```mdx-invalid
{/* A blank line must be used after import/exports: this is incorrect! */}

import a from 'b'
## Hello, world!
```

## Syntax

ESM forms with the following BNF:

```bnf
; Restriction: the entire construct must be valid JavaScript.
mdx_esm ::= word ' ' *line *(eol *line)

word ::= 'e' 'x' 'p' 'o' 'r' 't' | 'i' 'm' 'p' 'o' 'r' 't'
```

This construct must be followed by a blank line or eof (end of file).

## Errors

### Could not parse import/exports with acorn

This error occurs if acorn crashes (source: `micromark-extension-mdxjs-esm`,
rule id: `acorn`).
For example:

```mdx-invalid
import 1/1
```

### Unexpected `$type` in code: only import/exports are supported

This error occurs when a non-ESM construct is found (source:
`micromark-extension-mdxjs-esm`, rule id: `non-esm`).
For example:

```mdx-invalid
export var a = 1
var b
```

## Tokens

An `mdxjsEsm` token is used to reflect the block of import/exports in markdown.

It includes:

*   `lineEnding` for the `\r`, `\n`, and `\r\n`
*   `lineEndingBlank` for the same characters but when after potential
    whitespace and another line ending
*   `whitespace` for markdown spaces and tabs in blank lines
*   `mdxjsEsmData` for any character in a line of `mdxjsEsm`

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`micromark-extension-mdxjs-esm@^2`, compatible with Node.js 16.

This package works with `micromark` version `3` and later.

## Security

This package is safe.

## Related

*   [`micromark-extension-mdxjs`][micromark-extension-mdxjs]
    — support all MDX syntax
*   [`mdast-util-mdxjs-esm`][mdast-util-mdxjs-esm]
    — support MDX ESM in mdast
*   [`remark-mdx`][remark-mdx]
    — support all MDX syntax in remark

## Contribute

See [`contributing.md` in `micromark/.github`][contributing] for ways to get
started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/micromark/micromark-extension-mdxjs-esm/workflows/main/badge.svg

[build]: https://github.com/micromark/micromark-extension-mdxjs-esm/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-mdxjs-esm.svg

[coverage]: https://codecov.io/github/micromark/micromark-extension-mdxjs-esm

[downloads-badge]: https://img.shields.io/npm/dm/micromark-extension-mdxjs-esm.svg

[downloads]: https://www.npmjs.com/package/micromark-extension-mdxjs-esm

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=micromark-extension-mdxjs-esm

[size]: https://bundlejs.com/?q=micromark-extension-mdxjs-esm

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/micromark/micromark/discussions

[npm]: https://docs.npmjs.com/cli/install

[esmsh]: https://esm.sh

[license]: license

[author]: https://wooorm.com

[contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[support]: https://github.com/micromark/.github/blob/main/support.md

[coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[typescript]: https://www.typescriptlang.org

[development]: https://nodejs.org/api/packages.html#packages_resolving_user_conditions

[micromark]: https://github.com/micromark/micromark

[micromark-extension]: https://github.com/micromark/micromark#syntaxextension

[micromark-extension-mdxjs]: https://github.com/micromark/micromark-extension-mdxjs

[mdast-util-mdxjs-esm]: https://github.com/syntax-tree/mdast-util-mdxjs-esm

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[remark-mdx]: https://mdxjs.com/packages/remark-mdx/

[mdxjs]: https://mdxjs.com

[acorn]: https://github.com/acornjs/acorn

[acorn-options]: https://github.com/acornjs/acorn/blob/96c721dbf89d0ccc3a8c7f39e69ef2a6a3c04dfa/acorn/dist/acorn.d.ts#L16

[api-mdxjs-esm]: #mdxjsesmoptions

[api-options]: #options
