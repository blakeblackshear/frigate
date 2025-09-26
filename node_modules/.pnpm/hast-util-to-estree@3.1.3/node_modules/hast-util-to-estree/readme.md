# hast-util-to-estree

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]

[hast][github-hast] utility to transform to [estree][github-estree] (JSX).

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`toEstree(tree[, options])`](#toestreetree-options)
  * [`defaultHandlers`](#defaulthandlers)
  * [`ElementAttributeNameCase`](#elementattributenamecase)
  * [`Handle`](#handle)
  * [`Options`](#options)
  * [`Space`](#space)
  * [`State`](#state)
  * [`StylePropertyNameCase`](#stylepropertynamecase)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a utility that takes a
[hast][github-hast] (HTML)
syntax tree as input and turns it into an
[estree][github-estree] (JavaScript)
syntax tree (with a JSX extension).
This package also supports embedded MDX nodes.

## When should I use this?

This project is useful when you want to embed HTML as JSX inside JS while
working with syntax trees.
This is used in [MDX][mdxjs].

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+), install with [npm][npmjs-install]:

```sh
npm install hast-util-to-estree
```

In Deno with [`esm.sh`][esmsh]:

```js
import {toEstree} from 'https://esm.sh/hast-util-to-estree@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {toEstree} from 'https://esm.sh/hast-util-to-estree@3?bundle'
</script>
```

## Use

Say our module `example.html` contains:

```html
<!doctype html>
<html lang=en>
<title>Hi!</title>
<link rel=stylesheet href=index.css>
<h1>Hello, world!</h1>
<a download style="width:1;height:10px"></a>
<!--commentz-->
<svg xmlns="http://www.w3.org/2000/svg">
  <title>SVG `&lt;ellipse&gt;` element</title>
  <ellipse
    cx="120"
    cy="70"
    rx="100"
    ry="50"
  />
</svg>
<script src="index.js"></script>
```

…and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import {jsx, toJs} from 'estree-util-to-js'
import {fromHtml} from 'hast-util-from-html'
import {toEstree} from 'hast-util-to-estree'

const hast = fromHtml(await fs.readFile('example.html'))

const estree = toEstree(hast)

console.log(toJs(estree, {handlers: jsx}).value)
```

…now running `node example.js` (and prettier) yields:

```js
/* Commentz */
;<>
  <html lang="en">
    <head>
      <title>{'Hi!'}</title>
      {'\n'}
      <link rel="stylesheet" href="index.css" />
      {'\n'}
    </head>
    <body>
      <h1>{'Hello, world!'}</h1>
      {'\n'}
      <a
        download
        style={{
          width: '1',
          height: '10px'
        }}
      />
      {'\n'}
      {}
      {'\n'}
      <svg xmlns="http://www.w3.org/2000/svg">
        {'\n  '}
        <title>{'SVG `<ellipse>` element'}</title>
        {'\n  '}
        <ellipse cx="120" cy="70" rx="100" ry="50" />
        {'\n'}
      </svg>
      {'\n'}
      <script src="index.js" />
      {'\n'}
    </body>
  </html>
</>
```

## API

This package exports the identifiers [`defaultHandlers`][api-default-handlers]
and [`toEstree`][api-to-estree].
There is no default export.

### `toEstree(tree[, options])`

Transform a hast tree (with embedded MDX nodes) into an estree (with JSX
nodes).

##### Notes

###### Comments

Comments are attached to the tree in their neighbouring nodes (`recast`,
`babel` style) and also added as a `comments` array on the program node
(`espree` style).
You may have to do `program.comments = undefined` for certain compilers.

###### Frameworks

There are differences between what JSX frameworks accept, such as whether they
accept `class` or `className`, or `background-color` or `backgroundColor`.

For JSX components written in MDX, the author has to be aware of this
difference and write code accordingly.
For hast elements transformed by this project, this will be handled through
options.

| Framework | `elementAttributeNameCase` | `stylePropertyNameCase` |
| --------- | -------------------------- | ----------------------- |
| Preact    | `'html'`                   | `'dom'`                 |
| React     | `'react'`                  | `'dom'`                 |
| Solid     | `'html'`                   | `'css'`                 |
| Vue       | `'html'`                   | `'dom'`                 |

###### Parameters

* `tree` ([`HastNode`][github-hast-nodes])
  — hast tree
* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

estree program node ([`Program`][github-estree-program]).

The program’s last child in `body` is most likely an `ExpressionStatement`,
whose expression is a `JSXFragment` or a `JSXElement`.

Typically, there is only one node in `body`, however, this utility also supports
embedded MDX nodes in the HTML
(when [`mdast-util-mdx`][github-mdast-util-mdx] is used with mdast to parse
markdown before passing its nodes through to hast).
When MDX ESM import/exports are used, those nodes are added before the fragment
or element in body.

There aren’t many great estree serializers out there that support JSX.
To do that, you can use [`estree-util-to-js`][github-estree-util-to-js].
Or, use [`estree-util-build-jsx`][github-estree-util-build-jsx]
to turn JSX into function calls,
and then serialize with whatever (`astring`, `escodegen`).

### `defaultHandlers`

Default handlers for elements (`Record<string, Handle>`).

Each key is a node type, each value is a [`Handle`][api-handle].

### `ElementAttributeNameCase`

Specify casing to use for attribute names (TypeScript type).

HTML casing is for example `class`, `stroke-linecap`, `xml:lang`.
React casing is for example `className`, `strokeLinecap`, `xmlLang`.

###### Type

```ts
type ElementAttributeNameCase = 'html' | 'react'
```

### `Handle`

Turn a hast node into an estree node (TypeScript type).

###### Parameters

* `node` ([`HastNode`][github-hast-nodes])
  — expected hast node
* `state` ([`State`][api-state])
  — info passed around about the current state

###### Returns

JSX child (`JsxChild`, optional).

You can also add more results to `state.esm` and `state.comments`.

### `Options`

Configuration (TypeScript type).

###### Fields

* `elementAttributeNameCase`
  ([`ElementAttributeNameCase`][api-element-attribute-name-case], default:
  `'react'`)
  — specify casing to use for attribute names; this casing is used for hast
  elements, not for embedded MDX JSX nodes (components that someone authored
  manually)
* `handlers` (`Record<string, Handle>`, optional)
  — custom handlers
* `space` ([`Space`][api-space], default: `'html'`)
  — which space the document is in; when an `<svg>` element is found in the
  HTML space, this package already automatically switches to and from the SVG
  space when entering and exiting it
* `stylePropertyNameCase`
  ([`StylePropertyNameCase`][api-style-property-name-case],
  default: `'dom'`)
  — specify casing to use for property names in `style` objects; this casing
  is used for hast elements, not for embedded MDX JSX nodes (components that
  someone authored manually)
* `tableCellAlignToStyle` (`boolean`, default: `true`)
  — turn obsolete `align` props on `td` and `th` into CSS `style` props

### `Space`

Namespace (TypeScript type).

###### Type

```ts
type Space = 'html' | 'svg'
```

### `State`

Info passed around about the current state (TypeScript type).

###### Fields

* `all` (`(node: HastParent) => EstreeJsxChild | undefined`)
  — transform children of a hast parent to estree
* `comments` (`Array<EstreeComment>`)
  — list of estree comments
* `createJsxAttributeName` (`(name: string) => EstreeJsxAttributeName`)
  — create a JSX attribute name
* `createJsxElementName` (`(name: string) => EstreeJsxElementName`)
  — create a JSX attribute name
* `elementAttributeNameCase`
  ([`ElementAttributeNameCase`][api-element-attribute-name-case])
  — casing to use for attribute names
* `esm` (`Array<EstreeNode>`)
  — list of top-level estree nodes
* `handle` (`(node: HastNode) => EstreeJsxChild | undefined`)
  — transform a hast node to estree
* `inherit` (`(from: HastNode, to: EstreeNode) => undefined`)
  — take positional info and data from `from` (use `patch` if you don’t want
  data)
* `patch` (`(from: HastNode, to: EstreeNode) => undefined`)
  — take positional info from `from` (use `inherit` if you also want data)
* `schema` ([`Schema`][github-property-information-schema])
  — current schema
* `stylePropertyNameCase`
  ([`StylePropertyNameCase`][api-style-property-name-case])
  — casing for property names in `style` objects
* `tableCellAlignToStyle` (`boolean`)
  — turn obsolete `align` props on `td` and `th` into CSS `style` props

### `StylePropertyNameCase`

Casing to use for property names in `style` objects (TypeScript type).

CSS casing is for example `background-color` and `-webkit-line-clamp`.
DOM casing is for example `backgroundColor` and `WebkitLineClamp`.

###### Type

```ts
type StylePropertyNameCase = 'css' | 'dom'
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional types
[`ElementAttributeNameCase`][api-element-attribute-name-case],
[`Handle`][api-handle], [`Options`][api-options],
[`Space`][api-space], [`State`][api-state], and
[`StylePropertyNameCase`][api-style-property-name-case].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `hast-util-to-estree@^3`,
compatible with Node.js 16.

## Security

You’re working with JavaScript.
It’s not safe.

## Related

* [`estree-util-build-jsx`][github-estree-util-build-jsx]
  — transform JSX to function calls
* [`hastscript`][github-hastscript]
  — hyperscript compatible interface for creating nodes
* [`hast-util-from-dom`](https://github.com/syntax-tree/hast-util-from-dom)
  — transform a DOM tree to hast

## Contribute

See [`contributing.md`][health-contributing] in [`syntax-tree/.github`][health]
for ways to get started.
See [`support.md`][health-support] for ways to get help.

This project has a [code of conduct][health-coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[api-default-handlers]: #defaulthandlers

[api-element-attribute-name-case]: #elementattributenamecase

[api-handle]: #handle

[api-options]: #options

[api-space]: #space

[api-state]: #state

[api-style-property-name-case]: #stylepropertynamecase

[api-to-estree]: #toestreetree-options

[badge-build-image]: https://github.com/syntax-tree/hast-util-to-estree/workflows/main/badge.svg

[badge-build-url]: https://github.com/syntax-tree/hast-util-to-estree/actions

[badge-coverage-image]: https://img.shields.io/codecov/c/github/syntax-tree/hast-util-to-estree.svg

[badge-coverage-url]: https://codecov.io/github/syntax-tree/hast-util-to-estree

[badge-downloads-image]: https://img.shields.io/npm/dm/hast-util-to-estree.svg

[badge-downloads-url]: https://www.npmjs.com/package/hast-util-to-estree

[badge-size-image]: https://img.shields.io/bundlejs/size/hast-util-to-estree

[badge-size-url]: https://bundlejs.com/?q=hast-util-to-estree

[esmsh]: https://esm.sh

[file-license]: license

[github-estree]: https://github.com/estree/estree

[github-estree-program]: https://github.com/estree/estree/blob/master/es5.md#programs

[github-estree-util-build-jsx]: https://github.com/wooorm/estree-util-build-jsx

[github-estree-util-to-js]: https://github.com/syntax-tree/estree-util-to-js

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-hast]: https://github.com/syntax-tree/hast

[github-hast-nodes]: https://github.com/syntax-tree/hast#nodes

[github-hastscript]: https://github.com/syntax-tree/hastscript

[github-mdast-util-mdx]: https://github.com/syntax-tree/mdast-util-mdx

[github-property-information-schema]: https://github.com/wooorm/property-information#api

[health]: https://github.com/syntax-tree/.github

[health-coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[health-contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[health-support]: https://github.com/syntax-tree/.github/blob/main/support.md

[mdxjs]: https://mdxjs.com

[npmjs-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
