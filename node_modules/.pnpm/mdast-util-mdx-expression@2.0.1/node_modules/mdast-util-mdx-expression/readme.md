# mdast-util-mdx-expression

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[mdast][] extensions to parse and serialize [MDX][] expressions (`{Math.PI}`).

## Contents

* [What is this?](#what-is-this)
* [When to use this](#when-to-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`mdxExpressionFromMarkdown()`](#mdxexpressionfrommarkdown)
  * [`mdxExpressionToMarkdown()`](#mdxexpressiontomarkdown)
  * [`MdxFlowExpression`](#mdxflowexpression)
  * [`MdxTextExpression`](#mdxtextexpression)
  * [`MdxFlowExpressionHast`](#mdxflowexpressionhast)
  * [`MdxTextExpressionHast`](#mdxtextexpressionhast)
* [HTML](#html)
* [Syntax](#syntax)
* [Syntax tree](#syntax-tree)
  * [Nodes](#nodes)
  * [Content model](#content-model)
* [Types](#types)
* [Compatibility](#compatibility)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package contains two extensions that add support for MDX expression syntax
in markdown to [mdast][].
These extensions plug into
[`mdast-util-from-markdown`][mdast-util-from-markdown] (to support parsing
expressions in markdown into a syntax tree) and
[`mdast-util-to-markdown`][mdast-util-to-markdown] (to support serializing
expressions in syntax trees to markdown).

## When to use this

You can use these extensions when you are working with
`mdast-util-from-markdown` and `mdast-util-to-markdown` already.

When working with `mdast-util-from-markdown`, you must combine this package
with [`micromark-extension-mdx-expression`][extension].

When you are working with syntax trees and want all of MDX, use
[`mdast-util-mdx`][mdast-util-mdx] instead.

All these packages are used in [`remark-mdx`][remark-mdx], which
focusses on making it easier to transform content by abstracting these
internals away.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install mdast-util-mdx-expression
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxExpressionFromMarkdown, mdxExpressionToMarkdown} from 'https://esm.sh/mdast-util-mdx-expression@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxExpressionFromMarkdown, mdxExpressionToMarkdown} from 'https://esm.sh/mdast-util-mdx-expression@2?bundle'
</script>
```

## Use

Say our document `example.mdx` contains:

```mdx
{
  a + 1
}

b {true}.
```

…and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import * as acorn from 'acorn'
import {mdxExpression} from 'micromark-extension-mdx-expression'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {mdxExpressionFromMarkdown, mdxExpressionToMarkdown} from 'mdast-util-mdx-expression'
import {toMarkdown} from 'mdast-util-to-markdown'

const doc = await fs.readFile('example.mdx')

const tree = fromMarkdown(doc, {
  extensions: [mdxExpression({acorn, addResult: true})],
  mdastExtensions: [mdxExpressionFromMarkdown()]
})

console.log(tree)

const out = toMarkdown(tree, {extensions: [mdxExpressionToMarkdown()]})

console.log(out)
```

…now running `node example.js` yields (positional info removed for brevity):

```js
{
  type: 'root',
  children: [
    {
      type: 'mdxFlowExpression',
      value: '\na + 1\n',
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'BinaryExpression',
                left: {type: 'Identifier', name: 'a'},
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
        {type: 'text', value: 'b '},
        {
          type: 'mdxTextExpression',
          value: 'true',
          data: {
            estree: {
              type: 'Program',
              body: [
                {
                  type: 'ExpressionStatement',
                  expression: {type: 'Literal', value: true, raw: 'true'}
                }
              ],
              sourceType: 'module'
            }
          }
        },
        {type: 'text', value: '.'}
      ]
    }
  ]
}
```

```markdown
{
  a + 1
}

b {true}.
```

## API

This package exports the identifiers
[`mdxExpressionFromMarkdown`][api-mdx-expression-from-markdown] and
[`mdxExpressionToMarkdown`][api-mdx-expression-to-markdown].
There is no default export.

### `mdxExpressionFromMarkdown()`

Create an extension for [`mdast-util-from-markdown`][mdast-util-from-markdown]
to enable MDX expressions in markdown.

When using the [micromark syntax extension][extension] with `addResult`, nodes
will have a `data.estree` field set to an ESTree [`Program`][program] node.

###### Returns

Extension for `mdast-util-from-markdown` to enable MDX expressions
([`FromMarkdownExtension`][from-markdown-extension]).

### `mdxExpressionToMarkdown()`

Create an extension for [`mdast-util-to-markdown`][mdast-util-to-markdown]
to enable MDX expressions in markdown.

###### Returns

Extension for `mdast-util-to-markdown` to enable MDX expressions
([`ToMarkdownExtension`][to-markdown-extension]).

### `MdxFlowExpression`

MDX expression node, occurring in flow (block) (TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Data, Literal} from 'mdast'

interface MdxFlowExpression extends Literal {
  type: 'mdxFlowExpression'
  data?: MdxFlowExpressionData | undefined
}

interface MdxFlowExpressionData extends Data {
  estree?: Program | null | undefined
}
```

### `MdxTextExpression`

MDX expression node, occurring in text (block) (TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Data, Literal} from 'mdast'

interface MdxTextExpression extends Literal {
  type: 'mdxTextExpression'
  data?: MdxTextExpressionData | undefined
}

interface MdxTextExpressionData extends Data {
  estree?: Program | null | undefined
}
```

### `MdxFlowExpressionHast`

Same as [`MdxFlowExpression`][api-mdx-flow-expression], but registered with
`@types/hast` (TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Data, Literal} from 'hast'

interface MdxFlowExpressionHast extends Literal {
  type: 'mdxFlowExpression'
  data?: MdxFlowExpressionData | undefined
}

interface MdxFlowExpressionData extends Data {
  estree?: Program | null | undefined
}
```

### `MdxTextExpressionHast`

Same as [`MdxTextExpression`][api-mdx-text-expression], but registered with
`@types/hast` (TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Data, Literal} from 'hast'

interface MdxTextExpressionHast extends Literal {
  type: 'mdxTextExpression'
  data?: MdxTextExpressionData | undefined
}

interface MdxTextExpressionData extends Data {
  estree?: Program | null | undefined
}
```

## HTML

MDX expressions have no representation in HTML.
Though, when you are dealing with MDX, you will likely go *through* hast.
You can enable passing MDX expressions through to hast by configuring
[`mdast-util-to-hast`][mdast-util-to-hast] with
`passThrough: ['mdxFlowExpression', 'mdxTextExpression']`.

## Syntax

See [Syntax in `micromark-extension-mdx-expression`][syntax].

## Syntax tree

The following interfaces are added to **[mdast][]** by this utility.

### Nodes

#### `MdxFlowExpression`

```idl
interface MdxFlowExpression <: Literal {
  type: 'mdxFlowExpression'
}
```

**MdxFlowExpression** (**[Literal][dfn-literal]**) represents a JavaScript
expression embedded in flow (block).
It can be used where **[flow][dfn-flow-content]** content is expected.
Its content is represented by its `value` field.

For example, the following markdown:

```markdown
{
  1 + 1
}
```

Yields:

```js
{type: 'mdxFlowExpression', value: '\n1 + 1\n'}
```

#### `MdxTextExpression`

```idl
interface MdxTextExpression <: Literal {
  type: 'mdxTextExpression"
}
```

**MdxTextExpression** (**[Literal][dfn-literal]**) represents a JavaScript
expression embedded in text (span, inline).
It can be used where **[phrasing][dfn-phrasing-content]** content is expected.
Its content is represented by its `value` field.

For example, the following markdown:

```markdown
a {1 + 1} b.
```

Yields:

```js
{type: 'mdxTextExpression', value: '1 + 1'}
```

### Content model

#### `FlowContent` (MDX expression)

```idl
type FlowContentMdxExpression = MdxFlowExpression | FlowContent
```

#### `PhrasingContent` (MDX expression)

```idl
type PhrasingContentMdxExpression = MdxTextExpression | PhrasingContent
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`MdxFlowExpression`][api-mdx-flow-expression],
[`MdxFlowExpressionHast`][api-mdx-flow-expression-hast],
[`MdxTextExpression`][api-mdx-text-expression], and
[`MdxTextExpressionHast`][api-mdx-text-expression-hast].

It also registers the node types with `@types/mdast` and `@types/hast`.
If you’re working with the syntax tree, make sure to import this utility
somewhere in your types, as that registers the new node types in the tree.

```js
/**
 * @import {} from 'mdast-util-mdx-expression'
 * @import {Root} from 'mdast'
 */

import {visit} from 'unist-util-visit'

/** @type {Root} */
const tree = getMdastNodeSomeHow()

visit(tree, function (node) {
  // `node` can now be an expression node.
})
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`mdast-util-mdx-expression@^2`, compatible with Node.js 16.

This utility works with `mdast-util-from-markdown` version 2+ and
`mdast-util-to-markdown` version 2+.

## Related

* [`remarkjs/remark-mdx`][remark-mdx]
  — remark plugin to support MDX
* [`syntax-tree/mdast-util-mdx`][mdast-util-mdx]
  — mdast utility to support MDX
* [`micromark/micromark-extension-mdx-expression`][extension]
  — micromark extension to parse MDX expressions

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

[build-badge]: https://github.com/syntax-tree/mdast-util-mdx-expression/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/mdast-util-mdx-expression/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/mdast-util-mdx-expression.svg

[coverage]: https://codecov.io/github/syntax-tree/mdast-util-mdx-expression

[downloads-badge]: https://img.shields.io/npm/dm/mdast-util-mdx-expression.svg

[downloads]: https://www.npmjs.com/package/mdast-util-mdx-expression

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=mdast-util-mdx-expression

[size]: https://bundlejs.com/?q=mdast-util-mdx-expression

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

[extension]: https://github.com/micromark/micromark-extension-mdx-expression

[syntax]: https://github.com/micromark/micromark-extension-mdx-expression#syntax

[program]: https://github.com/estree/estree/blob/master/es2015.md#programs

[dfn-literal]: https://github.com/syntax-tree/mdast#literal

[remark-mdx]: https://mdxjs.com/packages/remark-mdx/

[mdx]: https://mdxjs.com

[from-markdown-extension]: https://github.com/syntax-tree/mdast-util-from-markdown#extension

[to-markdown-extension]: https://github.com/syntax-tree/mdast-util-to-markdown#options

[api-mdx-expression-from-markdown]: #mdxexpressionfrommarkdown

[api-mdx-expression-to-markdown]: #mdxexpressiontomarkdown

[api-mdx-flow-expression]: #mdxflowexpression

[api-mdx-text-expression]: #mdxtextexpression

[api-mdx-flow-expression-hast]: #mdxflowexpressionhast

[api-mdx-text-expression-hast]: #mdxtextexpressionhast

[dfn-flow-content]: #flowcontent-mdx-expression

[dfn-phrasing-content]: #phrasingcontent-mdx-expression
