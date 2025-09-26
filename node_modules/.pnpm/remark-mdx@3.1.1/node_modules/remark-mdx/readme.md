# remark-mdx

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

remark plugin to support the MDX syntax (JSX, export/import, expressions).

<!-- more -->

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(remarkMdx[, options])`](#unifieduseremarkmdx-options)
  * [`Options`](#options)
* [Authoring](#authoring)
* [HTML](#html)
* [Syntax](#syntax)
* [Syntax tree](#syntax-tree)
* [Errors](#errors)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][] ([remark][]) plugin to enable the extensions to
markdown that MDX adds: JSX (`<x/>`), export/import (`export x from 'y'`), and
expression {`{1 + 1}`}.
You can use this plugin to add support for parsing and serializing them.

This plugin does not handle how MDX is compiled to JavaScript or evaluated and
rendered to HTML.
That’s done by [`@mdx-js/mdx`][mdx].

## When should I use this?

This plugin is useful if you’re dealing with the MDX syntax and integrating
with remark, rehype, and the rest of unified.
Some example use cases are when you want to lint the syntax or compile it to
something other that JavaScript.

If you don’t use plugins and want to access the syntax tree, you can use
[`mdast-util-from-markdown`][mdast-util-from-markdown] with
[`mdast-util-mdx`][mdast-util-mdx].

Typically though, you’d want to move a layer up: `@mdx-js/mdx`.
That package is the core compiler for turning MDX into JavaScript which
gives you the most control.
Or even higher: if you’re using a bundler (Rollup, esbuild, webpack), or a site
builder (Next.js) or build system (Vite) which comes with a bundler, you’re
better off using an integration: see [§ Integrations][integrations].

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install remark-mdx
```

In Deno with [`esm.sh`][esmsh]:

```tsx
import remarkMdx from 'https://esm.sh/remark-mdx@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import remarkMdx from 'https://esm.sh/remark-mdx@3?bundle'
</script>
```

## Use

```tsx
import {remark} from 'remark'
import remarkMdx from 'remark-mdx'

const file = await remark()
  .use(remarkMdx)
  .process('import a from "b"\n\na <b /> c {1 + 1} d')

console.log(String(file))
```

Yields:

```mdx
import a from "b"

a <b/> c {1 + 1} d
```

## API

This package exports no identifiers.
The default export is [`remarkMdx`][api-remark-mdx].

### `unified().use(remarkMdx[, options])`

Add support for MDX (JSX: `<Video id={123} />`, export/imports: `export {x}
from 'y'`; and expressions: `{1 + 1}`).

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Nothing (`undefined`).

### `Options`

Configuration (TypeScript type).

###### Fields

* `acornOptions` ([`AcornOptions`][acorn-options], default:
  `{ecmaVersion: 2024, locations: true, sourceType: 'module'}`)
  — configuration for acorn; all fields except `locations` can be set
* `printWidth` (`number`, default: `Infinity`)
  — try and wrap syntax at this width;
  when set to a finite number (say, `80`), the formatter will print
  attributes on separate lines when a tag doesn’t fit on one line;
  the normal behavior is to print attributes with spaces between them instead
  of line endings
* `quote` (`'"'` or `"'"`, default: `'"'`)
  — preferred quote to use around attribute values
* `quoteSmart` (`boolean`, default: `false`)
  — use the other quote if that results in less bytes
* `tightSelfClosing` (`boolean`, default: `false`)
  — do not use an extra space when closing self-closing elements: `<img/>`
  instead of `<img />`

<!-- Note: `acorn`, `addResult`, `allowEmpty`, and `spread` are intentionally not documented. -->

## Authoring

For recommendations on how to author MDX, see each corresponding readme:

