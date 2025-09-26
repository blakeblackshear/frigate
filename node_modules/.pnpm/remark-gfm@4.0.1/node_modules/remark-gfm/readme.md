# remark-gfm

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[remark][]** plugin to support [GFM][] (autolink literals, footnotes,
strikethrough, tables, tasklists).

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(remarkGfm[, options])`](#unifieduseremarkgfm-options)
  * [`Options`](#options)
* [Examples](#examples)
  * [Example: `singleTilde`](#example-singletilde)
  * [Example: `stringLength`](#example-stringlength)
* [Bugs](#bugs)
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

This package is a [unified][] ([remark][]) plugin to enable the extensions to
markdown that GitHub adds with GFM: autolink literals (`www.x.com`), footnotes
(`[^1]`), strikethrough (`~~stuff~~`), tables (`| cell |…`), and tasklists
(`* [x]`).
You can use this plugin to add support for parsing and serializing them.
These extensions by GitHub to CommonMark are called [GFM][] (GitHub Flavored
Markdown).

This plugin does not handle how markdown is turned to HTML.
That’s done by [`remark-rehype`][remark-rehype].
If your content is not in English and uses footnotes, you should configure that
plugin.
When generating HTML, you might also want to enable [`rehype-slug`][rehype-slug]
to add `id`s on headings.

A different plugin, [`remark-frontmatter`][remark-frontmatter], adds support for
frontmatter.
GitHub supports YAML frontmatter for files in repos and Gists but they don’t
treat it as part of GFM.

Another plugin, [`remark-github`][remark-github], adds support for how markdown
works in relation to a certain GitHub repo in comments, issues, PRs, and
releases, by linking references to commits, issues, and users.

Yet another plugin, [`remark-breaks`][remark-breaks], turns soft line endings
(enters) into hard breaks (`<br>`s).
GitHub does this in a few places (comments, issues, PRs, and releases).

## When should I use this?

This project is useful when you want to support the same features that GitHub
does in files in a repo, Gists, and several other places.
Users frequently believe that some of these extensions, specifically autolink
literals and tables, are part of normal markdown, so using `remark-gfm` will
help match your implementation to their understanding of markdown.
There are several edge cases where GitHub’s implementation works in unexpected
ways or even different than described in their spec, so *writing* in GFM is not
always the best choice.

If you *just* want to turn markdown into HTML (with maybe a few extensions such
as GFM), we recommend [`micromark`][micromark] with
[`micromark-extension-gfm`][micromark-extension-gfm] instead.
If you don’t use plugins and want to access the syntax tree, you can use
[`mdast-util-from-markdown`][mdast-util-from-markdown] with
[`mdast-util-gfm`][mdast-util-gfm].

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install remark-gfm
```

In Deno with [`esm.sh`][esmsh]:

```js
import remarkGfm from 'https://esm.sh/remark-gfm@4'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import remarkGfm from 'https://esm.sh/remark-gfm@4?bundle'
</script>
```

## Use

Say our document `example.md` contains:

```markdown
# GFM

## Autolink literals

www.example.com, https://example.com, and contact@example.com.

## Footnote

A note[^1]

[^1]: Big note.

## Strikethrough

~one~ or ~~two~~ tildes.

## Table

| a | b  |  c |  d  |
| - | :- | -: | :-: |

## Tasklist

* [ ] to do
* [x] done
```

…and our module `example.js` contains:

```js
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {read} from 'to-vfile'
import {unified} from 'unified'

const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(await read('example.md'))

console.log(String(file))
```

…then running `node example.js` yields:

```html
<h1>GFM</h1>
<h2>Autolink literals</h2>
<p><a href="http://www.example.com">www.example.com</a>, <a href="https://example.com">https://example.com</a>, and <a href="mailto:contact@example.com">contact@example.com</a>.</p>
<h2>Footnote</h2>
<p>A note<sup><a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup></p>
<h2>Strikethrough</h2>
<p><del>one</del> or <del>two</del> tildes.</p>
<h2>Table</h2>
<table>
<thead>
<tr>
<th>a</th>
<th align="left">b</th>
<th align="right">c</th>
<th align="center">d</th>
</tr>
</thead>
</table>
<h2>Tasklist</h2>
<ul class="contains-task-list">
<li class="task-list-item"><input type="checkbox" disabled> to do</li>
<li class="task-list-item"><input type="checkbox" checked disabled> done</li>
</ul>
<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>
<ol>
<li id="user-content-fn-1">
<p>Big note. <a href="#user-content-fnref-1" data-footnote-backref class="data-footnote-backref" aria-label="Back to content">↩</a></p>
</li>
</ol>
</section>
```

