# recma-parse

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]
[![Sponsors][badge-sponsors-image]][badge-collective-url]
[![Backers][badge-backers-image]][badge-collective-url]
[![Chat][badge-chat-image]][badge-chat-url]

**[recma][github-recma]** plugin to add support for parsing JavaScript.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(recmaParse[, options])`](#unifieduserecmaparse-options)
  * [`Options`](#options)
* [Syntax](#syntax)
* [Syntax tree](#syntax-tree)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][github-unified] ([recma][github-recma]) plugin that
defines how to take JavaScript as input and turn it into a syntax tree.
When it’s used,
JavaScript can be parsed and other recma plugins can be used.

See [the monorepo readme][github-recma] for info on what the recma ecosystem is.

## When should I use this?

This plugin adds support to unified for parsing JavaScript.
If you also need to serialize JavaScript,
you can alternatively use [`recma`][github-recma-core],
which combines unified,
this plugin,
and [`recma-stringify`][github-recma-stringify].

If you don’t use plugins and want to access the syntax tree,
you can directly use [`esast-util-from-js`][github-esast-util-from-js],
which is used inside this plugin.
recma focusses on making it easier to transform code by abstracting such
internals away.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npm-install]:

```sh
npm install recma-parse
```

In Deno with [`esm.sh`][esmsh]:

```js
import recmaParse from 'https://esm.sh/recma-parse@1'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import recmaParse from 'https://esm.sh/recma-parse@1?bundle'
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
The default export is [`recmaParse`][api-recma-parse].

### `unified().use(recmaParse[, options])`

Plugin to add support for parsing from JavaScript.

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Nothing (`undefined`).

### `Options`

Configuration (TypeScript type).

Same as [`Options`][github-esast-util-from-js-options]
from [`esast-util-from-js`][github-esast-util-from-js].

## Syntax

JS is parsed according to [ECMA-262][tc39-ecma-262],
which is also followed by all browsers and engines such as Node.js.

## Syntax tree

The syntax tree format used in recma is [esast][github-esast] and
[estree][github-estree].

## Types

This package is fully typed with [TypeScript][].
It exports the additional type
[`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`recma-parse@1`,
compatible with Node.js 16.

## Security

As **recma** works on JS and evaluating JS is unsafe,
use of recma can also be unsafe.
Do not evaluate unsafe code.

Use of recma plugins could also open you up to other attacks.
Carefully assess each plugin and the risks involved in using them.

For info on how to submit a report, see our [security policy][health-security].

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

[api-recma-parse]: #unifieduserecmaparse-options

[badge-backers-image]: https://opencollective.com/unified/backers/badge.svg

[badge-build-image]: https://github.com/mdx-js/recma/actions/workflows/main.yml/badge.svg

[badge-build-url]: https://github.com/mdx-js/recma/actions

[badge-collective-url]: https://opencollective.com/unified

[badge-coverage-image]: https://img.shields.io/codecov/c/github/mdx-js/recma.svg

[badge-coverage-url]: https://codecov.io/github/mdx-js/recma

[badge-downloads-image]: https://img.shields.io/npm/dm/recma-parse.svg

[badge-downloads-url]: https://www.npmjs.com/package/recma-parse

[badge-size-image]: https://img.shields.io/bundlejs/size/recma-parse

[badge-size-url]: https://bundlejs.com/?q=recma-parse

[badge-sponsors-image]: https://opencollective.com/unified/sponsors/badge.svg

[badge-chat-image]: https://img.shields.io/badge/chat-discussions-success.svg

[badge-chat-url]: https://github.com/mdx-js/mdx/discussions

[esmsh]: https://esm.sh

[file-license]: license

[github-esast]: https://github.com/syntax-tree/esast

[github-esast-util-from-js]: https://github.com/syntax-tree/esast-util-from-js

[github-esast-util-from-js-options]: https://github.com/syntax-tree/esast-util-from-js#options

[github-estree]: https://github.com/estree/estree

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-recma-core]: https://github.com/mdx-js/recma/tree/main/packages/recma

[github-recma-stringify]: https://github.com/mdx-js/recma/tree/main/packages/recma-stringify

[github-recma]: https://github.com/mdx-js/recma

[github-unified]: https://github.com/unifiedjs/unified

[health-coc]: https://github.com/mdx-js/.github/blob/main/code-of-conduct.md

[health-security]: https://github.com/mdx-js/.github/blob/main/security.md

[mdxjs-contribute]: https://mdxjs.com/community/contribute/

[mdxjs-support]: https://mdxjs.com/community/support/

[npm-install]: https://docs.npmjs.com/cli/install

[tc39-ecma-262]: https://tc39.es/ecma262/multipage/

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
