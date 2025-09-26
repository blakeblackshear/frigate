# micromark-extension-mdx-md

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[micromark][] extension to turn some markdown features off for [MDX][mdxjs].

## Contents

*   [What is this?](#what-is-this)
*   [When to use this](#when-to-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`mdxMd()`](#mdxmd)
*   [Authoring](#authoring)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package contains an extension to turn off some markdown constructs when
parsing.

## When to use this

This project is useful when you want to disable support for code (indented),
autolinks, and HTML (flow and text) in markdown.

You can use this extension when you are working with [`micromark`][micromark].
To support all MDX features, use
[`micromark-extension-mdxjs`][micromark-extension-mdxjs] instead.

All these packages are used in [`remark-mdx`][remark-mdx], which focusses on
making it easier to transform content by abstracting these internals away.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install micromark-extension-mdx-md
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxMd} from 'https://esm.sh/micromark-extension-mdx-md@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxMd} from 'https://esm.sh/micromark-extension-mdx-md@2?bundle'
</script>
```

## Use

```js
import {micromark} from 'micromark'
import {mdxMd} from 'micromark-extension-mdx-md'

const output = micromark('\ta', {extensions: [mdxMd()]})

console.log(output)
```

Yields:

```html
<p>a</p>
```

## API

This package exports the identifier [`mdxMd`][api-mdx-md].
There is no default export.

### `mdxMd()`

Create an extension for `micromark` to disable some CommonMark syntax (code
(indented), autolinks, and HTML (flow and text)) for MDX.

###### Returns

Extension for `micromark` that can be passed in `extensions` to disable some
CommonMark syntax for MDX ([`Extension`][micromark-extension]).

## Authoring

To improve authoring the new constructs MDX adds (ESM, expressions, and
JSX), some markdown features are turned off by this extension.
There are good alternatives.

###### Code (indented)

Use fenced code instead.
Change the following markdown:

```markdown
    console.log(1)
```

…into:

````markdown
```js
console.log(1)
```
````

###### Autolinks

Use links (with a resource or a reference) instead.
Change the following markdown:

```markdown
<https://some-link-here.com>
```

…into:

```markdown
[descriptive text](https://and-the-link-here.com)
```

###### HTML (flow and text)

Use JSX instead: change `<img>` into `<img />`.
Not supporting HTML also means that HTML comments are not supported.
Use a comment in an empty expression instead.
Change `<!-- comment -->` into `{/* comment */}`.

## Types

This package is fully typed with [TypeScript][].
It exports no additional types.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `micromark-extension-mdx-md@^2`,
compatible with Node.js 16.
This package works with `micromark@^3`.

## Security

This package is safe.

## Related

*   [`micromark-extension-mdxjs`][micromark-extension-mdxjs]
    — support all of MDX
*   [`remark-mdx`][remark-mdx]
    — support all of MDX in remark

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

[build-badge]: https://github.com/micromark/micromark-extension-mdx-md/workflows/main/badge.svg

[build]: https://github.com/micromark/micromark-extension-mdx-md/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-mdx-md.svg

[coverage]: https://codecov.io/github/micromark/micromark-extension-mdx-md

[downloads-badge]: https://img.shields.io/npm/dm/micromark-extension-mdx-md.svg

[downloads]: https://www.npmjs.com/package/micromark-extension-mdx-md

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=micromark-extension-mdx-md

[size]: https://bundlejs.com/?q=micromark-extension-mdx-md

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

[mdxjs]: https://mdxjs.com

[micromark]: https://github.com/micromark/micromark

[micromark-extension]: https://github.com/micromark/micromark#syntaxextension

[micromark-extension-mdxjs]: https://github.com/micromark/micromark-extension-mdxjs

[remark-mdx]: https://mdxjs.com/packages/remark-mdx/

[api-mdx-md]: #mdxmd
