# remark-directive

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[remark][]** plugin to support the [generic directives
proposal][commonmark-prop] (`:cite[smith04]`,
`::youtube[Video of a cat in a box]{v=01ab2cd3efg}`, and such).

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(remarkDirective[, options])`](#unifieduseremarkdirective-options)
  * [`Options`](#options)
* [Examples](#examples)
  * [Example: YouTube](#example-youtube)
  * [Example: Styled blocks](#example-styled-blocks)
* [Authoring](#authoring)
* [HTML](#html)
* [CSS](#css)
* [Syntax](#syntax)
* [Syntax tree](#syntax-tree)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][] ([remark][]) plugin to add support for directives:
one syntax for arbitrary extensions in markdown.

## When should I use this?

Directives are one of the four ways to extend markdown: an arbitrary extension
syntax (see [Extending markdown][micromark-extending-markdown] in micromark’s
docs for the alternatives and more info).
This mechanism works well when you control the content: who authors it, what
tools handle it, and where it’s displayed.
When authors can read a guide on how to embed a tweet but are not expected to
know the ins and outs of HTML or JavaScript.
Directives don’t work well if you don’t know who authors content, what tools
handle it, and where it ends up.
Example use cases are a docs website for a project or product, or blogging
tools and static site generators.

If you *just* want to turn markdown into HTML (with maybe a few extensions such
as this one), we recommend [`micromark`][micromark] with
[`micromark-extension-directive`][micromark-extension-directive] instead.
If you don’t use plugins and want to access the syntax tree, you can use
[`mdast-util-from-markdown`][mdast-util-from-markdown] with
[`mdast-util-directive`][mdast-util-directive].

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install remark-directive
```

In Deno with [`esm.sh`][esmsh]:

```js
import remarkDirective from 'https://esm.sh/remark-directive@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import remarkDirective from 'https://esm.sh/remark-directive@3?bundle'
</script>
```

## Use

Say our document `example.md` contains:

```markdown
:::main{#readme}

Lorem:br
ipsum.

::hr{.red}

A :i[lovely] language know as :abbr[HTML]{title="HyperText Markup Language"}.

:::
```

…and our module `example.js` contains:

```js
/**
 * @import {} from 'mdast-util-directive'
 * @import {} from 'mdast-util-to-hast'
 * @import {Root} from 'mdast'
 */

import {h} from 'hastscript'
import rehypeFormat from 'rehype-format'
import rehypeStringify from 'rehype-stringify'
import remarkDirective from 'remark-directive'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {read} from 'to-vfile'
import {unified} from 'unified'
import {visit} from 'unist-util-visit'

const file = await unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(myRemarkPlugin)
  .use(remarkRehype)
  .use(rehypeFormat)
  .use(rehypeStringify)
  .process(await read('example.md'))

console.log(String(file))

// This plugin is an example to let users write HTML with directives.
// It’s informative but rather useless.
// See below for others examples.
function myRemarkPlugin() {
  /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree) {
    visit(tree, function (node) {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const data = node.data || (node.data = {})
        const hast = h(node.name, node.attributes || {})

        data.hName = hast.tagName
        data.hProperties = hast.properties
      }
    })
  }
}
```

…then running `node example.js` yields:

```html
<main id="readme">
  <p>Lorem<br>ipsum.</p>
  <hr class="red">
  <p>A <i>lovely</i> language know as <abbr title="HyperText Markup Language">HTML</abbr>.</p>
</main>
```

## API

This package exports no identifiers.
The default export is [`remarkDirective`][api-remark-directive].

### `unified().use(remarkDirective[, options])`

Add support for generic directives.

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Nothing (`undefined`).

###### Notes

Doesn’t handle the directives:
[create your own plugin][unified-create-plugin] to do that.

### `Options`

Configuration (TypeScript type).

###### Fields

* `collapseEmptyAttributes`
  (`boolean`, default: `true`)
  — collapse empty attributes: get `title` instead of `title=""`
* `preferShortcut`
  (`boolean`, default: `true`)
  — prefer `#` and `.` shortcuts for `id` and `class`
* `preferUnquoted`
  (`boolean`, default: `false`)
  — leave attributes unquoted if that results in less bytes
* `quoteSmart`
  (`boolean`, default: `false`)
  — use the other quote if that results in less bytes
* `quote`
  (`'"'` or `"'"`,
  default: the [`quote`][quote] used by `remark-stringify` for titles)
  — preferred quote to use around attribute values

## Examples

### Example: YouTube

This example shows how directives can be used for YouTube embeds.
It’s based on the example in Use above.
If `myRemarkPlugin` was replaced with this function:

```js
/**
 * @import {} from 'mdast-util-directive'
 * @import {} from 'mdast-util-to-hast'
 * @import {Root} from 'mdast'
 * @import {VFile} from 'vfile'
 */

import {visit} from 'unist-util-visit'

// This plugin is an example to turn `::youtube` into iframes.
function myRemarkPlugin() {
  /**
   * @param {Root} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  return (tree, file) => {
    visit(tree, function (node) {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (node.name !== 'youtube') return

        const data = node.data || (node.data = {})
        const attributes = node.attributes || {}
        const id = attributes.id

        if (node.type === 'textDirective') {
          file.fail(
            'Unexpected `:youtube` text directive, use two colons for a leaf directive',
            node
          )
        }

        if (!id) {
          file.fail('Unexpected missing `id` on `youtube` directive', node)
        }

        data.hName = 'iframe'
        data.hProperties = {
          src: 'https://www.youtube.com/embed/' + id,
          width: 200,
          height: 200,
          frameBorder: 0,
          allow: 'picture-in-picture',
          allowFullScreen: true
        }
      }
    })
  }
}
```

