# rehype-recma

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]
[![Sponsors][badge-sponsors-image]][badge-collective-url]
[![Backers][badge-backers-image]][badge-collective-url]
[![Chat][badge-chat-image]][badge-chat-url]

**[rehype][github-rehype]** plugin to transform HTML to JS.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(rehypeRecma[, options])`](#unifieduserehyperecma-options)
  * [`Options`](#options)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][github-unified] ([rehype][github-rehype]) plugin
that can turn HTML into JavaScript.

## When should I use this?

Use this when you want to integrate static HTML into some JavaScript
application.

If you don’t use plugins and access syntax trees manually,
you can directly use [`hast-util-to-estree`][github-hast-util-to-estree],
which is used inside this plugin.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npm-install]:

```sh
npm install rehype-recma
```

In Deno with [`esm.sh`][esmsh]:

```js
import rehypeRecma from 'https://esm.sh/rehype-recma@1'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import rehypeRecma from 'https://esm.sh/rehype-recma@1?bundle'
</script>
```

## Use

Say we have the following module `example.js`:

```js
import recmaJsx from 'recma-jsx'
import recmaStringify from 'recma-stringify'
import rehypeParse from 'rehype-parse'
import rehypeRecma from 'rehype-recma'
import {unified} from 'unified'

const file = await unified()
  .use(rehypeParse, {fragment: true})
  .use(rehypeRecma)
  .use(recmaJsx)
  .use(recmaStringify)
  .process('<p>Hi!<h1>Hello!')

console.log(String(file))
```

…running that with `node example.js` yields:

```jsx
<><p>{"Hi!"}</p><h1>{"Hello!"}</h1></>;
```

## API

This package exports no identifiers.
The default export is [`rehypeRecma`][api-rehype-recma].

### `unified().use(rehypeRecma[, options])`

Plugin to transform HTML (hast) to JS (estree).

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Transform ([`Transformer`][github-unified-transformer]).

### `Options`

Configuration (TypeScript type).

Same as [`Options`][github-hast-util-to-estree-options]
from `hast-util-to-estree`.

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`rehype-recma@1`,
compatible with Node.js 16.

## Security

As **recma** works on JS and evaluating JS is unsafe,
use of recma can also be unsafe.
Do not evaluate unsafe code.

## Contribute

See [§ Contribute][mdxjs-contribute] on our site for ways to get started.
See [§ Support][mdxjs-support] for ways to get help.

This project has a [code of conduct][health-coc].
By interacting with this repository,
organization,
or community you agree to abide by its terms.

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[api-options]: #options

[api-rehype-recma]: #unifieduserehyperecma-options

[badge-backers-image]: https://opencollective.com/unified/backers/badge.svg

[badge-build-image]: https://github.com/mdx-js/recma/actions/workflows/main.yml/badge.svg

[badge-build-url]: https://github.com/mdx-js/recma/actions

[badge-collective-url]: https://opencollective.com/unified

[badge-coverage-image]: https://img.shields.io/codecov/c/github/mdx-js/recma.svg

[badge-coverage-url]: https://codecov.io/github/mdx-js/recma

[badge-downloads-image]: https://img.shields.io/npm/dm/rehype-recma.svg

[badge-downloads-url]: https://www.npmjs.com/package/rehype-recma

[badge-size-image]: https://img.shields.io/bundlejs/size/rehype-recma

[badge-size-url]: https://bundlejs.com/?q=rehype-recma

[badge-sponsors-image]: https://opencollective.com/unified/sponsors/badge.svg

[badge-chat-image]: https://img.shields.io/badge/chat-discussions-success.svg

[badge-chat-url]: https://github.com/mdx-js/mdx/discussions

[esmsh]: https://esm.sh

[file-license]: license

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-hast-util-to-estree-options]: https://github.com/syntax-tree/hast-util-to-estree#options

[github-hast-util-to-estree]: https://github.com/syntax-tree/hast-util-to-estree

[github-rehype]: https://github.com/rehypejs/rehype

[github-unified-transformer]: https://github.com/unifiedjs/unified#transformer

[github-unified]: https://github.com/unifiedjs/unified

[health-coc]: https://github.com/mdx-js/.github/blob/main/code-of-conduct.md

[mdxjs-contribute]: https://mdxjs.com/community/contribute/

[mdxjs-support]: https://mdxjs.com/community/support/

[npm-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
