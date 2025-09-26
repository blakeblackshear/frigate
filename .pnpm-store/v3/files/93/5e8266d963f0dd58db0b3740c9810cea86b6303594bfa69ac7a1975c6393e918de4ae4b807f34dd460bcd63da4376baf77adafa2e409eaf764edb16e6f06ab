# remark-stringify

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[remark][]** plugin to add support for serializing to markdown.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`unified().use(remarkStringify[, options])`](#unifieduseremarkstringify-options)
*   [Syntax](#syntax)
*   [Syntax tree](#syntax-tree)
*   [Types](#types)
*   [Security](#security)
*   [Contribute](#contribute)
*   [Sponsor](#sponsor)
*   [License](#license)

## What is this?

This package is a [unified][] ([remark][]) plugin that defines how to take a
syntax tree as input and turn it into serialized markdown.
When it’s used, markdown is serialized as the final result.

See [the monorepo readme][remark] for info on what the remark ecosystem is.

## When should I use this?

This plugin adds support to unified for serializing markdown.
If you also need to parse markdown, you can alternatively use
[`remark`][remark-core], which combines unified,
[`remark-parse`][remark-parse], and this plugin.

If you don’t use plugins and have access to a syntax tree, you can directly use
[`mdast-util-to-markdown`][mdast-util-to-markdown], which is used inside this
plugin.
remark focusses on making it easier to transform content by abstracting these
internals away.

You can combine this plugin with other plugins to add syntax extensions.
Notable examples that deeply integrate with it are
[`remark-gfm`][remark-gfm],
[`remark-mdx`][remark-mdx],
[`remark-frontmatter`][remark-frontmatter],
[`remark-math`][remark-math], and
[`remark-directive`][remark-directive].
You can also use any other [remark plugin][remark-plugin] before
`remark-stringify`.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install remark-stringify
```

In Deno with [`esm.sh`][esmsh]:

```js
import remarkStringify from 'https://esm.sh/remark-stringify@11'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import remarkStringify from 'https://esm.sh/remark-stringify@11?bundle'
</script>
```

## Use

Say we have the following module `example.js`:

```js
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import {unified} from 'unified'

const doc = `
<h1>Uranus</h1>
<p><b>Uranus</b> is the seventh
<a href="/wiki/Planet" title="Planet">planet</a> from the Sun and is a gaseous
cyan <a href="/wiki/Ice_giant" title="Ice giant">ice giant</a>.</p>
`

const file = await unified()
  .use(rehypeParse)
  .use(rehypeRemark)
  .use(remarkStringify)
  .process(doc)

console.log(String(file))
```

…then running `node example.js` yields:

```markdown
# Uranus

**Uranus** is the seventh [planet](/wiki/Planet "Planet") from the Sun and is a gaseous cyan [ice giant](/wiki/Ice_giant "Ice giant").
```

## API

This package exports no identifiers.
The default export is [`remarkStringify`][api-remark-stringify].

### `unified().use(remarkStringify[, options])`

Add support for serializing to markdown.

###### Parameters

*   `options` ([`Options`][api-options], optional)
    — configuration

###### Returns

Nothing (`undefined`).

### `Options`

Configuration (TypeScript type).

###### Fields

*   `bullet` (`'*'`, `'+'`, or `'-'`, default: `'*'`)
    — marker to use for bullets of items in unordered lists
*   `bulletOther` (`'*'`, `'+'`, or `'-'`, default: `'-'` when `bullet` is
    `'*'`, `'*'` otherwise)
    — marker to use in certain cases where the primary bullet doesn’t work;
    cannot be equal to `bullet`
*   `bulletOrdered` (`'.'` or `')'`, default: `'.'`)
    — marker to use for bullets of items in ordered lists
*   `closeAtx` (`boolean`, default: `false`)
    — add the same number of number signs (`#`) at the end of an ATX heading as
    the opening sequence
*   `emphasis` (`'*'` or `'_'`, default: `'*'`)
    — marker to use for emphasis
*   `fence` (``'`'`` or `'~'`, default: ``'`'``)
    — marker to use for fenced code
*   `fences` (`boolean`, default: `true`)
    — use fenced code always; when `false`, uses fenced code if there is a
    language defined, if the code is empty, or if it starts or ends in blank
    lines
*   `handlers` (`Handlers`, optional)
    — handle particular nodes;
    see [`mdast-util-to-markdown`][mdast-util-to-markdown] for more info
*   `incrementListMarker` (`boolean`, default: `true`)
    — increment the counter of ordered lists items
*   `join` (`Array<Join>`, optional)
    — how to join blocks;
    see [`mdast-util-to-markdown`][mdast-util-to-markdown] for more info
*   `listItemIndent` (`'mixed'`, `'one'`, or `'tab'`, default: `'one'`)
    — how to indent the content of list items;
    either with the size of the bullet plus one space (when `'one'`), a tab
    stop (`'tab'`), or depending on the item and its parent list: `'mixed'`
    uses `'one'` if the item and list are tight and `'tab'` otherwise
*   `quote` (`'"'` or `"'"`, default: `'"'`)
    — marker to use for titles
*   `resourceLink` (`boolean`, default: `false`)
    — always use resource links (`[text](url)`);
    when `false`, uses autolinks (`<https://example.com>`) when possible
*   `rule` (`'*'`, `'-'`, or `'_'`, default: `'*'`)
    — marker to use for thematic breaks
*   `ruleRepetition` (`number`, default: `3`, min: `3`)
    — number of markers to use for thematic breaks
*   `ruleSpaces` (`boolean`, default: `false`)
    — add spaces between markers in thematic breaks
*   `setext` (`boolean`, default: `false`)
    — use setext headings when possible;
    when `true`, uses setext headings (`heading\n=======`) for non-empty rank 1
    or 2 headings
*   `strong` (`'*'` or `'_'`, default: `'*'`)
    — marker to use for strong
*   `tightDefinitions` (`boolean`, default: `false`)
    — join definitions without a blank line
*   `unsafe` (`Array<Unsafe>`, optional)
    — schemas that define when characters cannot occur;
    see [`mdast-util-to-markdown`][mdast-util-to-markdown] for more info

<!-- Note: `extensions` intentionally not supported/documented. -->

## Syntax

Markdown is serialized according to CommonMark but care is taken to format in a
way that works with most markdown parsers.
Other plugins can add support for syntax extensions.

## Syntax tree

The syntax tree used in remark is [mdast][].

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

It also registers `Settings` with `unified`.
If you’re passing options with `.data('settings', …)`, make sure to import this
package somewhere in your types, as that registers the fields.

```js
/// <reference types="remark-stringify" />

import {unified} from 'unified'

// @ts-expect-error: `thisDoesNotExist` is not a valid option.
unified().data('settings', {thisDoesNotExist: false})
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `remark-stringify@^11`,
compatible with Node.js 16.

## Security

Use of `remark-stringify` is safe.

Use of remark plugins can open you up to attacks.
Carefully assess each plugin and the risks involved in using them.

For info on how to submit a report, see our [security policy][security].

## Contribute

See [`contributing.md`][contributing] in [`remarkjs/.github`][health] for ways
to get started.
See [`support.md`][support] for ways to get help.
Join us in [Discussions][chat] to chat with the community and contributors.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## Sponsor

Support this effort and give back by sponsoring on [OpenCollective][collective]!

<table>
<tr valign="middle">
<td width="20%" align="center" rowspan="2" colspan="2">
  <a href="https://vercel.com">Vercel</a><br><br>
  <a href="https://vercel.com"><img src="https://avatars1.githubusercontent.com/u/14985020?s=256&v=4" width="128"></a>
</td>
<td width="20%" align="center" rowspan="2" colspan="2">
  <a href="https://motif.land">Motif</a><br><br>
  <a href="https://motif.land"><img src="https://avatars1.githubusercontent.com/u/74457950?s=256&v=4" width="128"></a>
</td>
<td width="20%" align="center" rowspan="2" colspan="2">
  <a href="https://www.hashicorp.com">HashiCorp</a><br><br>
  <a href="https://www.hashicorp.com"><img src="https://avatars1.githubusercontent.com/u/761456?s=256&v=4" width="128"></a>
</td>
<td width="20%" align="center" rowspan="2" colspan="2">
  <a href="https://www.gitbook.com">GitBook</a><br><br>
  <a href="https://www.gitbook.com"><img src="https://avatars1.githubusercontent.com/u/7111340?s=256&v=4" width="128"></a>
</td>
<td width="20%" align="center" rowspan="2" colspan="2">
  <a href="https://www.gatsbyjs.org">Gatsby</a><br><br>
  <a href="https://www.gatsbyjs.org"><img src="https://avatars1.githubusercontent.com/u/12551863?s=256&v=4" width="128"></a>
</td>
</tr>
<tr valign="middle">
</tr>
<tr valign="middle">
<td width="20%" align="center" rowspan="2" colspan="2">
  <a href="https://www.netlify.com">Netlify</a><br><br>
  <!--OC has a sharper image-->
  <a href="https://www.netlify.com"><img src="https://images.opencollective.com/netlify/4087de2/logo/256.png" width="128"></a>
</td>
<td width="10%" align="center">
  <a href="https://www.coinbase.com">Coinbase</a><br><br>
  <a href="https://www.coinbase.com"><img src="https://avatars1.githubusercontent.com/u/1885080?s=256&v=4" width="64"></a>
</td>
<td width="10%" align="center">
  <a href="https://themeisle.com">ThemeIsle</a><br><br>
  <a href="https://themeisle.com"><img src="https://avatars1.githubusercontent.com/u/58979018?s=128&v=4" width="64"></a>
</td>
<td width="10%" align="center">
  <a href="https://expo.io">Expo</a><br><br>
  <a href="https://expo.io"><img src="https://avatars1.githubusercontent.com/u/12504344?s=128&v=4" width="64"></a>
</td>
<td width="10%" align="center">
  <a href="https://boostnote.io">Boost Note</a><br><br>
  <a href="https://boostnote.io"><img src="https://images.opencollective.com/boosthub/6318083/logo/128.png" width="64"></a>
</td>
<td width="10%" align="center">
  <a href="https://markdown.space">Markdown Space</a><br><br>
  <a href="https://markdown.space"><img src="https://images.opencollective.com/markdown-space/e1038ed/logo/128.png" width="64"></a>
</td>
<td width="10%" align="center">
  <a href="https://www.holloway.com">Holloway</a><br><br>
  <a href="https://www.holloway.com"><img src="https://avatars1.githubusercontent.com/u/35904294?s=128&v=4" width="64"></a>
</td>
<td width="10%"></td>
<td width="10%"></td>
</tr>
<tr valign="middle">
<td width="100%" align="center" colspan="8">
  <br>
  <a href="https://opencollective.com/unified"><strong>You?</strong></a>
  <br><br>
</td>
</tr>
</table>

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/remarkjs/remark/workflows/main/badge.svg

[build]: https://github.com/remarkjs/remark/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark.svg

[coverage]: https://codecov.io/github/remarkjs/remark

[downloads-badge]: https://img.shields.io/npm/dm/remark-stringify.svg

[downloads]: https://www.npmjs.com/package/remark-stringify

[size-badge]: https://img.shields.io/bundlejs/size/remark-stringify

[size]: https://bundlejs.com/?q=remark-stringify

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/remarkjs/remark/discussions

[security]: https://github.com/remarkjs/.github/blob/main/security.md

[health]: https://github.com/remarkjs/.github

[contributing]: https://github.com/remarkjs/.github/blob/main/contributing.md

[support]: https://github.com/remarkjs/.github/blob/main/support.md

[coc]: https://github.com/remarkjs/.github/blob/main/code-of-conduct.md

[license]: https://github.com/remarkjs/remark/blob/main/license

[author]: https://wooorm.com

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[mdast]: https://github.com/syntax-tree/mdast

[mdast-util-to-markdown]: https://github.com/syntax-tree/mdast-util-to-markdown

[remark]: https://github.com/remarkjs/remark

[remark-core]: ../remark/

[remark-directive]: https://github.com/remarkjs/remark-directive

[remark-frontmatter]: https://github.com/remarkjs/remark-frontmatter

[remark-gfm]: https://github.com/remarkjs/remark-gfm

[remark-math]: https://github.com/remarkjs/remark-math

[remark-mdx]: https://github.com/mdx-js/mdx/tree/main/packages/remark-mdx

[remark-parse]: ../remark-parse/

[remark-plugin]: https://github.com/remarkjs/remark#plugin

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[api-options]: #options

[api-remark-stringify]: #unifieduseremarkstringify-options
