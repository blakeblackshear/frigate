# recma-build-jsx

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]
[![Sponsors][badge-sponsors-image]][badge-collective-url]
[![Backers][badge-backers-image]][badge-collective-url]
[![Chat][badge-chat-image]][badge-chat-url]

**[recma][github-recma]** plugin to add support for turning JSX (`<x />`)
into JavaScript (`React.createElement('x', {})` or `_jsx('x', {})`).

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(recmaBuildJsx[, options])`](#unifieduserecmabuildjsx-options)
  * [`Options`](#options)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][github-unified]
([recma][github-recma])
that can turn JSX into JavaScript.

## When should I use this?

Use this when preparing JSX for evaluation.
JSX cannot be evaluated without being transformed first.

If you don’t use plugins and access syntax trees manually,
you can directly use [`estree-util-build-jsx`][github-estree-util-build-jsx],
which is used inside this plugin.
recma focusses on making it easier to transform code by abstracting such
internals away.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npm-install]:

```sh
npm install recma-build-jsx
```

In Deno with [`esm.sh`][esmsh]:

```js
import recmaBuildJsx from 'https://esm.sh/recma-build-jsx@1'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import recmaBuildJsx from 'https://esm.sh/recma-build-jsx@1?bundle'
</script>
```

## Use

Say we have the following module `example.js`:

```js
import recmaBuildJsx from 'recma-build-jsx'
import recmaJsx from 'recma-jsx'
import recmaParse from 'recma-parse'
import recmaStringify from 'recma-stringify'
import {unified} from 'unified'

const file = await unified()
  .use(recmaParse)
  .use(recmaJsx)
  .use(recmaBuildJsx)
  .use(recmaStringify)
  .process('console.log(<em>Hi!</em>)')

console.log(String(file))
```

…running that with `node example.js` yields:

```js
console.log(React.createElement("em", null, "Hi!"));
```

## API

This package exports no identifiers.
The default export is [`recmaBuildJsx`][api-recma-build-jsx].

### `unified().use(recmaBuildJsx[, options])`

Plugin to build JSX.

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Transform ([`Transformer`][github-unified-transformer]).

### `Options`

Configuration (TypeScript type).

Same as [`Options`][github-estree-util-build-jsx-options]
from `estree-util-build-jsx`.
Passing `filePath` is not supported as it is handled for you.

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`recma-build-jsx@1`,
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

[api-recma-build-jsx]: #unifieduserecmabuildjsx-options

[badge-backers-image]: https://opencollective.com/unified/backers/badge.svg

[badge-build-image]: https://github.com/mdx-js/recma/actions/workflows/main.yml/badge.svg

[badge-build-url]: https://github.com/mdx-js/recma/actions

[badge-collective-url]: https://opencollective.com/unified

[badge-coverage-image]: https://img.shields.io/codecov/c/github/mdx-js/recma.svg

[badge-coverage-url]: https://codecov.io/github/mdx-js/recma

[badge-downloads-image]: https://img.shields.io/npm/dm/recma-build-jsx.svg

[badge-downloads-url]: https://www.npmjs.com/package/recma-build-jsx

[badge-size-image]: https://img.shields.io/bundlejs/size/recma-build-jsx

[badge-size-url]: https://bundlejs.com/?q=recma-build-jsx

[badge-sponsors-image]: https://opencollective.com/unified/sponsors/badge.svg

[badge-chat-image]: https://img.shields.io/badge/chat-discussions-success.svg

[badge-chat-url]: https://github.com/mdx-js/mdx/discussions

[esmsh]: https://esm.sh

[file-license]: license

[github-estree-util-build-jsx-options]: https://github.com/syntax-tree/estree-util-build-jsx#options

[github-estree-util-build-jsx]: https://github.com/syntax-tree/estree-util-build-jsx

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-recma]: https://github.com/mdx-js/recma

[github-unified-transformer]: https://github.com/unifiedjs/unified#transformer

[github-unified]: https://github.com/unifiedjs/unified

[health-coc]: https://github.com/mdx-js/.github/blob/main/code-of-conduct.md

[mdxjs-contribute]: https://mdxjs.com/community/contribute/

[mdxjs-support]: https://mdxjs.com/community/support/

[npm-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
