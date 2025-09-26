# hast-util-to-jsx-runtime

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]

hast utility to transform a tree to
preact, react, solid, svelte, vue, etcetera,
with an automatic JSX runtime.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`toJsxRuntime(tree, options)`](#tojsxruntimetree-options)
  * [`Components`](#components)
  * [`CreateEvaluater`](#createevaluater)
  * [`ElementAttributeNameCase`](#elementattributenamecase)
  * [`EvaluateExpression`](#evaluateexpression)
  * [`EvaluateProgram`](#evaluateprogram)
  * [`Evaluater`](#evaluater)
  * [`ExtraProps`](#extraprops)
  * [`Fragment`](#fragment)
  * [`Jsx`](#jsx)
  * [`JsxDev`](#jsxdev)
  * [`Options`](#options)
  * [`Props`](#props)
  * [`Source`](#source)
  * [`Space`](#space)
  * [`StylePropertyNameCase`](#stylepropertynamecase)
* [Errors](#errors)
* [Examples](#examples)
  * [Example: Preact](#example-preact)
  * [Example: Solid](#example-solid)
  * [Example: Svelte](#example-svelte)
  * [Example: Vue](#example-vue)
* [Syntax](#syntax)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a utility that takes a [hast][github-hast] tree and an
[automatic JSX runtime][reactjs-jsx-runtime] and turns the tree into anything
you wish.

## When should I use this?

You can use this package when you have a hast syntax tree and want to use it
with whatever framework.

This package uses an automatic JSX runtime,
which is a sort of lingua franca for frameworks to support JSX.

Notably,
automatic runtimes have support for passing extra information in development,
and have guaranteed support for fragments.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npmjs-install]:

```sh
npm install hast-util-to-jsx-runtime
```

In Deno with [`esm.sh`][esmsh]:

```js
import {toJsxRuntime} from 'https://esm.sh/hast-util-to-jsx-runtime@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {toJsxRuntime} from 'https://esm.sh/hast-util-to-jsx-runtime@2?bundle'
</script>
```

## Use

```js
import {h} from 'hastscript'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsxs, jsx} from 'react/jsx-runtime'
import {renderToStaticMarkup} from 'react-dom/server'

const tree = h('h1', 'Hello, world!')

const doc = renderToStaticMarkup(toJsxRuntime(tree, {Fragment, jsxs, jsx}))

console.log(doc)
```

Yields:

```html
<h1>Hello, world!</h1>
```

> **Note**:
> to add better type support,
> register a global JSX namespace:
>
> ```ts
> import type {JSX as Jsx} from 'react/jsx-runtime'
>
> declare global {
>   namespace JSX {
>     type ElementClass = Jsx.ElementClass
>     type Element = Jsx.Element
>     type IntrinsicElements = Jsx.IntrinsicElements
>   }
> }
> ```

## API

This package exports the identifier [`toJsxRuntime`][api-to-jsx-runtime].
It exports the [TypeScript][] types
[`Components`][api-components],
[`CreateEvaluater`][api-create-evaluater],
[`ElementAttributeNameCase`][api-element-attribute-name-case],
[`EvaluateExpression`][api-evaluate-expression],
[`EvaluateProgram`][api-evaluate-program],
[`Evaluater`][api-evaluater],
[`ExtraProps`][api-extra-props],
[`Fragment`][api-fragment],
[`Jsx`][api-jsx],
[`JsxDev`][api-jsx-dev],
[`Options`][api-options],
[`Props`][api-props],
[`Source`][api-source],
[`Space`][api-Space],
and
[`StylePropertyNameCase`][api-style-property-name-case].
There is no default export.

### `toJsxRuntime(tree, options)`

Transform a hast tree to
preact, react, solid, svelte, vue, etcetera,
with an automatic JSX runtime.

##### Parameters

* `tree`
  ([`Node`][github-hast-nodes])
  — tree to transform
* `options`
  ([`Options`][api-options], required)
  — configuration

##### Returns

Result from your configured JSX runtime
(`JSX.Element` if defined,
otherwise `unknown` which you can cast yourself).

### `Components`

Possible components to use (TypeScript type).

Each key is a tag name typed in `JSX.IntrinsicElements`,
if defined.
Each value is either a different tag name
or a component accepting the corresponding props
(and an optional `node` prop if `passNode` is on).

You can access props at `JSX.IntrinsicElements`.
For example,
to find props for `a`,
use `JSX.IntrinsicElements['a']`.

###### Type

```ts
import type {Element} from 'hast'

type ExtraProps = {node?: Element | undefined}

type Components = {
  [TagName in keyof JSX.IntrinsicElements]:
    | Component<JSX.IntrinsicElements[TagName] & ExtraProps>
    | keyof JSX.IntrinsicElements
}

type Component<ComponentProps> =
  // Class component:
  | (new (props: ComponentProps) => JSX.ElementClass)
  // Function component:
  | ((props: ComponentProps) => JSX.Element | string | null | undefined)
```

### `CreateEvaluater`

Create an evaluator that turns ESTree ASTs from embedded MDX into values
(TypeScript type).

###### Parameters

There are no parameters.

###### Returns

Evaluater ([`Evaluater`][api-evaluater]).

### `ElementAttributeNameCase`

Casing to use for attribute names (TypeScript type).

HTML casing is for example
`class`, `stroke-linecap`, `xml:lang`.
React casing is for example
`className`, `strokeLinecap`, `xmlLang`.

###### Type

```ts
type ElementAttributeNameCase = 'html' | 'react'
```

### `EvaluateExpression`

Turn an MDX expression into a value (TypeScript type).

###### Parameters

* `expression` (`Expression` from `@types/estree`)
  — estree expression

###### Returns

Result of expression (`unknown`).

### `EvaluateProgram`

Turn an MDX program (export/import statements) into a value (TypeScript type).

###### Parameters

* `program` (`Program` from `@types/estree`)
  — estree program

###### Returns

Result of program (`unknown`);
should likely be `undefined` as ESM changes the scope but doesn’t yield
something.

### `Evaluater`

Evaluator that turns ESTree ASTs from embedded MDX into values (TypeScript
type).

###### Fields

* `evaluateExpression` ([`EvaluateExpression`][api-evaluate-expression])
  — evaluate an expression
* `evaluateProgram` ([`EvaluateProgram`][api-evaluate-program])
  — evaluate a program

### `ExtraProps`

Extra fields we pass (TypeScript type).

###### Type

```ts
type ExtraProps = {node?: Element | undefined}
```

### `Fragment`

Represent the children,
typically a symbol (TypeScript type).

###### Type

```ts
type Fragment = unknown
```

### `Jsx`

Create a production element (TypeScript type).

###### Parameters

* `type` (`unknown`)
  — element type:
  `Fragment` symbol,
  tag name (`string`),
  component
* `props` ([`Props`][api-props])
  — element props,
  `children`,
  and maybe `node`
* `key` (`string` or `undefined`)
  — dynamicly generated key to use

###### Returns

Element from your framework
(`JSX.Element` if defined,
otherwise `unknown` which you can cast yourself).

### `JsxDev`

Create a development element (TypeScript type).

###### Parameters

* `type` (`unknown`)
  — element type:
  `Fragment` symbol,
  tag name (`string`),
  component
* `props` ([`Props`][api-props])
  — element props,
  `children`,
  and maybe `node`
* `key` (`string` or `undefined`)
  — dynamicly generated key to use
* `isStaticChildren` (`boolean`)
  — whether two or more children are passed (in an array),
  which is whether `jsxs` or `jsx` would be used
* `source` ([`Source`][api-source])
  — info about source
* `self` (`undefined`)
  — nothing (this is used by frameworks that have components,
  we don’t)

###### Returns

Element from your framework
(`JSX.Element` if defined,
otherwise `unknown` which you can cast yourself).

### `Options`

Configuration (TypeScript type).

###### Fields

* `Fragment` ([`Fragment`][api-fragment], required)
  — fragment
* `jsxDEV` ([`JsxDev`][api-jsx-dev], required in development)
  — development JSX
* `jsxs` ([`Jsx`][api-jsx], required in production)
  — static JSX
* `jsx` ([`Jsx`][api-jsx], required in production)
  — dynamic JSX
* `components` ([`Partial<Components>`][api-components], optional)
  — components to use
* `createEvaluater` ([`CreateEvaluater`][api-create-evaluater], optional)
  — create an evaluator that turns ESTree ASTs into values
* `development` (`boolean`, default: `false`)
  — whether to use `jsxDEV` when on or `jsx` and `jsxs` when off
* `elementAttributeNameCase`
  ([`ElementAttributeNameCase`][api-element-attribute-name-case],
  default: `'react'`)
  — specify casing to use for attribute names
* `filePath` (`string`, optional)
  — file path to the original source file,
  passed in source info to `jsxDEV` when using the automatic runtime with
  `development: true`
* `passNode` (`boolean`, default: `false`)
  — pass the hast element node to components
* `space` ([`Space`][api-space], default: `'html'`)
  — whether `tree` is in the `'html'` or `'svg'` space, when an `<svg>`
  element is found in the HTML space,
  this package already automatically switches to and from the SVG space when
  entering and exiting it
* `stylePropertyNameCase`
  ([`StylePropertyNameCase`][api-style-property-name-case],
  default: `'dom'`)
  — specify casing to use for property names in `style` objects
* `tableCellAlignToStyle`
  (`boolean`, default: `true`)
  — turn obsolete `align` props on `td` and `th` into CSS `style` props

### `Props`

Properties and children (TypeScript type).

###### Type

```ts
import type {Element} from 'hast'

type Props = {
  [prop: string]:
    | Array<JSX.Element | string | null | undefined> // For `children`.
    | Record<string, string> // For `style`.
    | Element // For `node`.
    | boolean
    | number
    | string
    | undefined
  children: Array<JSX.Element | string | null | undefined> | undefined
  node?: Element | undefined
}
```

### `Source`

Info about source (TypeScript type).

###### Fields

* `columnNumber` (`number` or `undefined`)
  — column where thing starts (0-indexed)
* `fileName` (`string` or `undefined`)
  — name of source file
* `lineNumber` (`number` or `undefined`)
  — line where thing starts (1-indexed)

### `Space`

Namespace (TypeScript type).

> 👉 **Note**:
> hast is not XML;
> it supports SVG as embedded in HTML;
> it does not support the features available in XML;
> passing SVG might break but fragments of modern SVG should be fine;
> use `xast` if you need to support SVG as XML.

###### Type

```ts
type Space = 'html' | 'svg'
```

### `StylePropertyNameCase`

Casing to use for property names in `style` objects (TypeScript type).

CSS casing is for example `background-color` and `-webkit-line-clamp`.
DOM casing is for example `backgroundColor` and `WebkitLineClamp`.

###### Type

```ts
type StylePropertyNameCase = 'css' | 'dom'
```

## Errors

The following errors are thrown:

###### ``Expected `Fragment` in options``

This error is thrown when either `options` is not passed at all or
when `options.Fragment` is `undefined`.

The automatic JSX runtime needs a symbol for a fragment to work.

To solve the error,
make sure you are passing the correct fragment symbol from your framework.

###### `` Expected `jsxDEV` in options when `development: true` ``

This error is thrown when `options.development` is turned on (`true`),
but when `options.jsxDEV` is not a function.

The automatic JSX runtime,
in development,
needs this function.

To solve the error,
make sure you are importing the correct runtime functions
(for example, `'react/jsx-dev-runtime'`),
and pass `jsxDEV`.

###### ``Expected `jsx` in production options``

###### ``Expected `jsxs` in production options``

These errors are thrown when `options.development` is *not* turned on
(`false` or not defined),
and when `options.jsx` or `options.jsxs` are not functions.

The automatic JSX runtime,
in production,
needs these functions.

To solve the error,
make sure you are importing the correct runtime functions
(for example, `'react/jsx-runtime'`),
and pass `jsx` and `jsxs`.

###### `` Cannot handle MDX estrees without `createEvaluater` ``

This error is thrown when MDX nodes are passed that represent JavaScript
programs or expressions.

Supporting JavaScript can be unsafe and requires a different project.
To support JavaScript,
pass a `createEvaluater` function in `options`.

###### ``Cannot parse `style` attribute``

This error is thrown when a `style` attribute is found on an element,
which cannot be parsed as CSS.

Most frameworks don’t accept `style` as a string,
so we need to parse it as CSS,
and pass it as an object.
But when broken CSS is used,
such as `style="color:red; /*"`,
we crash.

To solve the error,
make sure authors write valid CSS.
Alternatively,
pass `options.ignoreInvalidStyle: true` to swallow these errors.

## Examples

### Example: Preact

> 👉 **Note**:
> you must set `elementAttributeNameCase: 'html'` for preact.

In Node.js,
do:

```js
import {h} from 'hastscript'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsx, jsxs} from 'preact/jsx-runtime'
import {render} from 'preact-render-to-string'

const result = render(
  toJsxRuntime(h('h1', 'hi!'), {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: 'html'
  })
)

console.log(result)
```

Yields:

```html
<h1>hi!</h1>
```

In a browser,
do:

```js
import {h} from 'https://esm.sh/hastscript@9'
import {toJsxRuntime} from 'https://esm.sh/hast-util-to-jsx-runtime@2'
import {Fragment, jsx, jsxs} from 'https://esm.sh/preact@10/jsx-runtime'
import {render} from 'https://esm.sh/preact@10'

render(
  toJsxRuntime(h('h1', 'hi!'), {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: 'html'
  }),
  document.getElementById('root')
)
```

To add better type support,
register a global JSX namespace:

```ts
import type {JSX as Jsx} from 'preact/jsx-runtime'

declare global {
  namespace JSX {
    type ElementClass = Jsx.ElementClass
    type Element = Jsx.Element
    type IntrinsicElements = Jsx.IntrinsicElements
  }
}
```

### Example: Solid

> 👉 **Note**:
> you must set `elementAttributeNameCase: 'html'` and
> `stylePropertyNameCase: 'css'` for Solid.

In Node.js,
do:

```js
import {h} from 'hastscript'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsx, jsxs} from 'solid-jsx/jsx-runtime'

console.log(
  toJsxRuntime(h('h1', 'hi!'), {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: 'html',
    stylePropertyNameCase: 'css'
  }).t
)
```

Yields:

```html
<h1 >hi!</h1>
```

In a browser,
do:

```js
import {h} from 'https://esm.sh/hastscript@9'
import {toJsxRuntime} from 'https://esm.sh/hast-util-to-jsx-runtime@2'
import {Fragment, jsx, jsxs} from 'https://esm.sh/solid-js@1/h/jsx-runtime'
import {render} from 'https://esm.sh/solid-js@1/web'

render(Component, document.getElementById('root'))

function Component() {
  return toJsxRuntime(h('h1', 'hi!'), {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: 'html',
    stylePropertyNameCase: 'css'
  })
}
```

To add better type support,
register a global JSX namespace:

```ts
import type {JSX as Jsx} from 'solid-js/jsx-runtime'

declare global {
  namespace JSX {
    type ElementClass = Jsx.ElementClass
    type Element = Jsx.Element
    type IntrinsicElements = Jsx.IntrinsicElements
  }
}
```

### Example: Svelte

<!-- To do: improve svelte when it fixes a bunch of bugs. -->

I have no clue how to render a Svelte component in Node,
but you can get that component with:

```js
import {h} from 'hastscript'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsx, jsxs} from 'svelte-jsx'

const svelteComponent = toJsxRuntime(h('h1', 'hi!'), {Fragment, jsx, jsxs})

console.log(svelteComponent)
```

Yields:

```text
[class Component extends SvelteComponent]
```

Types for Svelte are broken.
Raise it with Svelte.

### Example: Vue

> 👉 **Note**:
> you must set `elementAttributeNameCase: 'html'` for Vue.

In Node.js,
do:

```js
import serverRenderer from '@vue/server-renderer'
import {h} from 'hastscript'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsx, jsxs} from 'vue/jsx-runtime' // Available since `vue@3.3`.

console.log(
  await serverRenderer.renderToString(
    toJsxRuntime(h('h1', 'hi!'), {
      Fragment,
      jsx,
      jsxs,
      elementAttributeNameCase: 'html'
    })
  )
)
```

Yields:

```html
<h1>hi!</h1>
```

In a browser,
do:

```js
import {h} from 'https://esm.sh/hastscript@9'
import {toJsxRuntime} from 'https://esm.sh/hast-util-to-jsx-runtime@2'
import {createApp} from 'https://esm.sh/vue@3'
import {Fragment, jsx, jsxs} from 'https://esm.sh/vue@3/jsx-runtime'

createApp(Component).mount('#root')

function Component() {
  return toJsxRuntime(h('h1', 'hi!'), {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: 'html'
  })
}
```

To add better type support,
register a global JSX namespace:

```ts
import type {JSX as Jsx} from 'vue/jsx-runtime'

declare global {
  namespace JSX {
    type ElementClass = Jsx.ElementClass
    type Element = Jsx.Element
    type IntrinsicElements = Jsx.IntrinsicElements
  }
}
```

## Syntax

HTML is parsed according to WHATWG HTML (the living standard),
which is also followed by browsers such as Chrome,
Firefox,
and Safari.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`hast-util-to-jsx-runtime@2`,
compatible with Node.js 16.

## Security

Be careful with user input in your hast tree.
Use [`hast-util-santize`][github-hast-util-sanitize] to make hast trees safe.

## Related

* [`hastscript`](https://github.com/syntax-tree/hastscript)
  — build hast trees
* [`hast-util-to-html`](https://github.com/syntax-tree/hast-util-to-html)
  — serialize hast as HTML
* [`hast-util-sanitize`][github-hast-util-sanitize]
  — sanitize hast

## Contribute

See [`contributing.md`][health-contributing]
in
[`syntax-tree/.github`][health]
for ways to get started.
See [`support.md`][health-support] for ways to get help.

This project has a [code of conduct][health-coc].
By interacting with this repository,
organization,
or community you agree to abide by its terms.

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[api-components]: #components

[api-create-evaluater]: #createevaluater

[api-element-attribute-name-case]: #elementattributenamecase

[api-evaluate-expression]: #evaluateexpression

[api-evaluate-program]: #evaluateprogram

[api-evaluater]: #evaluater

[api-extra-props]: #extraprops

[api-fragment]: #fragment

[api-jsx]: #jsx

[api-jsx-dev]: #jsxdev

[api-options]: #options

[api-props]: #props

[api-source]: #source

[api-space]: #space

[api-style-property-name-case]: #stylepropertynamecase

[api-to-jsx-runtime]: #tojsxruntimetree-options

[badge-build-image]: https://github.com/syntax-tree/hast-util-to-jsx-runtime/workflows/main/badge.svg

[badge-build-url]: https://github.com/syntax-tree/hast-util-to-jsx-runtime/actions

[badge-coverage-image]: https://img.shields.io/codecov/c/github/syntax-tree/hast-util-to-jsx-runtime.svg

[badge-coverage-url]: https://codecov.io/github/syntax-tree/hast-util-to-jsx-runtime

[badge-downloads-image]: https://img.shields.io/npm/dm/hast-util-to-jsx-runtime.svg

[badge-downloads-url]: https://www.npmjs.com/package/hast-util-to-jsx-runtime

[badge-size-image]: https://img.shields.io/bundlejs/size/hast-util-to-jsx-runtime

[badge-size-url]: https://bundlejs.com/?q=hast-util-to-jsx-runtime

[esmsh]: https://esm.sh

[file-license]: license

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-hast]: https://github.com/syntax-tree/hast

[github-hast-nodes]: https://github.com/syntax-tree/hast#nodes

[github-hast-util-sanitize]: https://github.com/syntax-tree/hast-util-sanitize

[health]: https://github.com/syntax-tree/.github

[health-coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[health-contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[health-support]: https://github.com/syntax-tree/.github/blob/main/support.md

[npmjs-install]: https://docs.npmjs.com/cli/install

[reactjs-jsx-runtime]: https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