## API

This package exports no identifiers.
The default export is [`remarkGfm`][api-remark-gfm].

### `unified().use(remarkGfm[, options])`

Add support GFM (autolink literals, footnotes, strikethrough, tables,
tasklists).

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Nothing (`undefined`).

### `Options`

Configuration (TypeScript type).

###### Fields

* `firstLineBlank` (`boolean`, default: `false`)
  — serialize with a blank line for the first line of footnote definitions
* `stringLength` (`((value: string) => number)`, default: `d => d.length`)
  — detect the size of table cells, used when aligning cells
* `singleTilde` (`boolean`, default: `true`)
  — whether to support strikethrough with a single tilde;
  single tildes work on github.com, but are technically prohibited by GFM;
  you can always use 2 or more tildes for strikethrough
* `tablePipeAlign` (`boolean`, default: `true`)
  — whether to align table pipes
* `tableCellPadding` (`boolean`, default: `true`)
  — whether to add a space of padding between table pipes and cells

## Examples

### Example: `singleTilde`

To turn off support for parsing strikethrough with single tildes, pass
`singleTilde: false`:

```js
// …

const file = await unified()
  .use(remarkParse)
  .use(remarkGfm, {singleTilde: false})
  .use(remarkRehype)
  .use(rehypeStringify)
  .process('~one~ and ~~two~~')

console.log(String(file))
```

Yields:

```html
<p>~one~ and <del>two</del></p>
```

### Example: `stringLength`

It’s possible to align tables based on the visual width of cells.
First, let’s show the problem:

```js
import {remark} from 'remark'
import remarkGfm from 'remark-gfm'

const input = `| Alpha | Bravo |
| - | - |
| 中文 | Charlie |
| 👩‍❤️‍👩 | Delta |`

const file = await remark().use(remarkGfm).process(input)

console.log(String(file))
```

The above code shows how remark can be used to format markdown.
The output is as follows:

```markdown
| Alpha    | Bravo   |
| -------- | ------- |
| 中文       | Charlie |
| 👩‍❤️‍👩 | Delta   |
```

To improve the alignment of these full-width characters and emoji, pass a
`stringLength` function that calculates the visual width of cells.
One such algorithm is [`string-width`][string-width].
It can be used like so:

```diff
@@ -1,5 +1,6 @@
 import {remark} from 'remark'
 import remarkGfm from 'remark-gfm'
+import stringWidth from 'string-width'

@@ -10,7 +11,7 @@ async function main() {
 | 👩‍❤️‍👩 | Delta |`

-const file = await remark().use(remarkGfm).process(input)
+const file = await remark()
+  .use(remarkGfm, {stringLength: stringWidth})
+  .process(input)

   console.log(String(file))