…and `example.md` contains:

```markdown
# Cat videos

::youtube[Video of a cat in a box]{#01ab2cd3efg}
```

…then running `node example.js` yields:

```html
<h1>Cat videos</h1>
<iframe src="https://www.youtube.com/embed/01ab2cd3efg" width="200" height="200" frameborder="0" allow="picture-in-picture" allowfullscreen>Video of a cat in a box</iframe>
```

### Example: Styled blocks

> 👉 **Note**: This is sometimes called admonitions, callouts, etc.

This example shows how directives can be used to style blocks.
It’s based on the example in Use above.
If `myRemarkPlugin` was replaced with this function:

```js
/**
 * @import {} from 'mdast-util-directive'
 * @import {} from 'mdast-util-to-hast'
 * @import {Root} from 'mdast'
 */

import {h} from 'hastscript'
import {visit} from 'unist-util-visit'

// This plugin is an example to turn `::note` into divs, passing arbitrary
// attributes.
function myRemarkPlugin() {
  /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (node.name !== 'note') return

        const data = node.data || (node.data = {})
        const tagName = node.type === 'textDirective' ? 'span' : 'div'

        data.hName = tagName
        data.hProperties = h(tagName, node.attributes || {}).properties
      }
    })
  }
}
```

…and `example.md` contains:

```markdown
# How to use xxx

You can use xxx.

:::note{.warning}
if you chose xxx, you should also use yyy somewhere…
:::
```

…then running `node example` yields:

```html
<h1>How to use xxx</h1>
<p>You can use xxx.</p>
<div class="warning">
  <p>if you chose xxx, you should also use yyy somewhere…</p>
</div>
```

## Authoring

When authoring markdown with directives, keep in mind that they don’t work in
most places.
On your own site it can be great!

## HTML

You can define how directives are turned into HTML.
If directives are not handled, they do not emit anything.

## CSS

How to display directives is left as an exercise for the reader.

## Syntax

See [*Syntax* in
`micromark-extension-directive`](https://github.com/micromark/micromark-extension-directive#syntax).

## Syntax tree

See [*Syntax tree* in
`mdast-util-directive`](https://github.com/syntax-tree/mdast-util-directive#syntax-tree).

## Types

This package is fully typed with [TypeScript][].
It exports no additional options.

If you’re working with the syntax tree, you can register the new node types
with `@types/mdast` by adding a reference:

```js
/**
 * @import {} from 'mdast-util-directive'
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
  return (tree) => {
    visit(tree, function (node) {
      console.log(node) // `node` can now be one of the nodes for directives.
    })
  }
}
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `remark-directive@^3`,
compatible with Node.js 16.

## Security

Use of `remark-directive` does not involve **[rehype][]** ([hast][]) or user
content so there are no openings for [cross-site scripting (XSS)][wiki-xss]
attacks.

## Related

* [`remark-gfm`](https://github.com/remarkjs/remark-gfm)
  — support GFM (autolink literals, footnotes, strikethrough, tables,
  tasklists)
* [`remark-frontmatter`](https://github.com/remarkjs/remark-frontmatter)
  — support frontmatter (YAML, TOML, and more)
* [`remark-math`](https://github.com/remarkjs/remark-math)
  — support math
* [`remark-mdx`](https://github.com/mdx-js/mdx/tree/main/packages/remark-mdx)
  — support MDX (ESM, JSX, expressions)

## Contribute

See [`contributing.md`][contributing] in [`remarkjs/.github`][health] for ways
to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/remarkjs/remark-directive/workflows/main/badge.svg

[build]: https://github.com/remarkjs/remark-directive/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-directive.svg

[coverage]: https://codecov.io/github/remarkjs/remark-directive

[downloads-badge]: https://img.shields.io/npm/dm/remark-directive.svg

[downloads]: https://www.npmjs.com/package/remark-directive

[size-badge]: https://img.shields.io/bundlejs/size/remark-directive

[size]: https://bundlejs.com/?q=remark-directive

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/remarkjs/remark/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[health]: https://github.com/remarkjs/.github

[contributing]: https://github.com/remarkjs/.github/blob/main/contributing.md

[support]: https://github.com/remarkjs/.github/blob/main/support.md

[coc]: https://github.com/remarkjs/.github/blob/main/code-of-conduct.md

[license]: license

[author]: https://wooorm.com

[commonmark-prop]: https://talk.commonmark.org/t/generic-directives-plugins-syntax/444

[hast]: https://github.com/syntax-tree/hast

[mdast-util-directive]: https://github.com/syntax-tree/mdast-util-directive

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[micromark]: https://github.com/micromark/micromark

[micromark-extension-directive]: https://github.com/micromark/micromark-extension-directive

[micromark-extending-markdown]: https://github.com/micromark/micromark#extending-markdown

[quote]: https://github.com/remarkjs/remark/tree/main/packages/remark-stringify#options

[rehype]: https://github.com/rehypejs/rehype

[remark]: https://github.com/remarkjs/remark

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[unified-create-plugin]: https://unifiedjs.com/learn/guide/create-a-plugin/

[wiki-xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[api-remark-directive]: #unifieduseremarkdirective-options

[api-options]: #options
