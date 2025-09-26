# micromark-extension-frontmatter

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[micromark][] extensions to support frontmatter (YAML, TOML, and more).

## Contents

*   [What is this?](#what-is-this)
*   [When to use this](#when-to-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`frontmatter(options?)`](#frontmatteroptions)
    *   [`frontmatterHtml(options?)`](#frontmatterhtmloptions)
    *   [`toMatters(options?)`](#tomattersoptions)
    *   [`Info`](#info)
    *   [`Matter`](#matter)
    *   [`Options`](#options)
    *   [`Preset`](#preset)
*   [Examples](#examples)
*   [Authoring](#authoring)
*   [HTML](#html)
*   [CSS](#css)
*   [Syntax](#syntax)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package contains two extensions that add support for frontmatter syntax
as often used in markdown to [`micromark`][micromark].

Frontmatter is a metadata format in front of the content.
It’s typically written in YAML and is often used with markdown.
Frontmatter does not work everywhere so it makes markdown less portable.

As there is no spec for frontmatter in markdown, these extensions follow how
YAML frontmatter works on `github.com`.
It can also parse TOML frontmatter, just like YAML except that it uses a `+`.

## When to use this

You can use these extensions when you are working with [`micromark`][micromark]
already.

When you need a syntax tree, you can combine this package with
[`mdast-util-frontmatter`][mdast-util-frontmatter].

All these packages are used [`remark-frontmatter`][remark-frontmatter], which
focusses on making it easier to transform content by abstracting these
internals away.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install micromark-extension-frontmatter
```

In Deno with [`esm.sh`][esmsh]:

```js
import {frontmatter, frontmatterHtml} from 'https://esm.sh/micromark-extension-frontmatter@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {frontmatter, frontmatterHtml} from 'https://esm.sh/micromark-extension-frontmatter@2?bundle'
</script>
```

## Use

Say our module `example.js` looks as follows:

```js
import {micromark} from 'micromark'
import {frontmatter, frontmatterHtml} from 'micromark-extension-frontmatter'

const output = micromark('---\na: b\n---\n# c', {
  extensions: [frontmatter()],
  htmlExtensions: [frontmatterHtml()]
})

console.log(output)
```

…now running `node example.js` yields:

```html
<h1>c</h1>
```

## API

This package exports the identifiers [`frontmatter`][api-frontmatter],
[`frontmatterHtml`][api-frontmatter-html], and [`toMatters`][api-to-matters].
There is no default export.

The export map supports the [`development` condition][development].
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition, production code is loaded.

### `frontmatter(options?)`

Create an extension for [`micromark`][micromark] to enable frontmatter syntax.

###### Parameters

*   `options` ([`Options`][api-options], default: `['yaml']`)
    — configuration

###### Returns

Extension for `micromark` that can be passed in `extensions`, to enable
frontmatter syntax ([`Extension`][micromark-extension]).

### `frontmatterHtml(options?)`

Create an extension for `micromark` to support frontmatter when serializing to
HTML.

> 👉 **Note**: this makes sure nothing is generated in the output HTML for
> frontmatter.

###### Parameters

*   `options` ([`Options`][api-options], default: `['yaml']`)
    — configuration

###### Returns

Extension for `micromark` that can be passed in `htmlExtensions`, to support
frontmatter when serializing to HTML
([`HtmlExtension`][micromark-html-extension]).

### `toMatters(options?)`

Simplify options by normalizing them to an array of matters.

###### Parameters

*   `options` ([`Options`][api-options], default: `['yaml']`)
    — configuration

###### Returns

List of matters ([`Array<Matter>`][api-matter]).

### `Info`

Sequence (TypeScript type).

Depending on how this structure is used, it reflects a marker or a fence.

###### Fields

*   `open` (`string`)
    — opening
*   `close` (`string`)
    — closing

### `Matter`

Fields describing a kind of matter (TypeScript type).

> 👉 **Note**: using `anywhere` is a terrible idea.
> It’s called frontmatter, not matter-in-the-middle or so.
> This makes your markdown less portable.

> 👉 **Note**: `marker` and `fence` are mutually exclusive.
> If `marker` is set, `fence` must not be set, and vice versa.

###### Fields

*   `type` (`string`)
    — node type to tokenize as
*   `marker` (`string` or [`Info`][api-info])
    — character repeated 3 times, used as complete fences
*   `fence` (`string` or [`Info`][api-info])
    — complete fences
*   `anywhere` (`boolean`, default: `false`)
    — whether matter can be found anywhere in the document, normally only
    matter at the start of the document is recognized

### `Options`

Configuration (TypeScript type).

###### Type

```ts
type Options = Array<Matter | Preset> | Matter | Preset
```

### `Preset`

Known name of a frontmatter style (TypeScript type).

*   `'yaml'` — [`Matter`][api-matter] defined as `{type: 'yaml', marker: '-'}`
*   `'toml'` — [`Matter`][api-matter] defined as `{type: 'toml', marker: '+'}`

###### Type

```ts
type Preset = 'toml' | 'yaml'
```

## Examples

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
It is typically stripped, which is what these extensions do.

## CSS

This package does not relate to CSS.

## Syntax

Frontmatter forms with the following BNF:

```bnf
frontmatter ::= fence_open *( eol *line ) eol fence_close
fence_open ::= sequence_open *space_or_tab
fence_close ::= sequence_close *space_or_tab
; Note: options can define custom sequences.
sequence_open ::= 3'+' | 3'-'
; Note: options can define custom sequences.
; Restriction: `sequence_close` must correspond to `sequence_open`.
sequence_close ::= 3'+' | 3'-'

; Character groups for informational purposes.
byte ::= 0x00..=0xFFFF
eol ::= '\n' | '\r' | '\r\n'
line ::= byte - eol
```

Frontmatter can only occur once.
It cannot occur in a container.
It must have a closing fence.
Like flow constructs, it must be followed by an eol (line ending) or
eof (end of file).

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`Info`][api-info], [`Matter`][api-matter],
[`Options`][api-options], [`Preset`][api-preset].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`micromark-extension-frontmatter@^2`, compatible with Node.js 16.

This package works with `micromark` version `3` and later.

## Security

This package is safe.

## Related

*   [`remark-frontmatter`][remark-frontmatter]
    — remark plugin using this to support frontmatter
*   [`mdast-util-frontmatter`][mdast-util-frontmatter]
    — mdast utility to support frontmatter

## Contribute

See [`contributing.md` in `micromark/.github`][contributing] for ways to get
started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/micromark/micromark-extension-frontmatter/workflows/main/badge.svg

[build]: https://github.com/micromark/micromark-extension-frontmatter/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-frontmatter.svg

[coverage]: https://codecov.io/github/micromark/micromark-extension-frontmatter

[downloads-badge]: https://img.shields.io/npm/dm/micromark-extension-frontmatter.svg

[downloads]: https://www.npmjs.com/package/micromark-extension-frontmatter

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=micromark-extension-frontmatter

[size]: https://bundlejs.com/?q=micromark-extension-frontmatter

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/micromark/micromark/discussions

[npm]: https://docs.npmjs.com/cli/install

[esmsh]: https://esm.sh

[license]: license

[author]: https://wooorm.com

[contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[support]: https://github.com/micromark/.github/blob/main/support.md

[coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[typescript]: https://www.typescriptlang.org

[development]: https://nodejs.org/api/packages.html#packages_resolving_user_conditions

[micromark]: https://github.com/micromark/micromark

[mdast-util-frontmatter]: https://github.com/syntax-tree/mdast-util-frontmatter

[remark-frontmatter]: https://github.com/remarkjs/remark-frontmatter

[micromark-extension]: https://github.com/micromark/micromark#syntaxextension

[micromark-html-extension]: https://github.com/micromark/micromark#htmlextension

[api-frontmatter]: #frontmatteroptions

[api-frontmatter-html]: #frontmatterhtmloptions

[api-to-matters]: #tomattersoptions

[api-info]: #info

[api-matter]: #matter

[api-options]: #options

[api-preset]: #preset