* [ESM](https://github.com/micromark/micromark-extension-mdxjs-esm#authoring)
* [JSX](https://github.com/micromark/micromark-extension-mdx-jsx#authoring)
* [expressions](https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-extension-mdx-expression#authoring)
* [CommonMark features not in MDX](https://github.com/micromark/micromark-extension-mdx-md#authoring)

## HTML

MDX has no representation in HTML.
Though, when you are dealing with MDX, you will likely go *through* hast.
You can enable passing MDX through to hast by configuring
[`remark-rehype`][remark-rehype] with `passThrough: ['mdxjsEsm',
'mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression']`.

## Syntax

For info on the syntax of these features, see each corresponding readme:

* [ESM](https://github.com/micromark/micromark-extension-mdxjs-esm#syntax)
* [JSX](https://github.com/micromark/micromark-extension-mdx-jsx#syntax)
* [expressions](https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-extension-mdx-expression#syntax)
* CommonMark features not in MDX: n/a

## Syntax tree

For info on the syntax tree of these features, see each corresponding readme:

* [ESM](https://github.com/syntax-tree/mdast-util-mdxjs-esm#syntax-tree)
* [JSX](https://github.com/syntax-tree/mdast-util-mdx-jsx#syntax-tree)
* [expressions](https://github.com/syntax-tree/mdast-util-mdx-expression#syntax-tree)
* CommonMark features not in MDX: n/a

## Errors

For info on what errors are thrown, see each corresponding readme:

* [ESM](https://github.com/micromark/micromark-extension-mdxjs-esm#errors)
* [JSX](https://github.com/micromark/micromark-extension-mdx-jsx#errors)
* [expressions](https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-extension-mdx-expression#errors)
* CommonMark features not in MDX: n/a

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

If you’re working with the syntax tree, you can register the new node types
with `@types/mdast` by adding a reference:

```tsx
// Register MDX nodes in mdast:
/// <reference types="remark-mdx" />

/**
 * @import {Root} from 'mdast'
 */

import {visit} from 'unist-util-visit'

function myRemarkPlugin() {
  /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree) {
    visit(tree, function (node) {
      console.log(node) // `node` can now be one of the MDX nodes.
    })
  }
}
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `remark-mdx@^3`, compatible
with Node.js 16.

## Security

See [§ Security][security] on our website for information.

## Contribute

See [§ Contribute][contribute] on our website for ways to get started.
See [§ Support][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][] © [Titus Wormer][author]

[acorn-options]: https://github.com/acornjs/acorn/blob/520547b/acorn/src/acorn.d.ts#L578

[api-options]: #options

[api-remark-mdx]: #unifieduseremarkmdx-options

[author]: https://wooorm.com

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/mdx-js/mdx/actions

[build-badge]: https://github.com/mdx-js/mdx/workflows/main/badge.svg

[chat]: https://github.com/mdx-js/mdx/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[coc]: https://github.com/mdx-js/.github/blob/main/code-of-conduct.md

[collective]: https://opencollective.com/unified

[contribute]: https://mdxjs.com/community/contribute/

[coverage]: https://codecov.io/github/mdx-js/mdx

[coverage-badge]: https://img.shields.io/codecov/c/github/mdx-js/mdx/main.svg

[downloads]: https://www.npmjs.com/package/remark-mdx

[downloads-badge]: https://img.shields.io/npm/dm/remark-mdx.svg

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[integrations]: https://mdxjs.com/getting-started/#integrations

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-mdx]: https://github.com/syntax-tree/mdast-util-mdx

[mdx]: https://mdxjs.com/packages/mdx/

[mit]: https://github.com/mdx-js/mdx/blob/main/packages/remark-mdx/license

[npm]: https://docs.npmjs.com/cli/install

[remark]: https://github.com/remarkjs/remark

[remark-rehype]: https://github.com/remarkjs/remark-rehype

[security]: https://mdxjs.com/getting-started/#security

[size]: https://bundlephobia.com/result?p=remark-mdx

[size-badge]: https://img.shields.io/bundlephobia/minzip/remark-mdx.svg

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[support]: https://mdxjs.com/community/support/

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified
