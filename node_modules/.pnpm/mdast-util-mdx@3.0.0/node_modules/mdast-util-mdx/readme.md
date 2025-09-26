# mdast-util-mdx

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[mdast][] extensions to parse and serialize [MDX][]: ESM, JSX, and expressions.

## Contents

*   [What is this?](#what-is-this)
*   [When to use this](#when-to-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`mdxFromMarkdown()`](#mdxfrommarkdown)
    *   [`mdxToMarkdown(options?)`](#mdxtomarkdownoptions)
    *   [`ToMarkdownOptions`](#tomarkdownoptions)
*   [HTML](#html)
*   [Syntax](#syntax)
*   [Syntax tree](#syntax-tree)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package contains two extensions that add support for MDX syntax in
markdown to [mdast][]: ESM (`import x from 'y'`), JSX (`<a />`), and
expressions (`{Math.PI}`).
These extensions plug into
[`mdast-util-from-markdown`][mdast-util-from-markdown] (to support parsing
MDX in markdown into a syntax tree) and
[`mdast-util-to-markdown`][mdast-util-to-markdown] (to support serializing
MDX in syntax trees to markdown).

## When to use this

You can use these extensions when you are working with
`mdast-util-from-markdown` and `mdast-util-to-markdown` already.

When working with `mdast-util-from-markdown`, you must combine this package
with [`micromark-extension-mdx`][mdx] or [`micromark-extension-mdxjs`][mdxjs].

Instead of this package, you can also use the extensions separately:

*   [`mdast-util-mdx-expression`](https://github.com/syntax-tree/mdast-util-mdx-expression)
    — support MDX expressions
*   [`mdast-util-mdx-jsx`](https://github.com/syntax-tree/mdast-util-mdx-jsx)
    — support MDX JSX
*   [`mdast-util-mdxjs-esm`](https://github.com/syntax-tree/mdast-util-mdxjs-esm)
    — support MDX ESM

All these packages are used in [`remark-mdx`][remark-mdx], which
focusses on making it easier to transform content by abstracting these
internals away.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install mdast-util-mdx
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxFromMarkdown, mdxToMarkdown} from 'https://esm.sh/mdast-util-mdx@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxFromMarkdown, mdxToMarkdown} from 'https://esm.sh/mdast-util-mdx@3?bundle'
</script>
```

## Use

Say our document `example.mdx` contains:

```mdx
import Box from "place"

Here’s an expression:

{
  1 + 1 /* } */
}

Which you can also put inline: {1+1}.

<Box>
  <SmallerBox>
    - Lists, which can be indented.
  </SmallerBox>
</Box>
```

…and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import {mdxjs} from 'micromark-extension-mdxjs'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {mdxFromMarkdown, mdxToMarkdown} from 'mdast-util-mdx'
import {toMarkdown} from 'mdast-util-to-markdown'

const doc = await fs.readFile('example.mdx')

const tree = fromMarkdown(doc, {
  extensions: [mdxjs()],
  mdastExtensions: [mdxFromMarkdown()]
})

console.log(tree)

const out = toMarkdown(tree, {extensions: [mdxToMarkdown()]})

console.log(out)
```

…now running `node example.js` yields (positional info removed for brevity):

```js
{
  type: 'root',
  children: [
    {
      type: 'mdxjsEsm',
      value: 'import Box from "place"',
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ImportDeclaration',
              specifiers: [
                {
                  type: 'ImportDefaultSpecifier',
                  local: {type: 'Identifier', name: 'Box'}
                }
              ],
              source: {type: 'Literal', value: 'place', raw: '"place"'}
            }
          ],
          sourceType: 'module'
        }
      }
    },
    {
      type: 'paragraph',
      children: [{type: 'text', value: 'Here’s an expression:'}]
    },
    {
      type: 'mdxFlowExpression',
      value: '\n1 + 1 /* } */\n',
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'BinaryExpression',
                left: {type: 'Literal', value: 1, raw: '1'},
                operator: '+',
                right: {type: 'Literal', value: 1, raw: '1'}
              }
            }
          ],
          sourceType: 'module'
        }
      }
    },
    {
      type: 'paragraph',
      children: [
        {type: 'text', value: 'Which you can also put inline: '},
        {
          type: 'mdxTextExpression',
          value: '1+1',
          data: {
            estree: {
              type: 'Program',
              body: [
                {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'BinaryExpression',
                    left: {type: 'Literal', value: 1, raw: '1'},
                    operator: '+',
                    right: {type: 'Literal', value: 1, raw: '1'}
                  }
                }
              ],
              sourceType: 'module'
            }
          }
        },
        {type: 'text', value: '.'}
      ]
    },
    {
      type: 'mdxJsxFlowElement',
      name: 'Box',
      attributes: [],
      children: [
        {
          type: 'mdxJsxFlowElement',
          name: 'SmallerBox',
          attributes: [],
          children: [
            {
              type: 'list',
              ordered: false,
              start: null,
              spread: false,
              children: [
                {
                  type: 'listItem',
                  spread: false,
                  checked: null,
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {type: 'text', value: 'Lists, which can be indented.'}
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

```mdx
import Box from "place"

Here’s an expression:

{
  1 + 1 /* } */
}

Which you can also put inline: {1+1}.

<Box>
  <SmallerBox>
    *   Lists, which can be indented.
  </SmallerBox>
</Box>
```

## API

This package exports the identifiers [`mdxFromMarkdown`][api-mdx-from-markdown]
and [`mdxToMarkdown`][api-mdx-to-markdown].
There is no default export.

### `mdxFromMarkdown()`

Create an extension for [`mdast-util-from-markdown`][mdast-util-from-markdown]
to enable MDX (ESM, JSX, expressions).

###### Returns

Extension for `mdast-util-from-markdown` to enable MDX
([`FromMarkdownExtension`][from-markdown-extension]).

When using the [syntax extensions with `addResult`][mdxjs], ESM and expression
nodes will have `data.estree` fields set to ESTree [`Program`][program] node.

### `mdxToMarkdown(options?)`

Create an extension for [`mdast-util-to-markdown`][mdast-util-to-markdown]
to enable MDX (ESM, JSX, expressions).

Extension for [`mdast-util-to-markdown`][mdast-util-to-markdown].

###### Parameters

*   `options` ([`ToMarkdownOptions`][api-to-markdown-options])
    — configuration

###### Returns

Extension for `mdast-util-to-markdown` to enable MDX
([`FromMarkdownExtension`][to-markdown-extension]).

### `ToMarkdownOptions`

Configuration (TypeScript type).

###### Fields

*   `quote` (`'"'` or `"'"`, default: `'"'`)
    — preferred quote to use around attribute values
*   `quoteSmart` (`boolean`, default: `false`)
    — use the other quote if that results in less bytes
*   `tightSelfClosing` (`boolean`, default: `false`)
    — do not use an extra space when closing self-closing elements: `<img/>`
    instead of `<img />`
*   `printWidth` (`number`, default: `Infinity`)
    — try and wrap syntax at this width.
    When set to a finite number (say, `80`), the formatter will print
    attributes on separate lines when a tag doesn’t fit on one line.
    The normal behavior is to print attributes with spaces between them instead
    of line endings

## HTML

MDX has no representation in HTML.
Though, when you are dealing with MDX, you will likely go *through* hast.
You can enable passing MDX through to hast by configuring
[`mdast-util-to-hast`][mdast-util-to-hast] with `passThrough: ['mdxjsEsm',
'mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression']`.

## Syntax

See [Syntax in `micromark-extension-mdxjs`][mdxjs].

## Syntax tree

This utility combines several mdast utilities.
See their readmes for the node types supported in the tree:

*   [`mdast-util-mdx-expression`](https://github.com/syntax-tree/mdast-util-mdx-expression#syntax-tree)
    — support MDX expressions
*   [`mdast-util-mdx-jsx`](https://github.com/syntax-tree/mdast-util-mdx-jsx#syntax-tree)
    — support MDX JSX
*   [`mdast-util-mdxjs-esm`](https://github.com/syntax-tree/mdast-util-mdxjs-esm#syntax-tree)
    — support MDX ESM

## Types

This package is fully typed with [TypeScript][].
It exports the additional types
`MdxFlowExpression` and `MdxTextExpression`
from `mdast-util-mdx-expression`;
`MdxJsxAttribute`,
`MdxJsxAttributeValueExpression`,
`MdxJsxExpressionAttribute`,
`MdxJsxFlowElement`,
`MdxJsxTextElement`,
and [`ToMarkdownOptions`][api-to-markdown-options]
from `mdast-util-mdx-jsx`;
and `MdxjsEsm` from `mdast-util-mdxjs-esm`.

It also registers the node types with `@types/mdast` and `@types/hast`.
If you’re working with the syntax tree, make sure to import this utility
somewhere in your types, as that registers the new node types in the tree.

```js
/**
 * @typedef {import('mdast-util-mdx')}
 */

import {visit} from 'unist-util-visit'

/** @type {import('mdast').Root} */
const tree = getMdastNodeSomeHow()

visit(tree, function (node) {
  // `node` can now be an expression, JSX, or ESM node.
})
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `mdast-util-mdx@^3`,
compatible with Node.js 16.

This utility works with `mdast-util-from-markdown` version 2+ and
`mdast-util-to-markdown` version 2+.

## Related

*   [`remark-mdx`][remark-mdx]
    — remark plugin to support MDX
*   [`micromark-extension-mdx`][mdx]
    — micromark extension to parse MDX
*   [`micromark-extension-mdxjs`][mdxjs]
    — micromark extension to parse JavaScript-aware MDX

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

[build-badge]: https://github.com/syntax-tree/mdast-util-mdx/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/mdast-util-mdx/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/mdast-util-mdx.svg

[coverage]: https://codecov.io/github/syntax-tree/mdast-util-mdx

[downloads-badge]: https://img.shields.io/npm/dm/mdast-util-mdx.svg

[downloads]: https://www.npmjs.com/package/mdast-util-mdx

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=mdast-util-mdx

[size]: https://bundlejs.com/?q=mdast-util-mdx

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

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[from-markdown-extension]: https://github.com/syntax-tree/mdast-util-from-markdown#extension

[mdast-util-to-markdown]: https://github.com/syntax-tree/mdast-util-to-markdown

[to-markdown-extension]: https://github.com/syntax-tree/mdast-util-to-markdown#options

[mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[mdx]: https://github.com/micromark/micromark-extension-mdx

[mdxjs]: https://github.com/micromark/micromark-extension-mdxjs

[remark-mdx]: https://github.com/mdx-js/mdx/tree/next/packages/remark-mdx

[program]: https://github.com/estree/estree/blob/master/es2015.md#programs

[api-mdx-from-markdown]: #mdxfrommarkdown

[api-mdx-to-markdown]: #mdxtomarkdownoptions

[api-to-markdown-options]: #tomarkdownoptions
