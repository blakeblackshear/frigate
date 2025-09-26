# mdast-util-gfm-footnote

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[mdast][] extensions to parse and serialize [GFM][] footnotes.

## Contents

* [What is this?](#what-is-this)
* [When to use this](#when-to-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`gfmFootnoteFromMarkdown()`](#gfmfootnotefrommarkdown)
  * [`gfmFootnoteToMarkdown(options?)`](#gfmfootnotetomarkdownoptions)
  * [`ToMarkdownOptions`](#tomarkdownoptions)
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

This package contains two extensions that add support for GFM footnote syntax
in markdown to [mdast][].
These extensions plug into
[`mdast-util-from-markdown`][mdast-util-from-markdown] (to support parsing
footnotes in markdown into a syntax tree) and
[`mdast-util-to-markdown`][mdast-util-to-markdown] (to support serializing
footnotes in syntax trees to markdown).

GFM footnotes were [announced September 30, 2021][post] but are not specified.
Their implementation on github.com is currently buggy.
The bugs have been reported on [`cmark-gfm`][cmark-gfm].

## When to use this

You can use these extensions when you are working with
`mdast-util-from-markdown` and `mdast-util-to-markdown` already.

When working with `mdast-util-from-markdown`, you must combine this package
with [`micromark-extension-gfm-footnote`][micromark-extension-gfm-footnote].

When you don’t need a syntax tree, you can use [`micromark`][micromark]
directly with `micromark-extension-gfm-footnote`.

When you are working with syntax trees and want all of GFM, use
[`mdast-util-gfm`][mdast-util-gfm] instead.

All these packages are used [`remark-gfm`][remark-gfm], which
focusses on making it easier to transform content by abstracting these
internals away.

This utility does not handle how markdown is turned to HTML.
That’s done by [`mdast-util-to-hast`][mdast-util-to-hast].
If your content is not in English, you should configure that utility.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install mdast-util-gfm-footnote
```

In Deno with [`esm.sh`][esmsh]:

```js
import {gfmFootnoteFromMarkdown, gfmFootnoteToMarkdown} from 'https://esm.sh/mdast-util-gfm-footnote@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {gfmFootnoteFromMarkdown, gfmFootnoteToMarkdown} from 'https://esm.sh/mdast-util-gfm-footnote@2?bundle'
</script>
```

## Use

Say our document `example.md` contains:

```markdown
In the Solar System, Mercury[^mercury] and Venus[^venus] have very small tilts.

[^mercury]:
    **Mercury** is the first planet from the Sun and the smallest
    in the Solar System.

[^venus]:
    **Venus** is the second planet from
    the Sun.
```

…and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {
  gfmFootnoteFromMarkdown,
  gfmFootnoteToMarkdown
} from 'mdast-util-gfm-footnote'
import {toMarkdown} from 'mdast-util-to-markdown'
import {gfmFootnote} from 'micromark-extension-gfm-footnote'

const value = await fs.readFile('example.md', 'utf8')

const tree = fromMarkdown(value, {
  extensions: [gfmFootnote()],
  mdastExtensions: [gfmFootnoteFromMarkdown()]
})

console.log(tree)

const result = toMarkdown(tree, {
  extensions: [gfmFootnoteToMarkdown({firstLineBlank: true})]
})

console.log(result)
```

…now running `node example.js` yields (positional info removed for brevity):

```js
{
  type: 'root',
  children: [
    {
      type: 'paragraph',
      children: [
        {type: 'text', value: 'In the Solar System, Mercury'},
        {type: 'footnoteReference', identifier: 'mercury', label: 'mercury'},
        {type: 'text', value: ' and Venus'},
        {type: 'footnoteReference', identifier: 'venus', label: 'venus'},
        {type: 'text', value: ' have very small tilts.'}
      ]
    },
    {
      type: 'footnoteDefinition',
      identifier: 'mercury',
      label: 'mercury',
      children: [
        {
          type: 'paragraph',
          children: [
            {type: 'strong', children: [{type: 'text', value: 'Mercury'}]},
            {
              type: 'text',
              value:
                ' is the first planet from the Sun and the smallest\n' +
                'in the Solar System.'
            }
          ]
        }
      ]
    },
    {
      type: 'footnoteDefinition',
      identifier: 'venus',
      label: 'venus',
      children: [
        {
          type: 'paragraph',
          children: [
            {type: 'strong', children: [{type: 'text', value: 'Venus'}]},
            {type: 'text', value: ' is the second planet from\nthe Sun.'}
          ]
        }
      ]
    }
  ]
}
```

```markdown
In the Solar System, Mercury[^mercury] and Venus[^venus] have very small tilts.

[^mercury]:
    **Mercury** is the first planet from the Sun and the smallest
    in the Solar System.

[^venus]:
    **Venus** is the second planet from
    the Sun.
```

## API

This package exports the identifiers
[`gfmFootnoteFromMarkdown`][api-gfmfootnotefrommarkdown] and
[`gfmFootnoteToMarkdown`][api-gfmfootnotetomarkdown].
There is no default export.
It exports the type [`ToMarkdownOptions`][api-to-markdown-options].

### `gfmFootnoteFromMarkdown()`

Create an extension for
[`mdast-util-from-markdown`][mdast-util-from-markdown]
to enable GFM footnotes in markdown.

###### Returns

Extension for `mdast-util-from-markdown`
([`FromMarkdownExtension`][frommarkdownextension]).

### `gfmFootnoteToMarkdown(options?)`

Create an extension for
[`mdast-util-to-markdown`][mdast-util-to-markdown]
to enable GFM footnotes in markdown.

###### Parameters

* `options` ([`ToMarkdownOptions`][api-to-markdown-options], optional)
  — configuration

###### Returns

Extension for `mdast-util-to-markdown`
([`ToMarkdownExtension`][tomarkdownextension]).

### `ToMarkdownOptions`

Configuration (TypeScript type).

###### Fields

* `firstLineBlank` (`boolean`, default: `false`)
  — use a blank line for the first line of footnote definitions

## HTML

This utility does not handle how markdown is turned to HTML.
That’s done by [`mdast-util-to-hast`][mdast-util-to-hast].
If your content is not in English, you should configure that utility.

## Syntax

See [Syntax in `micromark-extension-gfm-footnote`][syntax].

## Syntax tree

The following interfaces are added to **[mdast][]** by this utility.

### Nodes

#### `FootnoteDefinition`

```idl
interface FootnoteDefinition <: Parent {
  type: 'footnoteDefinition'
  children: [FlowContent]
}

FootnoteDefinition includes Association
```

**FootnoteDefinition** (**[Parent][dfn-parent]**) represents content relating
to the document that is outside its flow.

**FootnoteDefinition** can be used where **[flow][dfn-flow-content]** content
is expected.
Its content model is also **[flow][dfn-flow-content]** content.

**FootnoteDefinition** includes the mixin
**[Association][dfn-mxn-association]**.

**FootnoteDefinition** should be associated with
**[FootnoteReferences][dfn-footnote-reference]**.

For example, the following markdown:

```markdown
[^alpha]: bravo and charlie.
```

Yields:

```js
{
  type: 'footnoteDefinition',
  identifier: 'alpha',
  label: 'alpha',
  children: [{
    type: 'paragraph',
    children: [{type: 'text', value: 'bravo and charlie.'}]
  }]
}
```

#### `FootnoteReference`

```idl
interface FootnoteReference <: Node {
  type: 'footnoteReference'
}

FootnoteReference includes Association
```

**FootnoteReference** (**[Node][dfn-node]**) represents a marker through
association.

**FootnoteReference** can be used where
**[phrasing][dfn-phrasing-content]** content is expected.
It has no content model.

**FootnoteReference** includes the mixin **[Association][dfn-mxn-association]**.

**FootnoteReference** should be associated with a
**[FootnoteDefinition][dfn-footnote-definition]**.

For example, the following markdown:

```markdown
[^alpha]
```

Yields:

```js
{
  type: 'footnoteReference',
  identifier: 'alpha',
  label: 'alpha'
}
```

### Content model

#### `FlowContent` (GFM footnotes)

```idl
type FlowContentGfm = FootnoteDefinition | FlowContent
```

#### `PhrasingContent` (GFM footnotes)

```idl
type PhrasingContentGfm = FootnoteReference | PhrasingContent
```

## Types

This package is fully typed with [TypeScript][].
It does not export additional types.

The `FootnoteDefinition` and `FootnoteReference` types of the mdast nodes are
exposed from `@types/mdast`.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`mdast-util-gfm-footnote@^2`, compatible with Node.js 16.

## Related

* [`remark-gfm`][remark-gfm]
  — remark plugin to support GFM
* [`mdast-util-gfm`][mdast-util-gfm]
  — same but all of GFM (autolink literals, footnotes, strikethrough, tables,
  tasklists)
* [`micromark-extension-gfm-footnote`][micromark-extension-gfm-footnote]
  — micromark extension to parse GFM footnotes

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

[api-gfmfootnotefrommarkdown]: #gfmfootnotefrommarkdown

[api-gfmfootnotetomarkdown]: #gfmfootnotetomarkdownoptions

[api-to-markdown-options]: #tomarkdownoptions

[author]: https://wooorm.com

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/syntax-tree/mdast-util-gfm-footnote/actions

[build-badge]: https://github.com/syntax-tree/mdast-util-gfm-footnote/workflows/main/badge.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[cmark-gfm]: https://github.com/github/cmark-gfm

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[collective]: https://opencollective.com/unified

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[coverage]: https://codecov.io/github/syntax-tree/mdast-util-gfm-footnote

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/mdast-util-gfm-footnote.svg

[dfn-flow-content]: #flowcontent-gfm-footnotes

[dfn-footnote-definition]: #footnotedefinition

[dfn-footnote-reference]: #footnotereference

[dfn-mxn-association]: https://github.com/syntax-tree/mdast#association

[dfn-node]: https://github.com/syntax-tree/unist#node

[dfn-parent]: https://github.com/syntax-tree/mdast#parent

[dfn-phrasing-content]: #phrasingcontent-gfm-footnotes

[downloads]: https://www.npmjs.com/package/mdast-util-gfm-footnote

[downloads-badge]: https://img.shields.io/npm/dm/mdast-util-gfm-footnote.svg

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[frommarkdownextension]: https://github.com/syntax-tree/mdast-util-from-markdown#extension

[gfm]: https://github.github.com/gfm/

[health]: https://github.com/syntax-tree/.github

[license]: license

[mdast]: https://github.com/syntax-tree/mdast

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-gfm]: https://github.com/syntax-tree/mdast-util-gfm

[mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[mdast-util-to-markdown]: https://github.com/syntax-tree/mdast-util-to-markdown

[micromark]: https://github.com/micromark/micromark

[micromark-extension-gfm-footnote]: https://github.com/micromark/micromark-extension-gfm-footnote

[npm]: https://docs.npmjs.com/cli/install

[post]: https://github.blog/changelog/2021-09-30-footnotes-now-supported-in-markdown-fields/

[remark-gfm]: https://github.com/remarkjs/remark-gfm

[size]: https://bundlejs.com/?q=mdast-util-gfm-footnote

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=mdast-util-gfm-footnote

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[syntax]: https://github.com/micromark/micromark-extension-gfm-footnote#syntax

[tomarkdownextension]: https://github.com/syntax-tree/mdast-util-to-markdown#options

[typescript]: https://www.typescriptlang.org
