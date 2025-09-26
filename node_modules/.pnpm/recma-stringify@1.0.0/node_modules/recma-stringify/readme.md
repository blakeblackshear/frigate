# recma-stringify

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]
[![Sponsors][badge-sponsors-image]][badge-collective-url]
[![Backers][badge-backers-image]][badge-collective-url]
[![Chat][badge-chat-image]][badge-chat-url]

**[recma][github-recma]** plugin to add support for serializing JavaScript.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(recmaStringify[, options])`](#unifieduserecmastringify-options)
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
defines how to take a syntax tree as input and turn it into JavaScript.
When it’s used,
JavaScript is serialized as the final result.

See [the monorepo readme][github-recma] for info on what the recma ecosystem is.

## When should I use this?

This plugin adds support to unified for serializing JavaScript.
If you also need to parse JavaScript,
you can alternatively use [`recma`][github-recma-core],
which combines unified,
this plugin,
and [`recma-parse`][github-recma-parse].

If you don’t use plugins and have access to the syntax tree,
you can directly use [`estree-util-to-js`][github-estree-util-to-js],
which is used inside this plugin.
recma focusses on making it easier to transform code by abstracting such
internals away.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npm-install]:

```sh
npm install recma-stringify
```

In Deno with [`esm.sh`][esmsh]:

```js
import recmaStringify from 'https://esm.sh/recma-stringify@1'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import recmaStringify from 'https://esm.sh/recma-stringify@1?bundle'
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
The default export is [`recmaStringify`][api-recma-stringify].

### `unified().use(recmaStringify[, options])`

Plugin to add support for serializing to JavaScript.

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Nothing (`undefined`).

### `Options`

Configuration (TypeScript type).

Same as [`Options`][github-estree-util-to-js-options]
from [`estree-util-to-js`][github-estree-util-to-js].
Passing `filePath` is not supported as it is handled for you.

## Syntax

JS is serialized according to [ECMA-262][tc39-ecma-262],
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
`recma-strignify@1`,
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

[api-recma-stringify]: #unifieduserecmastringify-options

[badge-backers-image]: https://opencollective.com/unified/backers/badge.svg

[badge-build-image]: https://github.com/mdx-js/recma/actions/workflows/main.yml/badge.svg

[badge-build-url]: https://github.com/mdx-js/recma/actions

[badge-collective-url]: https://opencollective.com/unified

[badge-coverage-image]: https://img.shields.io/codecov/c/github/mdx-js/recma.svg

[badge-coverage-url]: https://codecov.io/github/mdx-js/recma

[badge-downloads-image]: https://img.shields.io/npm/dm/recma-stringify.svg

[badge-downloads-url]: https://www.npmjs.com/package/recma-stringify

[badge-size-image]: https://img.shields.io/bundlejs/size/recma-stringify

[badge-size-url]: https://bundlejs.com/?q=recma-stringify

[badge-sponsors-image]: https://opencollective.com/unified/sponsors/badge.svg

[badge-chat-image]: https://img.shields.io/badge/chat-discussions-success.svg

[badge-chat-url]: https://github.com/mdx-js/mdx/discussions

[esmsh]: https://esm.sh

[file-license]: license

[github-esast]: https://github.com/syntax-tree/esast

[github-estree-util-to-js]: https://github.com/syntax-tree/estree-util-to-js

[github-estree-util-to-js-options]: https://github.com/syntax-tree/estree-util-to-js#options

[github-estree]: https://github.com/estree/estree

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-recma-core]: https://github.com/mdx-js/recma/tree/main/packages/recma

[github-recma-parse]: https://github.com/mdx-js/recma/tree/main/packages/recma-parse

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
