# mdast-util-mdxjs-esm

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[mdast][] extensions to parse and serialize [MDX][] ESM (import/exports).

## Contents

*   [What is this?](#what-is-this)
*   [When to use this](#when-to-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`mdxjsEsmFromMarkdown()`](#mdxjsesmfrommarkdown)
    *   [`mdxjsEsmToMarkdown()`](#mdxjsesmtomarkdown)
    *   [`MdxjsEsm`](#mdxjsesm)
    *   [`MdxjsEsmHast`](#mdxjsesmhast)
*   [HTML](#html)
*   [Syntax](#syntax)
*   [Syntax tree](#syntax-tree)
    *   [Nodes](#nodes)
    *   [Content model](#content-model)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package contains two extensions that add support for MDX ESM syntax in
markdown to [mdast][].
These extensions plug into
[`mdast-util-from-markdown`][mdast-util-from-markdown] (to support parsing
ESM in markdown into a syntax tree) and
[`mdast-util-to-markdown`][mdast-util-to-markdown] (to support serializing
ESM in syntax trees to markdown).

## When to use this

You can use these extensions when you are working with
`mdast-util-from-markdown` and `mdast-util-to-markdown` already.

When working with `mdast-util-from-markdown`, you must combine this package
with [`micromark-extension-mdxjs-esm`][extension].

When you are working with syntax trees and want all of MDX, use
[`mdast-util-mdx`][mdast-util-mdx] instead.

All these packages are used in [`remark-mdx`][remark-mdx], which
focusses on making it easier to transform content by abstracting these
internals away.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install mdast-util-mdxjs-esm
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxjsEsmFromMarkdown, mdxjsEsmToMarkdown} from 'https://esm.sh/mdast-util-mdxjs-esm@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxjsEsmFromMarkdown, mdxjsEsmToMarkdown} from 'https://esm.sh/mdast-util-mdxjs-esm@2?bundle'
</script>
```

## Use

Say our document `example.mdx` contains:

```mdx
import a from 'b'
export const c = ''

d
```

…and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import * as acorn from 'acorn'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {toMarkdown} from 'mdast-util-to-markdown'
import {mdxjsEsm} from 'micromark-extension-mdxjs-esm'
import {mdxjsEsmFromMarkdown, mdxjsEsmToMarkdown} from 'mdast-util-mdxjs-esm'

const doc = await fs.readFile('example.mdx')

const tree = fromMarkdown(doc, {
  extensions: [mdxjsEsm({acorn, addResult: true})],
  mdastExtensions: [mdxjsEsmFromMarkdown()]
})

console.log(tree)

const out = toMarkdown(tree, {extensions: [mdxjsEsmToMarkdown()]})

console.log(out)
```

…now running `node example.js` yields (positional info removed for brevity):

```js
{
  type: 'root',
  children: [
    {
      type: 'mdxjsEsm',
      value: "import a from 'b'\nexport const c = ''",
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ImportDeclaration',
              specifiers: [
                {
                  type: 'ImportDefaultSpecifier',
                  local: {type: 'Identifier', name: 'a'}
                }
              ],
              source: {type: 'Literal', value: 'b', raw: "'b'"}
            },
            {
              type: 'ExportNamedDeclaration',
              declaration: {
                type: 'VariableDeclaration',
                declarations: [
                  {
                    type: 'VariableDeclarator',
                    id: {type: 'Identifier', name: 'c'},
                    init: {type: 'Literal', value: '', raw: "''"}
                  }
                ],
                kind: 'const'
              },
              specifiers: [],
              source: null
            }
          ],
          sourceType: 'module'
        }
      }
    },
    {type: 'paragraph', children: [{type: 'text', value: 'd'}]}
  ]
}
```

```markdown
import a from 'b'
export const c = ''

d
```

## API

This package exports the identifiers
[`mdxjsEsmFromMarkdown`][api-mdxjs-esm-from-markdown] and
[`mdxjsEsmToMarkdown`][api-mdxjs-esm-to-markdown].
There is no default export.

### `mdxjsEsmFromMarkdown()`

Create an extension for [`mdast-util-from-markdown`][mdast-util-from-markdown]
to enable MDX.js ESM in markdown.

When using the [micromark syntax extension][extension] with `addResult`, nodes
will have a `data.estree` field set to an ESTree [`Program`][program] node.

###### Returns

Extension for `mdast-util-from-markdown` to enable MDX.js ESM
([`FromMarkdownExtension`][from-markdown-extension]).

### `mdxjsEsmToMarkdown()`

Create an extension for [`mdast-util-to-markdown`][mdast-util-to-markdown]
to enable MDX.js ESM in markdown.

###### Returns

Extension for `mdast-util-to-markdown` to enable MDX.js ESM
([`ToMarkdownExtension`][to-markdown-extension]).

### `MdxjsEsm`

MDX ESM (import/export) node (TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Data, Literal} from 'mdast'

interface MdxjsEsm extends Literal {
  type: 'mdxjsEsm'
  data?: MdxjsEsmData | undefined
}

export interface MdxjsEsmData extends Data {
  estree?: Program | null | undefined
}
```

### `MdxjsEsmHast`

Same as [`MdxjsEsm`][api-mdxjs-esm], but registered with `@types/hast`
(TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Data, Literal} from 'hast'

interface MdxjsEsmHast extends Literal {
  type: 'mdxjsEsm'
  data?: MdxjsEsmHastData | undefined
}

export interface MdxjsEsmHastData extends Data {
  estree?: Program | null | undefined
}
```

## HTML

MDX ESM has no representation in HTML.
Though, when you are dealing with MDX, you will likely go *through* hast.
You can enable passing MDX ESM through to hast by configuring
[`mdast-util-to-hast`][mdast-util-to-hast] with `passThrough: ['mdxjsEsm']`.

## Syntax

See [Syntax in `micromark-extension-mdxjs-esm`][syntax].

## Syntax tree

The following interfaces are added to **[mdast][]** by this utility.

### Nodes

#### `MdxjsEsm`

```idl
interface MdxjsEsm <: Literal {
  type: 'mdxjsEsm'
}
```

**MdxjsEsm** (**[Literal][dfn-literal]**) represents ESM import/exports
embedded in MDX.
It can be used where **[flow][dfn-flow-content]** content is expected.
Its content is represented by its `value` field.

For example, the following Markdown:

```markdown
import a from 'b'
```

Yields:

```js
{
  type: 'mdxjsEsm',
  value: 'import a from \'b\''
}
```

### Content model

#### `FlowContent` (MDX.js ESM)

```idl
type FlowContentMdxjsEsm = MdxjsEsm | FlowContent
```

Note that when ESM is present, it can only exist as top-level content: if it has
a *[parent][dfn-parent]*, that parent must be **[Root][dfn-root]**.

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`MdxjsEsm`][api-mdxjs-esm] and
[`MdxjsEsmHast`][api-mdxjs-esm-hast].

It also registers the node type with `@types/mdast` and `@types/hast`.
If you’re working with the syntax tree, make sure to import this utility
somewhere in your types, as that registers the new node types in the tree.

```js
/**
 * @typedef {import('mdast-util-mdxjs-esm')}
 */

import {visit} from 'unist-util-visit'

/** @type {import('mdast').Root} */
const tree = getMdastNodeSomeHow()

visit(tree, function (node) {
  // `node` can now be an ESM node.
})
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `mdast-util-mdxjs-esm@^2`,
compatible with Node.js 16.

This utility works with `mdast-util-from-markdown` version 2+ and
`mdast-util-to-markdown` version 2+.

## Related

*   [`remarkjs/remark-mdx`][remark-mdx]
    — remark plugin to support MDX
*   [`syntax-tree/mdast-util-mdx`][mdast-util-mdx]
    — mdast utility to support MDX
*   [`micromark/micromark-extension-mdxjs-esm`][extension]
    — micromark extension to parse MDX.js ESM

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

[build-badge]: https://github.com/syntax-tree/mdast-util-mdxjs-esm/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/mdast-util-mdxjs-esm/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/mdast-util-mdxjs-esm.svg

[coverage]: https://codecov.io/github/syntax-tree/mdast-util-mdxjs-esm

[downloads-badge]: https://img.shields.io/npm/dm/mdast-util-mdxjs-esm.svg

[downloads]: https://www.npmjs.com/package/mdast-util-mdxjs-esm

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=mdast-util-mdxjs-esm

[size]: https://bundlejs.com/?q=mdast-util-mdxjs-esm

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

[mdast]: https://github.com/syntax-tree/mdast

[mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-to-markdown]: https://github.com/syntax-tree/mdast-util-to-markdown

[mdast-util-mdx]: https://github.com/syntax-tree/mdast-util-mdx

[extension]: https://github.com/micromark/micromark-extension-mdxjs-esm

[syntax]: https://github.com/micromark/micromark-extension-mdxjs-esm#syntax

[program]: https://github.com/estree/estree/blob/master/es2015.md#programs

[dfn-literal]: https://github.com/syntax-tree/mdast#literal

[dfn-parent]: https://github.com/syntax-tree/unist#parent-1

[dfn-root]: https://github.com/syntax-tree/mdast#root

[remark-mdx]: https://mdxjs.com/packages/remark-mdx/

[mdx]: https://mdxjs.com

[from-markdown-extension]: https://github.com/syntax-tree/mdast-util-from-markdown#extension

[to-markdown-extension]: https://github.com/syntax-tree/mdast-util-to-markdown#options

[dfn-flow-content]: #flowcontent-mdxjs-esm

[api-mdxjs-esm-from-markdown]: #mdxjsesmfrommarkdown

[api-mdxjs-esm-to-markdown]: #mdxjsesmtomarkdown

[api-mdxjs-esm]: #mdxjsesm

[api-mdxjs-esm-hast]: #mdxjsesmhast
