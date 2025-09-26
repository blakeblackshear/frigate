# remark-frontmatter

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[remark][]** plugin to support frontmatter (YAML, TOML, and more).

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`unified().use(remarkFrontmatter[, options])`](#unifieduseremarkfrontmatter-options)
    *   [`Options`](#options)
*   [Examples](#examples)
    *   [Example: different markers and fences](#example-different-markers-and-fences)
    *   [Example: frontmatter as metadata](#example-frontmatter-as-metadata)
    *   [Example: frontmatter in MDX](#example-frontmatter-in-mdx)
*   [Authoring](#authoring)
*   [HTML](#html)
*   [CSS](#css)
*   [Syntax](#syntax)
*   [Syntax tree](#syntax-tree)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a [unified][] ([remark][]) plugin to add support for YAML, TOML,
and other frontmatter.

Frontmatter is a metadata format in front of the content.
It’s typically written in YAML and is often used with markdown.

This plugin follow how GitHub handles frontmatter.
GitHub only supports YAML frontmatter, but this plugin also supports different
flavors (such as TOML).

## When should I use this?

You can use frontmatter when you want authors, that have some markup
experience, to configure where or how the content is displayed or supply
metadata about content, and know that the markdown is only used in places
that support frontmatter.
A good example use case is markdown being rendered by (static) site generators.

If you *just* want to turn markdown into HTML (with maybe a few extensions such
as frontmatter), we recommend [`micromark`][micromark] with
[`micromark-extension-frontmatter`][micromark-extension-frontmatter] instead.
If you don’t use plugins and want to access the syntax tree, you can use
[`mdast-util-from-markdown`][mdast-util-from-markdown] with
[`mdast-util-frontmatter`][mdast-util-frontmatter].

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install remark-frontmatter
```

In Deno with [`esm.sh`][esmsh]:

```js
import remarkFrontmatter from 'https://esm.sh/remark-frontmatter@5'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import remarkFrontmatter from 'https://esm.sh/remark-frontmatter@5?bundle'
</script>
```

## Use

Say our document `example.md` contains:

```markdown
+++
layout = "solar-system"
+++

# Jupiter
```

…and our module `example.js` contains:

```js
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import {unified} from 'unified'
import {read} from 'to-vfile'

const file = await unified()
  .use(remarkParse)
  .use(remarkStringify)
  .use(remarkFrontmatter, ['yaml', 'toml'])
  .use(function () {
    return function (tree) {
      console.dir(tree)
    }
  })
  .process(await read('example.md'))

console.log(String(file))
```

…then running `node example.js` yields:

```js
{
  type: 'root',
  children: [
    {type: 'toml', value: 'layout = "solar-system"', position: [Object]},
    {type: 'heading', depth: 1, children: [Array], position: [Object]}
  ],
  position: {
    start: {line: 1, column: 1, offset: 0},
    end: {line: 6, column: 1, offset: 43}
  }
}
```

```markdown
+++
layout = "solar-system"
+++

# Jupiter
```

## API

This package exports no identifiers.
The default export is [`remarkFrontmatter`][api-remark-frontmatter].

### `unified().use(remarkFrontmatter[, options])`

Add support for frontmatter.

###### Parameters

*   `options` ([`Options`][api-options], default: `'yaml'`)
    — configuration

###### Returns

Nothing (`undefined`).

###### Notes

Doesn’t parse the data inside them:
[create your own plugin][unified-create-plugin] to do that.

### `Options`

Configuration (TypeScript type).

###### Type

```ts
type Options = Array<Matter | Preset> | Matter | Preset

/**
 * Sequence.
 *
 * Depending on how this structure is used, it reflects a marker or a fence.
 */
export type Info = {
  /**
   * Closing.
   */
  close: string
  /**
   * Opening.
   */
  open: string
}

/**
 * Fence configuration.
 */
type FenceProps = {
  /**
   * Complete fences.
   *
   * This can be used when fences contain different characters or lengths
   * other than 3.
   * Pass `open` and `close` to interface to specify different characters for opening and
   * closing fences.
   */
  fence: Info | string
  /**
   * If `fence` is set, `marker` must not be set.
   */
  marker?: never
}

/**
 * Marker configuration.
 */
type MarkerProps = {
  /**
   * Character repeated 3 times, used as complete fences.
   *
   * For example the character `'-'` will result in `'---'` being used as the
   * fence
   * Pass `open` and `close` to specify different characters for opening and
   * closing fences.
   */
  marker: Info | string
  /**
   * If `marker` is set, `fence` must not be set.
   */
  fence?: never
}

/**
 * Fields describing a kind of matter.
 *
 * > 👉 **Note**: using `anywhere` is a terrible idea.
 * > It’s called frontmatter, not matter-in-the-middle or so.
 * > This makes your markdown less portable.
 *
 * > 👉 **Note**: `marker` and `fence` are mutually exclusive.
 * > If `marker` is set, `fence` must not be set, and vice versa.
 */
type Matter = (MatterProps & FenceProps) | (MatterProps & MarkerProps)

/**
 * Fields describing a kind of matter.
 */
type MatterProps = {
  /**
   * Node type to tokenize as.
   */
  type: string
  /**
   * Whether matter can be found anywhere in the document, normally, only matter
   * at the start of the document is recognized.
   *
   * > 👉 **Note**: using this is a terrible idea.
   * > It’s called frontmatter, not matter-in-the-middle or so.
   * > This makes your markdown less portable.
   */
  anywhere?: boolean | null | undefined
}

/**
 * Known name of a frontmatter style.
 */
type Preset = 'toml' | 'yaml'
```

## Examples

### Example: different markers and fences

Here are a couple of example of different matter objects and what frontmatter
they match.

To match frontmatter with the same opening and closing fence, namely three of
the same markers, use for example `{type: 'yaml', marker: '-'}`, which matches:

```yaml
---
key: value
---
```

To match frontmatter with different opening and closing fences, which each use
three different markers, use for example
`{type: 'custom', marker: {open: '<', close: '>'}}`, which matches:

```text
<<<
data
>>>
```

To match frontmatter with the same opening and closing fences, which both use
the same custom string, use for example `{type: 'custom', fence: '+=+=+=+'}`,
which matches:

```text
+=+=+=+
data
+=+=+=+
```

To match frontmatter with different opening and closing fences, which each use
different custom strings, use for example
`{type: 'json', fence: {open: '{', close: '}'}}`, which matches:

```json
{
  "key": "value"
}
```

### Example: frontmatter as metadata

This plugin handles the syntax of frontmatter in markdown.
It does not *parse* that frontmatter as say YAML or TOML and expose it
somewhere.

In unified, there is a place for metadata about files:
[`file.data`][vfile-file-data].
For frontmatter specifically, it’s customary to expose parsed data at `file.data.matter`.

We can make a plugin that does this.
This example uses the utility [`vfile-matter`][vfile-matter], which is specific
to YAML.
To support other data languages, look at this utility for inspiration.

`my-unified-plugin-handling-yaml-matter.js`:

```js
/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('vfile').VFile} VFile
 */

import {matter} from 'vfile-matter'

/**
 * Parse YAML frontmatter and expose it at `file.data.matter`.
 *
 * @returns
 *   Transform.
 */
export default function myUnifiedPluginHandlingYamlMatter() {
  /**
   * Transform.
   *
   * @param {Node} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree, file) {
    matter(file)
  }
}
```

…with an example markdown file `example.md`:

```markdown
---
key: value
---

# Venus
```

…and using the plugin with an `example.js` containing:

```js
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkStringify from 'remark-stringify'
import {read} from 'to-vfile'
import {unified} from 'unified'
import myUnifiedPluginHandlingYamlMatter from './my-unified-plugin-handling-yaml-matter.js'

const file = await unified()
  .use(remarkParse)
  .use(remarkStringify)
  .use(remarkFrontmatter)
  .use(myUnifiedPluginHandlingYamlMatter)
  .process(await read('example.md'))

console.log(file.data.matter) // => {key: 'value'}
```

### Example: frontmatter in MDX

MDX has the ability to export data from it, where markdown does not.
When authoring MDX, you can write `export` statements and expose arbitrary data
through them.
It is also possible to write frontmatter, and let a plugin turn those into
export statements.

To automatically turn frontmatter into export statements, use
[`remark-mdx-frontmatter`][remark-mdx-frontmatter].

With an `example.mdx` as follows:

```mdx
---
key: value
---

# Mars
```

This plugin can be used as follows:

```js
import {compile} from '@mdx-js/mdx'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import {read, write} from 'to-vfile'

const file = await compile(await read('example.mdx'), {
  remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, {name: 'matter'}]]
})
file.path = 'output.js'
await write(file)

const mod = await import('./output.js')
console.log(mod.matter) // => {key: 'value'}
```

## Authoring

When authoring markdown with frontmatter, it’s recommended to use YAML
frontmatter if possible.
While YAML has some warts, it works in the most places, so using it guarantees
the highest chance of portability.

In certain ecosystems, other flavors are widely used.
For example, in the Rust ecosystem, TOML is often used.
In such cases, using TOML is an okay choice.

When possible, do not use other types of frontmatter, and do not allow
frontmatter anywhere.

## HTML

Frontmatter does not relate to HTML elements.
It is typically stripped, which is what [`remark-rehype`][remark-rehype] does.

## CSS

This package does not relate to CSS.

## Syntax

See [*Syntax* in
`micromark-extension-frontmatter`](https://github.com/micromark/micromark-extension-frontmatter#syntax).

## Syntax tree

See [*Syntax tree* in
`mdast-util-frontmatter`](https://github.com/syntax-tree/mdast-util-frontmatter#syntax-tree).

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

The YAML node type is supported in `@types/mdast` by default.
To add other node types, register them by adding them to
`FrontmatterContentMap`:

```ts
import type {Data, Literal} from 'mdast'

interface Toml extends Literal {
  type: 'toml'
  data?: TomlData
}

declare module 'mdast' {
  interface FrontmatterContentMap {
    // Allow using TOML nodes defined by `remark-frontmatter`.
    toml: Toml
  }
}
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `remark-frontmatter@^5`,
compatible with Node.js 16.

This plugin works with unified 6+ and remark 13+.

## Security

Use of `remark-frontmatter` does not involve **[rehype][]** ([hast][]) or user
content so there are no openings for [cross-site scripting (XSS)][wiki-xss]
attacks.

## Related

*   [`remark-yaml-config`](https://github.com/remarkjs/remark-yaml-config)
    — configure remark from YAML configuration
*   [`remark-gfm`](https://github.com/remarkjs/remark-gfm)
    — support GFM (autolink literals, footnotes, strikethrough, tables,
    tasklists)
*   [`remark-mdx`](https://github.com/mdx-js/mdx/tree/main/packages/remark-mdx)
    — support MDX (ESM, JSX, expressions)
*   [`remark-directive`](https://github.com/remarkjs/remark-directive)
    — support directives
*   [`remark-math`](https://github.com/remarkjs/remark-math)
    — support math

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

[build-badge]: https://github.com/remarkjs/remark-frontmatter/workflows/main/badge.svg

[build]: https://github.com/remarkjs/remark-frontmatter/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-frontmatter.svg

[coverage]: https://codecov.io/github/remarkjs/remark-frontmatter

[downloads-badge]: https://img.shields.io/npm/dm/remark-frontmatter.svg

[downloads]: https://www.npmjs.com/package/remark-frontmatter

[size-badge]: https://img.shields.io/bundlejs/size/remark-frontmatter

[size]: https://bundlejs.com/?q=remark-frontmatter

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

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-frontmatter]: https://github.com/syntax-tree/mdast-util-frontmatter

[micromark]: https://github.com/micromark/micromark

[micromark-extension-frontmatter]: https://github.com/micromark/micromark-extension-frontmatter

[hast]: https://github.com/syntax-tree/hast

[rehype]: https://github.com/rehypejs/rehype

[remark]: https://github.com/remarkjs/remark

[remark-rehype]: https://github.com/remarkjs/remark-rehype

[remark-mdx-frontmatter]: https://github.com/remcohaszing/remark-mdx-frontmatter

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[unified-create-plugin]: https://unifiedjs.com/learn/guide/create-a-plugin/

[vfile-file-data]: https://github.com/vfile/vfile#filedata

[vfile-matter]: https://github.com/vfile/vfile-matter

[wiki-xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[api-options]: #options

[api-remark-frontmatter]: #unifieduseremarkfrontmatter-options
