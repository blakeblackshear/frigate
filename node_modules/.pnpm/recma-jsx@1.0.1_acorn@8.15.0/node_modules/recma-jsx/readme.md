# recma-jsx

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]
[![Sponsors][badge-sponsors-image]][badge-collective-url]
[![Backers][badge-backers-image]][badge-collective-url]
[![Chat][badge-chat-image]][badge-chat-url]

**[recma][github-recma]** plugin to add support for parsing and serializing
[JSX][github-io-jsx].

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(recmaJsx)`](#unifieduserecmajsx)
* [Syntax](#syntax)
* [Syntax tree](#syntax-tree)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][github-unified]
([recma][github-recma])
that enables JSX.
You can use this plugin to add support for parsing and serializing it.

## When should I use this?

You can use this if you want to use `recma` and JSX.
You can also use [`acorn-jsx`][github-acorn-jsx] manually with
[`acorn`][github-acorn] for parsing.
And use the [`jsx`][github-estree-util-to-js-jsx] handlers from
[`estree-util-to-js`][github-estree-util-to-js] manually.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npm-install]:

```sh
npm install recma-jsx
```

In Deno with [`esm.sh`][esmsh]:

```js
import recmaJsx from 'https://esm.sh/recma-jsx@1'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import recmaJsx from 'https://esm.sh/recma-jsx@1?bundle'
</script>
```

## Use

Say we have the following module `example.js`:

```js
import recmaJsx from 'recma-jsx'
import recmaParse from 'recma-parse'
import recmaStringify from 'recma-stringify'
import {unified} from 'unified'

const file = await unified()
  .use(recmaParse)
  .use(recmaJsx)
  .use(recmaStringify)
  .process('console.log(<em>Hi!</em>)')

console.log(String(file))
```

…running that with `node example.js` yields:

```js
console.log(<em>Hi!</em>);
```

## API

This package exports no identifiers.
The default export is [`recmaJsx`][api-recma-jsx].

### `unified().use(recmaJsx)`

Plugin to add support for parsing and serializing JSX.

###### Parameters

There are no parameters.

###### Returns

Nothing (`undefined`).

## Syntax

JSX is parsed and serialized according to [`facebook/jsx`][github-io-jsx].

## Syntax tree

The syntax tree format used in recma is [esast][github-esast] and
[estree][github-estree].

## Types

This package is fully typed with [TypeScript][].
It exports no additional types.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`recma-jsx@1`,
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

[api-recma-jsx]: #unifieduserecmajsx

[badge-backers-image]: https://opencollective.com/unified/backers/badge.svg

[badge-build-image]: https://github.com/mdx-js/recma/actions/workflows/main.yml/badge.svg

[badge-build-url]: https://github.com/mdx-js/recma/actions

[badge-chat-image]: https://img.shields.io/badge/chat-discussions-success.svg

[badge-chat-url]: https://github.com/mdx-js/mdx/discussions

[badge-collective-url]: https://opencollective.com/unified

[badge-coverage-image]: https://img.shields.io/codecov/c/github/mdx-js/recma.svg

[badge-coverage-url]: https://codecov.io/github/mdx-js/recma

[badge-downloads-image]: https://img.shields.io/npm/dm/recma-jsx.svg

[badge-downloads-url]: https://www.npmjs.com/package/recma-jsx

[badge-size-image]: https://img.shields.io/bundlejs/size/recma-jsx

[badge-size-url]: https://bundlejs.com/?q=recma-jsx

[badge-sponsors-image]: https://opencollective.com/unified/sponsors/badge.svg

[esmsh]: https://esm.sh

[file-license]: license

[github-acorn]: https://github.com/acornjs/acorn

[github-acorn-jsx]: https://github.com/acornjs/acorn-jsx

[github-esast]: https://github.com/syntax-tree/esast

[github-estree]: https://github.com/estree/estree

[github-estree-util-to-js]: https://github.com/syntax-tree/estree-util-to-js

[github-estree-util-to-js-jsx]: https://github.com/syntax-tree/estree-util-to-js#jsx

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-io-jsx]: http://facebook.github.io/jsx/

[github-recma]: https://github.com/mdx-js/recma

[github-unified]: https://github.com/unifiedjs/unified

[health-coc]: https://github.com/mdx-js/.github/blob/main/code-of-conduct.md

[mdxjs-contribute]: https://mdxjs.com/community/contribute/

[mdxjs-support]: https://mdxjs.com/community/support/

[npm-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
