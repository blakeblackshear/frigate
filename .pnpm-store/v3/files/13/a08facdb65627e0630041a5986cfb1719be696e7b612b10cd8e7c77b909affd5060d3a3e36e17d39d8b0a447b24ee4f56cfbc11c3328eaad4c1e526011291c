# mdast-util-mdx-jsx

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[mdast][] extensions to parse and serialize [MDX][] JSX (`<a />`).

## Contents

* [What is this?](#what-is-this)
* [When to use this](#when-to-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`mdxJsxFromMarkdown()`](#mdxjsxfrommarkdown)
  * [`mdxJsxToMarkdown(options?)`](#mdxjsxtomarkdownoptions)
  * [`MdxJsxAttribute`](#mdxjsxattribute)
  * [`MdxJsxAttributeValueExpression`](#mdxjsxattributevalueexpression)
  * [`MdxJsxExpressionAttribute`](#mdxjsxexpressionattribute)
  * [`MdxJsxFlowElement`](#mdxjsxflowelement)
  * [`MdxJsxFlowElementHast`](#mdxjsxflowelementhast)
  * [`MdxJsxTextElement`](#mdxjsxtextelement)
  * [`MdxJsxTextElementHast`](#mdxjsxtextelementhast)
  * [`ToMarkdownOptions`](#tomarkdownoptions)
* [HTML](#html)
* [Syntax](#syntax)
* [Syntax tree](#syntax-tree)
  * [Nodes](#nodes)
  * [Mixin](#mixin)
  * [Content model](#content-model)
* [Types](#types)
* [Compatibility](#compatibility)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package contains two extensions that add support for MDX JSX syntax in
markdown to [mdast][].
These extensions plug into
[`mdast-util-from-markdown`][mdast-util-from-markdown] (to support parsing
JSX in markdown into a syntax tree) and
[`mdast-util-to-markdown`][mdast-util-to-markdown] (to support serializing
JSX in syntax trees to markdown).

[JSX][] is an XML-like syntax extension to ECMAScript (JavaScript), which MDX
brings to markdown.
For more info on MDX, see [What is MDX?][what-is-mdx]

## When to use this

You can use these extensions when you are working with
`mdast-util-from-markdown` and `mdast-util-to-markdown` already.

When working with `mdast-util-from-markdown`, you must combine this package
with [`micromark-extension-mdx-jsx`][micromark-extension-mdx-jsx].

When you are working with syntax trees and want all of MDX, use
[`mdast-util-mdx`][mdast-util-mdx] instead.

All these packages are used in [`remark-mdx`][remark-mdx], which
focusses on making it easier to transform content by abstracting these
internals away.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install mdast-util-mdx-jsx
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxJsxFromMarkdown, mdxJsxToMarkdown} from 'https://esm.sh/mdast-util-mdx-jsx@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxJsxFromMarkdown, mdxJsxToMarkdown} from 'https://esm.sh/mdast-util-mdx-jsx@3?bundle'
</script>
```

## Use

Say our document `example.mdx` contains:

```mdx
<Box>
  - a list
</Box>

<MyComponent {...props} />

<abbr title="Hypertext Markup Language">HTML</abbr> is a lovely language.
```

…and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import * as acorn from 'acorn'
import {mdxJsx} from 'micromark-extension-mdx-jsx'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {mdxJsxFromMarkdown, mdxJsxToMarkdown} from 'mdast-util-mdx-jsx'
import {toMarkdown} from 'mdast-util-to-markdown'

const doc = await fs.readFile('example.mdx')

const tree = fromMarkdown(doc, {
  extensions: [mdxJsx({acorn, addResult: true})],
  mdastExtensions: [mdxJsxFromMarkdown()]
})

console.log(tree)

const out = toMarkdown(tree, {extensions: [mdxJsxToMarkdown()]})

console.log(out)
```

…now running `node example.js` yields (positional info removed for brevity):

```js
{
  type: 'root',
  children: [
    {
      type: 'mdxJsxFlowElement',
      name: 'Box',
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
                {type: 'paragraph', children: [{type: 'text', value: 'a list'}]}
              ]
            }
          ]
        }
      ]
    },
    {
      type: 'mdxJsxFlowElement',
      name: 'MyComponent',
      attributes: [
        {
          type: 'mdxJsxExpressionAttribute',
          value: '...props',
          data: {
            estree: {
              type: 'Program',
              body: [
                {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'ObjectExpression',
                    properties: [
                      {
                        type: 'SpreadElement',
                        argument: {type: 'Identifier', name: 'props'}
                      }
                    ]
                  }
                }
              ],
              sourceType: 'module'
            }
          }
        }
      ],
      children: []
    },
    {
      type: 'paragraph',
      children: [
        {
          type: 'mdxJsxTextElement',
          name: 'abbr',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'title',
              value: 'Hypertext Markup Language'
            }
          ],
          children: [{type: 'text', value: 'HTML'}]
        },
        {type: 'text', value: ' is a lovely language.'}
      ]
    }
  ]
}
```

```markdown
<Box>
  *   a list
</Box>

<MyComponent {...props} />

<abbr title="Hypertext Markup Language">HTML</abbr> is a lovely language.
```

## API

This package exports the identifiers
[`mdxJsxFromMarkdown`][api-mdx-jsx-from-markdown] and
[`mdxJsxToMarkdown`][api-mdx-jsx-to-markdown].
There is no default export.

### `mdxJsxFromMarkdown()`

Create an extension for
[`mdast-util-from-markdown`][mdast-util-from-markdown]
to enable MDX JSX.

###### Returns

Extension for `mdast-util-from-markdown` to enable MDX JSX
([`FromMarkdownExtension`][from-markdown-extension]).

When using the [micromark syntax extension][micromark-extension-mdx-jsx] with
`addResult`, nodes will have a `data.estree` field set to an ESTree
[`Program`][program] node.

### `mdxJsxToMarkdown(options?)`

Create an extension for
[`mdast-util-to-markdown`][mdast-util-to-markdown]
to enable MDX JSX.

This extension configures `mdast-util-to-markdown` with
[`options.fences: true`][mdast-util-to-markdown-fences] and
[`options.resourceLink: true`][mdast-util-to-markdown-resourcelink] too, do not
overwrite them!

###### Parameters

* `options` ([`ToMarkdownOptions`][api-to-markdown-options])
  — configuration

###### Returns

Extension for `mdast-util-to-markdown` to enable MDX JSX
([`FromMarkdownExtension`][to-markdown-extension]).

### `MdxJsxAttribute`

MDX JSX attribute with a key (TypeScript type).

###### Type

```ts
import type {Literal} from 'mdast'

interface MdxJsxAttribute extends Literal {
  type: 'mdxJsxAttribute'
  name: string
  value?: MdxJsxAttributeValueExpression | string | null | undefined
}
```

### `MdxJsxAttributeValueExpression`

MDX JSX attribute value set to an expression (TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Literal} from 'mdast'

interface MdxJsxAttributeValueExpression extends Literal {
  type: 'mdxJsxAttributeValueExpression'
  data?: {estree?: Program | null | undefined} & Literal['data']
}
```

### `MdxJsxExpressionAttribute`

MDX JSX attribute as an expression (TypeScript type).

###### Type

```ts
import type {Program} from 'estree-jsx'
import type {Literal} from 'mdast'

interface MdxJsxExpressionAttribute extends Literal {
  type: 'mdxJsxExpressionAttribute'
  data?: {estree?: Program | null | undefined} & Literal['data']
}
```

### `MdxJsxFlowElement`

MDX JSX element node, occurring in flow (block) (TypeScript type).

###### Type

```ts
import type {BlockContent, DefinitionContent, Parent} from 'mdast'

export interface MdxJsxFlowElement extends Parent {
  type: 'mdxJsxFlowElement'
  name: string | null
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  children: Array<BlockContent | DefinitionContent>
}
```

### `MdxJsxFlowElementHast`

Same as [`MdxJsxFlowElement`][api-mdx-jsx-flow-element], but registered with
`@types/hast` (TypeScript type).

###### Type

```ts
import type {ElementContent, Parent} from 'hast'

export interface MdxJsxFlowElementHast extends Parent {
  type: 'mdxJsxFlowElement'
  name: string | null
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  children: Array<ElementContent>
}
```

### `MdxJsxTextElement`

MDX JSX element node, occurring in text (phrasing) (TypeScript type).

###### Type

```ts
import type {Parent, PhrasingContent} from 'mdast'

export interface MdxJsxTextElement extends Parent {
  type: 'mdxJsxTextElement'
  name: string | null
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  children: Array<PhrasingContent>
}
```

### `MdxJsxTextElementHast`

Same as [`MdxJsxTextElement`][api-mdx-jsx-text-element], but registered with
`@types/hast` (TypeScript type).

###### Type

```ts
import type {ElementContent, Parent} from 'hast'

export interface MdxJsxTextElementHast extends Parent {
  type: 'mdxJsxTextElement'
  name: string | null
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  children: Array<ElementContent>
}
```

### `ToMarkdownOptions`

Configuration (TypeScript type).

##### Fields

* `quote` (`'"'` or `"'"`, default: `'"'`)
  — preferred quote to use around attribute values
* `quoteSmart` (`boolean`, default: `false`)
  — use the other quote if that results in less bytes
* `tightSelfClosing` (`boolean`, default: `false`)
  — do not use an extra space when closing self-closing elements: `<img/>`
  instead of `<img />`
* `printWidth` (`number`, default: `Infinity`)
  — try and wrap syntax at this width.
  When set to a finite number (say, `80`), the formatter will print
  attributes on separate lines when a tag doesn’t fit on one line.
  The normal behavior is to print attributes with spaces between them instead
  of line endings

## HTML

MDX JSX has no representation in HTML.
Though, when you are dealing with MDX, you will likely go *through* hast.
You can enable passing MDX JSX through to hast by configuring
[`mdast-util-to-hast`][mdast-util-to-hast] with
`passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement']`.

## Syntax

See [Syntax in `micromark-extension-mdx-jsx`][syntax].

## Syntax tree

The following interfaces are added to **[mdast][]** by this utility.

### Nodes

#### `MdxJsxFlowElement`

```idl
interface MdxJsxFlowElement <: Parent {
  type: 'mdxJsxFlowElement'
}

MdxJsxFlowElement includes MdxJsxElement
```

**MdxJsxFlowElement** (**[Parent][dfn-parent]**) represents JSX in flow (block).
It can be used where **[flow][dfn-content-flow]** content is expected.
It includes the mixin **[MdxJsxElement][dfn-mixin-mdx-jsx-element]**.

For example, the following markdown:

```markdown
<w x="y">
  z
</w>
```

Yields:

```js
{
  type: 'mdxJsxFlowElement',
  name: 'w',
  attributes: [{type: 'mdxJsxAttribute', name: 'x', value: 'y'}],
  children: [{type: 'paragraph', children: [{type: 'text', value: 'z'}]}]
}
```

#### `MdxJsxTextElement`

```idl
interface MdxJsxTextElement <: Parent {
  type: 'mdxJsxTextElement'
}

MdxJsxTextElement includes MdxJsxElement
```

**MdxJsxTextElement** (**[Parent][dfn-parent]**) represents JSX in text (span,
inline).
It can be used where **[phrasing][dfn-content-phrasing]** content is
expected.
It includes the mixin **[MdxJsxElement][dfn-mixin-mdx-jsx-element]**.

For example, the following markdown:

```markdown
a <b c>d</b> e.
```

Yields:

```js
{
  type: 'mdxJsxTextElement',
  name: 'b',
  attributes: [{type: 'mdxJsxAttribute', name: 'c', value: null}],
  children: [{type: 'text', value: 'd'}]
}
```

### Mixin

#### `MdxJsxElement`

```idl
interface mixin MdxJsxElement {
  name: string?
  attributes: [MdxJsxExpressionAttribute | MdxJsxAttribute]
}

interface MdxJsxExpressionAttribute <: Literal {
  type: 'mdxJsxExpressionAttribute'
}

interface MdxJsxAttribute <: Node {
  type: 'mdxJsxAttribute'
  name: string
  value: MdxJsxAttributeValueExpression | string?
}

interface MdxJsxAttributeValueExpression <: Literal {
  type: 'mdxJsxAttributeValueExpression'
}
```

**MdxJsxElement** represents a JSX element.

The `name` field can be present and represents an identifier.
Without `name`, the element represents a fragment, in which case no attributes
must be present.

The `attributes` field represents information associated with the node.
The value of the `attributes` field is a list of **MdxJsxExpressionAttribute**
and **MdxJsxAttribute** nodes.

**MdxJsxExpressionAttribute** represents an expression (typically in a
programming language) that when evaluated results in multiple attributes.

**MdxJsxAttribute** represents a single attribute.
The `name` field must be present.
The `value` field can be present, in which case it is either a string (a static
value) or an expression (typically in a programming language) that when
evaluated results in an attribute value.

### Content model

###### `FlowContent` (MDX JSX)

```idl
type MdxJsxFlowContent = MdxJsxFlowElement | FlowContent
```

###### `PhrasingContent` (MDX JSX)

```idl
type MdxJsxPhrasingContent = MdxJsxTextElement | PhrasingContent
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional types  [`MdxJsxAttribute`][api-mdx-jsx-attribute],
[`MdxJsxAttributeValueExpression`][api-mdx-jsx-attribute-value-expression],
[`MdxJsxExpressionAttribute`][api-mdx-jsx-expression-attribute],
[`MdxJsxFlowElement`][api-mdx-jsx-flow-element],
[`MdxJsxFlowElementHast`][api-mdx-jsx-flow-element-hast],
[`MdxJsxTextElement`][api-mdx-jsx-text-element],
[`MdxJsxTextElementHast`][api-mdx-jsx-text-element-hast], and
[`ToMarkdownOptions`][api-to-markdown-options].

It also registers the node types with `@types/mdast` and `@types/hast`.
If you’re working with the syntax tree, make sure to import this utility
somewhere in your types, as that registers the new node types in the tree.

```js
/**
 * @import {} from 'mdast-util-mdx-jsx'
 * @import {Root} from 'mdast'
 */

import {visit} from 'unist-util-visit'

/** @type {Root} */
const tree = getMdastNodeSomeHow()

visit(tree, function (node) {
  // `node` can now be one of the JSX nodes.
})
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `mdast-util-mdx-jsx@3`,
compatible with Node.js 16.

This utility works with `mdast-util-from-markdown` version 2+ and
`mdast-util-to-markdown` version 2+.

## Related

* [`micromark/micromark-extension-mdx-jsx`][micromark-extension-mdx-jsx]
  — support MDX JSX in micromark
* [`syntax-tree/mdast-util-mdx`][mdast-util-mdx]
  — support MDX in mdast
* [`remarkjs/remark-mdx`][remark-mdx]
  — support MDX in remark

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

[build-badge]: https://github.com/syntax-tree/mdast-util-mdx-jsx/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/mdast-util-mdx-jsx/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/mdast-util-mdx-jsx.svg

[coverage]: https://codecov.io/github/syntax-tree/mdast-util-mdx-jsx

[downloads-badge]: https://img.shields.io/npm/dm/mdast-util-mdx-jsx.svg

[downloads]: https://www.npmjs.com/package/mdast-util-mdx-jsx

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=mdast-util-mdx-jsx

[size]: https://bundlejs.com/?q=mdast-util-mdx-jsx

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[npm]: https://docs.npmjs.com/cli/install

[esmsh]: https://esm.sh

[license]: license

[author]: https://wooorm.com

[health]: https://github.com/syntax-tree/.github

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[typescript]: https://www.typescriptlang.org

[mdast]: https://github.com/syntax-tree/mdast

[mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[from-markdown-extension]: https://github.com/syntax-tree/mdast-util-from-markdown#extension

[mdast-util-to-markdown]: https://github.com/syntax-tree/mdast-util-to-markdown

[to-markdown-extension]: https://github.com/syntax-tree/mdast-util-to-markdown#options

[mdast-util-mdx]: https://github.com/syntax-tree/mdast-util-mdx

[program]: https://github.com/estree/estree/blob/master/es2015.md#programs

[dfn-parent]: https://github.com/syntax-tree/mdast#parent

[dfn-content-flow]: #flowcontent-mdx-jsx

[dfn-content-phrasing]: #phrasingcontent-mdx-jsx

[dfn-mixin-mdx-jsx-element]: #mdxjsxelement

[jsx]: https://facebook.github.io/jsx/

[what-is-mdx]: https://mdxjs.com/docs/what-is-mdx/

[micromark-extension-mdx-jsx]: https://github.com/micromark/micromark-extension-mdx-jsx

[syntax]: https://github.com/micromark/micromark-extension-mdx-jsx#syntax

[mdast-util-to-markdown-fences]: https://github.com/syntax-tree/mdast-util-to-markdown#optionsfences

[mdast-util-to-markdown-resourcelink]: https://github.com/syntax-tree/mdast-util-to-markdown#optionsresourcelink

[remark-mdx]: https://mdxjs.com/packages/remark-mdx/

[mdx]: https://mdxjs.com

[api-mdx-jsx-from-markdown]: #mdxjsxfrommarkdown

[api-mdx-jsx-to-markdown]: #mdxjsxtomarkdownoptions

[api-mdx-jsx-attribute]: #mdxjsxattribute

[api-mdx-jsx-attribute-value-expression]: #mdxjsxattributevalueexpression

[api-mdx-jsx-expression-attribute]: #mdxjsxexpressionattribute

[api-mdx-jsx-flow-element]: #mdxjsxflowelement

[api-mdx-jsx-flow-element-hast]: #mdxjsxflowelementhast

[api-mdx-jsx-text-element]: #mdxjsxtextelement

[api-mdx-jsx-text-element-hast]: #mdxjsxtextelementhast

[api-to-markdown-options]: #tomarkdownoptions
