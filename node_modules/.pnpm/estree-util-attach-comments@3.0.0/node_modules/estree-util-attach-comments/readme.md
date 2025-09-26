# estree-util-attach-comments

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[estree][] utility attach semistandard comment nodes (such as from [acorn][]) to
the nodes in that tree.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`attachComments(tree, comments)`](#attachcommentstree-comments)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that you can use to embed comment nodes *inside* a
tree.
This is useful because certain estree parsers give you an array (espree and
acorn) whereas other estree tools expect comments to be embedded on nodes in the
tree.

This package uses one `comments` array where each comment has `leading` and
`trailing` fields, as applied by `acorn`, but does not support the slightly
different non-standard comments made by `espree`.

## When should I use this?

You can use this package when working with comments from Acorn and later working
with a tool such as recast or Babel.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install estree-util-attach-comments
```

In Deno with [`esm.sh`][esmsh]:

```js
import {attachComments} from 'https://esm.sh/estree-util-attach-comments@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {attachComments} from 'https://esm.sh/estree-util-attach-comments@3?bundle'
</script>
```

## Use

Say our document `x.js` contains:

```js
/* 1 */ function /* 2 */ a /* 3 */(/* 4 */ b) /* 5 */ {
  /* 6 */ return /* 7 */ b + /* 8 */ 1 /* 9 */
}
```

…and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import {parse} from 'acorn'
import {attachComments} from 'estree-util-attach-comments'
import recast from 'recast'

const code = String(await fs.readFile('x.js'))
const comments = []
const tree = parse(code, {
  sourceType: 'module',
  ecmaVersion: 'latest',
  onComment: comments
})

attachComments(tree, comments)

console.log(recast.print(tree).code)
```

Yields:

```js
/* 1 */
function /* 2 */
a(
    /* 3 */
    /* 4 */
    b
) /* 5 */
{
    /* 6 */
    return (
        /* 7 */
        b + /* 8 */
        1
    );
}/* 9 */
```

> 👉 **Note**: the lines are added by `recast` in this case.
> And, some of these weird comments are off, but they’re pretty close.

## API

This package exports the identifier [`attachComments`][api-attach-comments].
There is no default export.

### `attachComments(tree, comments)`

Attach semistandard estree comment nodes to the tree.

This mutates the given [`tree`][estree].
It takes `comments`, walks the tree, and adds comments as close as possible
to where they originated.

Comment nodes are given two boolean fields: `leading` (`true` for `/* a */ b`)
and `trailing` (`true` for `a /* b */`).
Both fields are `false` for dangling comments: `[/* a */]`.
This is what `recast` uses too, and is somewhat similar to Babel, which is not
estree but instead uses `leadingComments`, `trailingComments`, and
`innerComments` arrays on nodes.

The algorithm checks any node: even recent (or future) proposals or nonstandard
syntax such as JSX, because it ducktypes to find nodes instead of having a list
of visitor keys.

The algorithm supports `loc` fields (line/column), `range` fields (offsets),
and direct `start` / `end` fields.

###### Parameters

*   `tree` ([`Program`][program])
    — tree to attach to
*   `comments` (`Array<EstreeComment>`)
    — list of comments

###### Returns

Nothing (`undefined`).

## Types

This package is fully typed with [TypeScript][].
It exports no additional types.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`estree-util-attach-comments@^3`, compatible with Node.js 16.

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/estree-util-attach-comments/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/estree-util-attach-comments/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/estree-util-attach-comments.svg

[coverage]: https://codecov.io/github/syntax-tree/estree-util-attach-comments

[downloads-badge]: https://img.shields.io/npm/dm/estree-util-attach-comments.svg

[downloads]: https://www.npmjs.com/package/estree-util-attach-comments

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=estree-util-attach-comments

[size]: https://bundlejs.com/?q=estree-util-attach-comments

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[license]: license

[author]: https://wooorm.com

[health]: https://github.com/syntax-tree/.github

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[acorn]: https://github.com/acornjs/acorn

[estree]: https://github.com/estree/estree

[program]: https://github.com/estree/estree/blob/master/es5.md#programs

[api-attach-comments]: #attachcommentstree-comments
