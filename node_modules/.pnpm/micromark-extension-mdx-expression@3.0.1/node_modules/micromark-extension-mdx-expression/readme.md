# micromark-extension-mdx-expression

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[micromark][] extension to support [MDX][mdxjs] expressions (`{Math.PI}`).

## Contents

* [What is this?](#what-is-this)
* [When to use this](#when-to-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`mdxExpression(options?)`](#mdxexpressionoptions)
  * [Options](#options)
* [Authoring](#authoring)
* [Syntax](#syntax)
* [Errors](#errors)
  * [Unexpected end of file in expression, expected a corresponding closing brace for `{`](#unexpected-end-of-file-in-expression-expected-a-corresponding-closing-brace-for-)
  * [Unexpected lazy line in expression in container, expected line to be prefixed…](#unexpected-lazy-line-in-expression-in-container-expected-line-to-be-prefixed)
  * [Unexpected `$type` in code: expected an object spread (`{...spread}`)](#unexpected-type-in-code-expected-an-object-spread-spread)
  * [Unexpected extra content in spread: only a single spread is supported](#unexpected-extra-content-in-spread-only-a-single-spread-is-supported)
  * [Could not parse expression with acorn](#could-not-parse-expression-with-acorn)
* [Tokens](#tokens)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package contains an extension that adds support for the expression syntax
enabled by [MDX][mdxjs] to [`micromark`][micromark].
These extensions are used inside MDX.

This package can be made aware or unaware of JavaScript syntax.
When unaware, expressions could include Rust or variables or whatnot.

## When to use this

This project is useful when you want to support expressions in markdown.

You can use this extension when you are working with [`micromark`][micromark].
To support all MDX features, use
[`micromark-extension-mdxjs`][micromark-extension-mdxjs] instead.

When you need a syntax tree, combine this package with
[`mdast-util-mdx-expression`][mdast-util-mdx-expression].

All these packages are used in [`remark-mdx`][remark-mdx], which focusses on
making it easier to transform content by abstracting these internals away.

When you are using [`mdx-js/mdx`][mdxjs], all of this is already included.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install micromark-extension-mdx-expression
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxExpression} from 'https://esm.sh/micromark-extension-mdx-expression@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxExpression} from 'https://esm.sh/micromark-extension-mdx-expression@2?bundle'
</script>
```

## Use

```js
import {Parser} from 'acorn'
import acornJsx from 'acorn-jsx'
import {micromark} from 'micromark'
import {mdxExpression} from 'micromark-extension-mdx-expression'

// Unaware of JavaScript (“agnostic”) (balanced braces):
const output = micromark('a {1 + 1} b', {extensions: [mdxExpression()]})

console.log(output)

// Aware of JavaScript:
micromark('a {!} b', {extensions: [mdxExpression({acorn: Parser.extend(acornJsx())})]})
```

Yields:

```html
<p>a  b</p>
```

```text
[1:5: Could not parse expression with acorn] {
  ancestors: undefined,
  cause: SyntaxError: Unexpected token
      at pp$4.raise (file:///Users/tilde/Projects/oss/micromark-extension-mdx-expression/node_modules/acorn/dist/acorn.mjs:3547:13)
      at pp$9.unexpected (file:///Users/tilde/Projects/oss/micromark-extension-mdx-expression/node_modules/acorn/dist/acorn.mjs:758:8)
      …
    pos: 4,
    loc: { line: 1, column: 4 },
    raisedAt: 1
  },
  column: 5,
  fatal: undefined,
  line: 1,
  place: { line: 1, column: 5, offset: 4 },
  reason: 'Could not parse expression with acorn',
  ruleId: 'acorn',
  source: 'micromark-extension-mdx-expression',
  url: 'https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-extension-mdx-expression#could-not-parse-expression-with-acorn'
}
```

…which is useless: go to a syntax tree with
[`mdast-util-from-markdown`][mdast-util-from-markdown] and
[`mdast-util-mdx-expression`][mdast-util-mdx-expression] instead.

## API

This package exports the identifier [`mdxExpression`][api-mdx-expression].
There is no default export.

The export map supports the [`development` condition][development].
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition, production code is loaded.

### `mdxExpression(options?)`

Create an extension for `micromark` to enable MDX expression syntax.

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Extension for `micromark` that can be passed in `extensions` to enable MDX
expression syntax ([`Extension`][micromark-extension]).

### Options

Configuration (TypeScript type).

###### Fields

* `acorn` ([`Acorn`][acorn], optional)
  — acorn parser to use
* `acornOptions` ([`AcornOptions`][acorn-options], default:
  `{ecmaVersion: 2024, locations: true, sourceType: 'module'}`)
  — configuration for acorn; all fields except `locations` can be set
* `addResult` (`boolean`, default: `false`)
  — whether to add `estree` fields to tokens with results from acorn

<!-- Note: `spread` and `allowEmpty` are intentionally not documented. -->

## Authoring

When authoring markdown with JavaScript, keep in mind that MDX is a whitespace
sensitive and line-based language, while JavaScript is insensitive to
whitespace.
This affects how markdown and JavaScript interleave with eachother in MDX.
For more info on how it works, see [§ Interleaving][mdxjs-interleaving] on the
MDX site.

## Syntax

This extension supports MDX both aware and unaware to JavaScript (respectively
gnostic and agnostic).
Depending on whether acorn is passed, either valid JavaScript must be used in
expressions, or arbitrary text (such as Rust code or so) can be used.

There are two types of expressions: in text (inline, span) or in flow (block).
They start with `{`.

Depending on whether `acorn` is passed, expressions are either parsed in several
tries until whole JavaScript is found (as in, nested curly braces depend on JS
expression nesting), or they are counted and must be balanced.

Expressions end with `}`.

For flow (block) expressions, optionally markdown spaces (` ` or `\t`) can occur
after the closing brace, and finally a markdown line ending (`\r`, `\n`) or the
end of the file must follow.

While markdown typically knows no errors, for MDX it is decided to instead
throw on invalid syntax.

```mdx
Here is an expression in a heading:

## Hello, {1 + 1}!

In agnostic mode, balanced braces can occur: {a + {b} + c}.

In gnostic mode, the value of the expression must be JavaScript, so
this would fail: {!}.
But, in gnostic mode, braces can be in comments, strings, or in other
places: {1 /* { */ + 2}.

The previous examples were text (inline, span) expressions, they can
also be flow (block):

{
  1 + 1
}

This is incorrect, because there are further characters:

{
  1 + 1
}!
```

```mdx-invalid
Blank lines cannot occur in text, because markdown has already split them in
separate constructs, so this is incorrect: {1 +

1}
```

```mdx
In flow, you can have blank lines:

{
  1 +

  2
}
```

## Errors

### Unexpected end of file in expression, expected a corresponding closing brace for `{`

This error occurs if a `{` was seen without a `}` (source:
`micromark-extension-mdx-expression`, rule id: `unexpected-eof`).
For example:

```mdx-invalid
a { b
```

### Unexpected lazy line in expression in container, expected line to be prefixed…

This error occurs if a `{` was seen in a container which then has lazy content
(source: `micromark-extension-mdx-expression`, rule id: `unexpected-lazy`).
For example:

```mdx-invalid
> {a
b}
```

### Unexpected `$type` in code: expected an object spread (`{...spread}`)

This error occurs if a spread was expected but something else was found
(source: `micromark-extension-mdx-expression`, rule id: `non-spread`).
For example:

```mdx-invalid
<a {b=c}={} d>
```

### Unexpected extra content in spread: only a single spread is supported

This error occurs if a spread was expected but more was found after it
(source: `micromark-extension-mdx-expression`, rule id: `spread-extra`).
For example:

```mdx-invalid
<a {...b,c} d>
```

### Could not parse expression with acorn

This error occurs if acorn crashes or when there is more content after a JS
expression (source: `micromark-extension-mdx-expression`, rule id: `acorn`).
For example:

```mdx-invalid
a {"b" "c"} d
```

```mdx-invalid
a {var b = "c"} d
```

## Tokens

Two tokens are used, `mdxFlowExpression` and `mdxTextExpression`, to reflect
flow and text expressions.

They include:

* `lineEnding` for the markdown line endings `\r`, `\n`, and `\r\n`
* `mdxFlowExpressionMarker` and `mdxTextExpressionMarker` for the braces
* `whitespace` for markdown spaces and tabs in blank lines
* `mdxFlowExpressionChunk` and `mdxTextExpressionChunk` for chunks of
  expression content

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`micromark-extension-mdx-expression@^2`, compatible with Node.js 16.

This package works with `micromark` version `3` and later.

## Security

This package is safe.

## Related

* [`micromark-extension-mdxjs`][micromark-extension-mdxjs]
  — support all MDX syntax
* [`mdast-util-mdx-expression`][mdast-util-mdx-expression]
  — support MDX expressions in mdast
* [`remark-mdx`][remark-mdx]
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

[acorn]: https://github.com/acornjs/acorn

[acorn-options]: https://github.com/acornjs/acorn/blob/96c721dbf89d0ccc3a8c7f39e69ef2a6a3c04dfa/acorn/dist/acorn.d.ts#L16

[api-mdx-expression]: #mdxexpressionoptions

[api-options]: #options

[author]: https://wooorm.com

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/micromark/micromark-extension-mdx-expression/actions

[build-badge]: https://github.com/micromark/micromark-extension-mdx-expression/workflows/main/badge.svg

[chat]: https://github.com/micromark/micromark/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[collective]: https://opencollective.com/unified

[contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[coverage]: https://codecov.io/github/micromark/micromark-extension-mdx-expression

[coverage-badge]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-mdx-expression.svg

[development]: https://nodejs.org/api/packages.html#packages_resolving_user_conditions

[downloads]: https://www.npmjs.com/package/micromark-extension-mdx-expression

[downloads-badge]: https://img.shields.io/npm/dm/micromark-extension-mdx-expression.svg

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[license]: https://github.com/micromark/micromark-extension-mdx-expression/blob/main/license

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-mdx-expression]: https://github.com/syntax-tree/mdast-util-mdx-expression

[mdxjs]: https://mdxjs.com

[mdxjs-interleaving]: https://mdxjs.com/docs/what-is-mdx/#interleaving

[micromark]: https://github.com/micromark/micromark

[micromark-extension]: https://github.com/micromark/micromark#syntaxextension

[micromark-extension-mdxjs]: https://github.com/micromark/micromark-extension-mdxjs

[npm]: https://docs.npmjs.com/cli/install

[remark-mdx]: https://mdxjs.com/packages/remark-mdx/

[size]: https://bundlejs.com/?q=micromark-extension-mdx-expression

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=micromark-extension-mdx-expression

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[support]: https://github.com/micromark/.github/blob/main/support.md

[typescript]: https://www.typescriptlang.org
