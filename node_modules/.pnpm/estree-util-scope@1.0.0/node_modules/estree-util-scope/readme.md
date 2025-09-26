# estree-util-scope

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[estree][] utility to check what’s defined in a scope.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`Scope`](#scope)
  * [`Visitors`](#visitors)
  * [`createVisitors()`](#createvisitors)
* [Examples](#examples)
  * [Example: just the top scope](#example-just-the-top-scope)
* [Compatibility](#compatibility)
* [Related](#related)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a utility that tracks what’s defined in a scope.

## When should I use this?

If you are walking an estree already and want to find out what’s defined,
use this.
If you have more complex scoping needs,
see [`eslint-scope`][github-eslint-scope].

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install estree-util-scope
```

In Deno with [`esm.sh`][esmsh]:

```js
import {createVisitors} from 'https://esm.sh/estree-util-scope@1'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {createVisitors} from 'https://esm.sh/estree-util-scope@1?bundle'
</script>
```

## Use

Say we have the following `example.js`:

```js
/**
 * @import {Program} from 'estree'
 */

import {Parser} from 'acorn'
import {createVisitors} from 'estree-util-scope'
import {walk} from 'estree-walker'

const tree = /** @type {Program} */ (
  Parser.parse('import {a} from "b"; const c = 1', {
    ecmaVersion: 'latest',
    sourceType: 'module'
  })
)
const visitors = createVisitors()

walk(tree, {enter: visitors.enter, leave: visitors.exit})

console.log(visitors.scopes.at(-1))
```

…now running `node example.js` yields:

```js
{ block: false, defined: [ 'a', 'c' ] }
```

## API

### `Scope`

Scope.

###### Fields

* `block` (`boolean`)
  — whether this is a block scope or not;
  blocks are things made by `for` and `try` and `if`;
  non-blocks are functions and the top-level scope
* `defined` (`Array<string>`)
  — identifiers that are defined in this scope

### `Visitors`

State to track what’s defined;
contains `enter`, `exit` callbacks you must call and `scopes`.

###### Fields

* `enter` (`(node: Node) => undefined`)
  — callback you must call when entering a node
* `exit` (`(node: Node) => undefined`)
  — callback you must call when exiting (leaving) a node
* `scopes` (`[topLevel: Scope, ...rest: Scope[]]`)
  — list of scopes;
  the first scope is the top-level scope;
  the last scope is the current scope

### `createVisitors()`

Create state to track what’s defined.

###### Parameters

There are no parameters.

###### Returns

State (`Visitors`).

## Examples

### Example: just the top scope

Sometimes, you only care about a top-scope.
Or otherwise want to skip a node.
How to do this depends on how you walk the tree.
With `estree-walker`,
you can skip by calling `this.skip`.

```js
/**
 * @import {Program} from 'estree'
 */

import {Parser} from 'acorn'
import {createVisitors} from 'estree-util-scope'
import {walk} from 'estree-walker'

const tree = /** @type {Program} */ (
  Parser.parse(
    'function a(b) { var c = 1; if (d) { var e = 2 } }; if (f) { var g = 2 }',
    {ecmaVersion: 'latest'}
  )
)
const visitors = createVisitors()

walk(tree, {
  enter(node) {
    visitors.enter(node)

    if (
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression'
    ) {
      this.skip()
      visitors.exit(node) // Call the exit handler manually.
    }
  },
  leave: visitors.exit
})

console.log(visitors.scopes.at(-1))
```

…yields:

```js
{ block: false, defined: [ 'a', 'g' ] }
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `estree-util-scope@1`,
compatible with Node.js 16.

## Related

## Security

This package is safe.

## Contribute

See [`contributing.md` in `syntax-tree/.github`][contributing] for ways to get
started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/estree-util-scope/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/estree-util-scope/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/estree-util-scope.svg

[coverage]: https://codecov.io/github/syntax-tree/estree-util-scope

[downloads-badge]: https://img.shields.io/npm/dm/estree-util-scope.svg

[downloads]: https://www.npmjs.com/package/estree-util-scope

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=estree-util-scope

[size]: https://bundlejs.com/?q=estree-util-scope

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[npm]: https://docs.npmjs.com/cli/install

[esmsh]: https://esm.sh

[license]: license

[author]: https://wooorm.com

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[estree]: https://github.com/estree/estree

[github-eslint-scope]: https://github.com/eslint/eslint-scope