```

The output of our code with these changes is as follows:

```markdown
| Alpha | Bravo   |
| ----- | ------- |
| 中文  | Charlie |
| 👩‍❤️‍👩    | Delta   |
```

## Bugs

For bugs present in GFM but not here, or other peculiarities that are
supported, see each corresponding readme:

* [autolink literal](https://github.com/micromark/micromark-extension-gfm-autolink-literal#bugs)
* [footnote](https://github.com/micromark/micromark-extension-gfm-footnote#bugs)
* strikethrough: n/a
* [table](https://github.com/micromark/micromark-extension-gfm-table#bugs)
* tasklists: n/a

## Authoring

For recommendations on how to author GFM, see each corresponding readme:

* [autolink literal](https://github.com/micromark/micromark-extension-gfm-autolink-literal#authoring)
* [footnote](https://github.com/micromark/micromark-extension-gfm-footnote#authoring)
* [strikethrough](https://github.com/micromark/micromark-extension-gfm-strikethrough#authoring)
* [table](https://github.com/micromark/micromark-extension-gfm-table#authoring)
* [tasklists](https://github.com/micromark/micromark-extension-gfm-task-list-item#authoring)

## HTML

This plugin does not handle how markdown is turned to HTML.
See [`remark-rehype`][remark-rehype] for how that happens and how to change it.

## CSS

For info on how GitHub styles these features, see each corresponding readme:

* [autolink literal](https://github.com/micromark/micromark-extension-gfm-autolink-literal#css)
* [footnote](https://github.com/micromark/micromark-extension-gfm-footnote#css)
* [strikethrough](https://github.com/micromark/micromark-extension-gfm-strikethrough#css)
* [table](https://github.com/micromark/micromark-extension-gfm-table#css)
* [tasklists](https://github.com/micromark/micromark-extension-gfm-task-list-item#css)

## Syntax

For info on the syntax of these features, see each corresponding readme:

* [autolink literal](https://github.com/micromark/micromark-extension-gfm-autolink-literal#syntax)
* [footnote](https://github.com/micromark/micromark-extension-gfm-footnote#syntax)
* [strikethrough](https://github.com/micromark/micromark-extension-gfm-strikethrough#syntax)
* [table](https://github.com/micromark/micromark-extension-gfm-table#syntax)
* [tasklists](https://github.com/micromark/micromark-extension-gfm-task-list-item#syntax)

## Syntax tree

For info on the syntax tree of these features, see each corresponding readme:

* [autolink literal](https://github.com/syntax-tree/mdast-util-gfm-autolink-literal#syntax-tree)
* [footnote](https://github.com/syntax-tree/mdast-util-gfm-footnote#syntax-tree)
* [strikethrough](https://github.com/syntax-tree/mdast-util-gfm-strikethrough#syntax-tree)
* [table](https://github.com/syntax-tree/mdast-util-gfm-table#syntax-tree)
* [tasklists](https://github.com/syntax-tree/mdast-util-gfm-task-list-item#syntax-tree)

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

The node types are supported in `@types/mdast` by default.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `remark-gfm@^4`, compatible
with Node.js 16.

This plugin works with `remark-parse` version 11+ (`remark` version 15+).
The previous version (v3) worked with `remark-parse` version 10 (`remark`
version 14).
Before that, v2 worked with `remark-parse` version 9 (`remark` version 13).
Earlier versions of `remark-parse` and `remark` had a `gfm` option that enabled
this functionality, which defaulted to true.

## Security

Use of `remark-gfm` does not involve **[rehype][]** ([hast][]) or user
content so there are no openings for [cross-site scripting (XSS)][wiki-xss]
attacks.

## Related

* [`remark-github`][remark-github]
  — link references to commits, issues, PRs, and users
* [`remark-breaks`][remark-breaks]
  — support breaks without needing spaces or escapes (enters to `<br>`)
* [`remark-frontmatter`][remark-frontmatter]
  — support frontmatter (YAML, TOML, and more)
* [`remark-directive`](https://github.com/remarkjs/remark-directive)
  — support directives
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

[api-options]: #options

[api-remark-gfm]: #unifieduseremarkgfm-options

[author]: https://wooorm.com

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/remarkjs/remark-gfm/actions

[build-badge]: https://github.com/remarkjs/remark-gfm/workflows/main/badge.svg

[chat]: https://github.com/remarkjs/remark/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[coc]: https://github.com/remarkjs/.github/blob/HEAD/code-of-conduct.md

[collective]: https://opencollective.com/unified

[contributing]: https://github.com/remarkjs/.github/blob/HEAD/contributing.md

[coverage]: https://codecov.io/github/remarkjs/remark-gfm

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-gfm.svg

[downloads]: https://www.npmjs.com/package/remark-gfm

[downloads-badge]: https://img.shields.io/npm/dm/remark-gfm.svg

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[gfm]: https://github.github.com/gfm/

[hast]: https://github.com/syntax-tree/hast

[health]: https://github.com/remarkjs/.github

[license]: license

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-gfm]: https://github.com/syntax-tree/mdast-util-gfm

[micromark]: https://github.com/micromark/micromark

[micromark-extension-gfm]: https://github.com/micromark/micromark-extension-gfm

[npm]: https://docs.npmjs.com/cli/install

[rehype]: https://github.com/rehypejs/rehype

[rehype-slug]: https://github.com/rehypejs/rehype-slug

[remark]: https://github.com/remarkjs/remark

[remark-breaks]: https://github.com/remarkjs/remark-breaks

[remark-frontmatter]: https://github.com/remarkjs/remark-frontmatter

[remark-github]: https://github.com/remarkjs/remark-github

[remark-rehype]: https://github.com/remarkjs/remark-rehype

[size]: https://bundlejs.com/?q=remark-gfm

[size-badge]: https://img.shields.io/bundlejs/size/remark-gfm

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[string-width]: https://github.com/sindresorhus/string-width

[support]: https://github.com/remarkjs/.github/blob/HEAD/support.md

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[wiki-xss]: https://en.wikipedia.org/wiki/Cross-site_scripting
