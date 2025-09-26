# `@mdx-js/mdx`

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

MDX compiler.

<!-- more -->

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`compile(file, options?)`](#compilefile-options)
  * [`compileSync(file, options?)`](#compilesyncfile-options)
  * [`createProcessor(options?)`](#createprocessoroptions)
  * [`evaluate(file, options)`](#evaluatefile-options)
  * [`evaluateSync(file, options)`](#evaluatesyncfile-options)
  * [`nodeTypes`](#nodetypes)
  * [`run(code, options)`](#runcode-options)
  * [`runSync(code, options)`](#runsynccode-options)
  * [`CompileOptions`](#compileoptions)
  * [`EvaluateOptions`](#evaluateoptions)
  * [`Fragment`](#fragment)
  * [`Jsx`](#jsx)
  * [`JsxDev`](#jsxdev)
  * [`ProcessorOptions`](#processoroptions)
  * [`RunOptions`](#runoptions)
  * [`UseMdxComponents`](#usemdxcomponents)
* [Types](#types)
* [Architecture](#architecture)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a compiler that turns MDX into JavaScript.
It can also evaluate MDX code.

## When should I use this?

This is the core compiler for turning MDX into JavaScript which gives you the
most control.
If you’re using a bundler (Rollup, esbuild, webpack), a site builder (Next.js),
or build system (Vite) which comes with a bundler, you’re better off using an
integration: see [§ Integrations][integrations].

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install @mdx-js/mdx
```

In Deno with [`esm.sh`][esmsh]:

```tsx
import {compile} from 'https://esm.sh/@mdx-js/mdx@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {compile} from 'https://esm.sh/@mdx-js/mdx@3?bundle'
</script>
```

## Use

Say we have an MDX document, `example.mdx`:

```mdx
export function Thing() {
  return <>World!</>
}

# Hello, <Thing />
```

…and some code in `example.js` to compile `example.mdx` to JavaScript:

```tsx
import fs from 'node:fs/promises'
import {compile} from '@mdx-js/mdx'

const compiled = await compile(await fs.readFile('example.mdx'))

console.log(String(compiled))
```

Yields roughly:

```tsx
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'

export function Thing() {
  return _jsx(_Fragment, {children: 'World!'})
}

function _createMdxContent(props) {
  const _components = {h1: 'h1', ...props.components}
  return _jsxs(_components.h1, {children: ['Hello, ', _jsx(Thing, {})]})
}

export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || {}
  return MDXLayout
    ? _jsx(MDXLayout, {...props, children: _jsx(_createMdxContent, {...props})})
    : _createMdxContent(props)
}
```

See [§ Using MDX][using-mdx] for more on how MDX work and how to use the result.

## API

This package exports the following identifiers:
[`compile`][api-compile],
[`compileSync`][api-compile-sync],
[`createProcessor`][api-create-processor],
[`evaluate`][api-evaluate],
[`evaluateSync`][api-evaluate-sync],
[`nodeTypes`][api-node-types],
[`run`][api-run], and
[`runSync`][api-run-sync].
There is no default export.

### `compile(file, options?)`

Compile MDX to JS.

###### Parameters

* `file` ([`Compatible` from `vfile`][vfile-compatible])
  — MDX document to parse
* `options` ([`CompileOptions`][api-compile-options], optional)
  — compile configuration

###### Returns

Promise to compiled file ([`Promise<VFile>`][vfile]).

###### Examples

The input value for `file` can be many different things.
You can pass a `string`, `Uint8Array` in UTF-8, [`VFile`][vfile], or anything
that can be given to `new VFile`.

```tsx
import {compile} from '@mdx-js/mdx'
import {VFile} from 'vfile'

await compile(':)')
await compile(Buffer.from(':-)'))
await compile({path: 'path/to/file.mdx', value: '🥳'})
await compile(new VFile({path: 'path/to/file.mdx', value: '🤭'}))
```

The output `VFile` can be used to access more than the generated code:

```tsx
import {compile} from '@mdx-js/mdx'
import remarkPresetLintConsistent from 'remark-preset-lint-consistent' // Lint rules to check for consistent markdown.
import {reporter} from 'vfile-reporter'

const file = await compile('*like this* or _like this_?', {remarkPlugins: [remarkPresetLintConsistent]})

console.error(reporter(file))
```

Yields:

```text
  1:16-1:27  warning  Emphasis should use `*` as a marker  emphasis-marker  remark-lint

⚠ 1 warning
```

### `compileSync(file, options?)`

Synchronously compile MDX to JS.

When possible please use the async [`compile`][api-compile].

###### Parameters

* `file` ([`Compatible` from `vfile`][vfile-compatible])
  — MDX document to parse
* `options` ([`CompileOptions`][api-compile-options], optional)
  — compile configuration

###### Returns

Compiled file ([`VFile`][vfile]).

### `createProcessor(options?)`

Create a processor to compile markdown or MDX to JavaScript.

> **Note**: `format: 'detect'` is not allowed in `ProcessorOptions`.

###### Parameters

* `options` ([`ProcessorOptions`][api-processor-options], optional)
  — process configuration

###### Returns

Processor ([`Processor` from `unified`][unified-processor]).

### `evaluate(file, options)`

[Compile][api-compile] and [run][api-run] MDX.

When you trust your content, `evaluate` can work.
When possible, use [`compile`][api-compile], write to a file, and then run with
Node or use one of the [§ Integrations][integrations].

> ☢️ **Danger**: it’s called **evaluate** because it `eval`s JavaScript.

###### Parameters

* `file` ([`Compatible` from `vfile`][vfile-compatible])
  — MDX document to parse
* `options` ([`EvaluateOptions`][api-evaluate-options], **required**)
  — configuration

###### Returns

Promise to a module ([`Promise<MDXModule>` from
`mdx/types.js`][mdx-types-module]).

The result is an object with a `default` field set to the component;
anything else that was exported is available too.
For example, assuming the contents of `example.mdx` from [§ Use][use] was in
`file`, then:

```tsx
import {evaluate} from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'

console.log(await evaluate(file, runtime))
```

…yields:

```tsx
{Thing: [Function: Thing], default: [Function: MDXContent]}
```

###### Notes

Compiling (and running) MDX takes time.

If you are live-rendering a string of MDX that often changes using a virtual DOM
based framework (such as React), one performance improvement is to call the
`MDXContent` component yourself.
The reason is that the `evaluate` creates a new function each time, which cannot
be diffed:

```diff
 const {default: MDXContent} = await evaluate('…')

-<MDXContent {...props} />
+MDXContent(props)
```

### `evaluateSync(file, options)`

Compile and run MDX, synchronously.

When possible please use the async [`evaluate`][api-evaluate].

> ☢️ **Danger**: it’s called **evaluate** because it `eval`s JavaScript.

###### Parameters

* `file` ([`Compatible` from `vfile`][vfile-compatible])
  — MDX document to parse
* `options` ([`EvaluateOptions`][api-evaluate-options], **required**)
  — configuration

###### Returns

Module ([`MDXModule` from `mdx/types.js`][mdx-types-module]).

### `nodeTypes`

List of node types made by `mdast-util-mdx`, which have to be passed
through untouched from the mdast tree to the hast tree (`Array<string>`).

### `run(code, options)`

Run code compiled with `outputFormat: 'function-body'`.

> ☢️ **Danger**: this `eval`s JavaScript.

###### Parameters

* `code` ([`VFile`][vfile] or `string`)
  — JavaScript function body to run
* `options` ([`RunOptions`][api-run-options], **required**)
  — configuration

###### Returns

Promise to a module ([`Promise<MDXModule>` from
`mdx/types.js`][mdx-types-module]);
the result is an object with a `default` field set to the component;
anything else that was exported is available too.

###### Example

On the server:

```tsx
import {compile} from '@mdx-js/mdx'

const code = String(await compile('# hi', {outputFormat: 'function-body'}))
// To do: send `code` to the client somehow.
```

On the client:

```tsx
import {run} from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'

const code = '' // To do: get `code` from server somehow.

const {default: Content} = await run(code, {...runtime, baseUrl: import.meta.url})

console.log(Content)
```

…yields:

```tsx
[Function: MDXContent]
```

### `runSync(code, options)`

Run code, synchronously.

When possible please use the async [`run`][api-run].

> ☢️ **Danger**: this `eval`s JavaScript.

###### Parameters

* `code` ([`VFile`][vfile] or `string`)
  — JavaScript function body to run
* `options` ([`RunOptions`][api-run-options], **required**)
  — configuration

###### Returns

Module ([`MDXModule` from `mdx/types.js`][mdx-types-module]).

### `CompileOptions`

Configuration for `compile` (TypeScript type).

`CompileOptions` is the same as [`ProcessorOptions`][api-processor-options]
with the exception that the `format` option supports a `'detect'` value,
which is the default.
The `'detect'` format means to use `'md'` for files with an extension in
`mdExtensions` and `'mdx'` otherwise.

###### Type

```tsx
/**
 * Configuration for `compile`
 */
type CompileOptions = Omit<ProcessorOptions, 'format'> & {
  /**
   * Format of `file` (default: `'detect'`).
   */
  format?: 'detect' | 'md' | 'mdx' | null | undefined
}
```

### `EvaluateOptions`

Configuration for `evaluate` (TypeScript type).

`EvaluateOptions` is the same as [`CompileOptions`][api-compile-options],
except that the options `baseUrl`, `jsx`, `jsxImportSource`, `jsxRuntime`,
`outputFormat`, `pragma`, `pragmaFrag`, `pragmaImportSource`, and
`providerImportSource` are not allowed, and that
[`RunOptions`][api-run-options] are also used.

###### Type

```tsx
/**
 * Configuration for `evaluate`.
 */
type EvaluateOptions = Omit<
  CompileOptions,
  | 'baseUrl' // Note that this is also in `RunOptions`.
  | 'jsx'
  | 'jsxImportSource'
  | 'jsxRuntime'
  | 'outputFormat'
  | 'pragma'
  | 'pragmaFrag'
  | 'pragmaImportSource'
  | 'providerImportSource'
> &
  RunOptions
```

### `Fragment`

Represent the children, typically a symbol (TypeScript type).

###### Type

```ts
type Fragment = unknown
```

### `Jsx`

Create a production element (TypeScript type).

###### Parameters

* `type` (`unknown`)
  — element type: `Fragment` symbol, tag name (`string`), component
* `properties` (`Properties`)
  — element properties and `children`
* `key` (`string` or `undefined`)
  — key to use

###### Returns

Element from your framework (`JSX.Element`).

### `JsxDev`

Create a development element (TypeScript type).

###### Parameters

* `type` (`unknown`)
  — element type: `Fragment` symbol, tag name (`string`), component
* `properties` (`Properties`)
  — element properties and `children`
* `key` (`string` or `undefined`)
  — key to use
* `isStaticChildren` (`boolean`)
  — whether two or more children are passed (in an array), which is whether
  `jsxs` or `jsx` would be used
* `source` (`Source`)
  — info about source
* `self` (`unknown`)
  — context object (`this`)

### `ProcessorOptions`

Configuration for `createProcessor` (TypeScript type).

###### Fields

* `SourceMapGenerator` (`SourceMapGenerator` from [`source-map`][source-map],
  optional)
  — add a source map (object form) as the `map` field on the resulting file

  <details><summary>Expand example</summary>

  Assuming `example.mdx` from [§ Use][use] exists, then:

  ```tsx
  import fs from 'node:fs/promises'
  import {compile} from '@mdx-js/mdx'
  import {SourceMapGenerator} from 'source-map'

  const file = await compile(
    {path: 'example.mdx', value: await fs.readFile('example.mdx')},
    {SourceMapGenerator}
  )

  console.log(file.map)
  ```

  …yields:

  ```tsx
  {
    file: 'example.mdx',
    mappings: ';;aAAaA,QAAQ;YAAQ;;;;;;;;iBAE3B',
    names: ['Thing'],
    sources: ['example.mdx'],
    version: 3
  }
  ```

  </details>

* `baseUrl` (`URL` or `string`, optional, example: `import.meta.url`)
  — use this URL as `import.meta.url` and resolve `import` and
  `export … from` relative to it

  <details><summary>Expand example</summary>

  Say we have a module `example.js`:

  ```tsx
  import {compile} from '@mdx-js/mdx'

  const code = 'export {number} from "./data.js"\n\n# hi'
  const baseUrl = 'https://a.full/url' // Typically `import.meta.url`

  console.log(String(await compile(code, {baseUrl})))
  ```

  …now running `node example.js` yields:

  ```tsx
  import {jsx as _jsx} from 'react/jsx-runtime'
  export {number} from 'https://a.full/data.js'
  function _createMdxContent(props) { /* … */ }
  export default function MDXContent(props = {}) { /* … */ }
  ```

  </details>

* `development` (`boolean`, default: `false`)
  — whether to add extra info to error messages in generated code and use the
  development automatic JSX runtime (`Fragment` and `jsxDEV` from
  `/jsx-dev-runtime`);
  when using the webpack loader (`@mdx-js/loader`) or the Rollup integration
  (`@mdx-js/rollup`) through Vite, this is automatically inferred from how
  you configure those tools

  <details><summary>Expand example</summary>

  Say we had some MDX that references a component that can be passed or
  provided at runtime:

  ```mdx
  **Note**<NoteIcon />: some stuff.
  ```

  And a module to evaluate that:

  ```tsx
  import fs from 'node:fs/promises'
  import {evaluate} from '@mdx-js/mdx'
  import * as runtime from 'react/jsx-runtime'

  const path = 'example.mdx'
  const value = await fs.readFile(path)
  const MDXContent = (await evaluate({path, value}, {...runtime, baseUrl: import.meta.url})).default

  console.log(MDXContent({}))
  ```

  …running that would normally (production) yield:

  ```text
  Error: Expected component `NoteIcon` to be defined: you likely forgot to import, pass, or provide it.
      at _missingMdxReference (eval at run (…/@mdx-js/mdx/lib/run.js:18:10), <anonymous>:27:9)
      at _createMdxContent (eval at run (…/@mdx-js/mdx/lib/run.js:18:10), <anonymous>:15:20)
      at MDXContent (eval at run (…/@mdx-js/mdx/lib/run.js:18:10), <anonymous>:9:9)
      at main (…/example.js:11:15)
  ```

  …but if we add `development: true` to our example:

  ```diff
  @@ -7,6 +7,6 @@
  import fs from 'node:fs/promises'
  -import * as runtime from 'react/jsx-runtime'
  +import * as runtime from 'react/jsx-dev-runtime'
  import {evaluate} from '@mdx-js/mdx'

  const path = 'example.mdx'
  const value = await fs.readFile(path)
  -const MDXContent = (await evaluate({path, value}, {...runtime, baseUrl: import.meta.url})).default
  +const MDXContent = (await evaluate({path, value}, {development: true, ...runtime, baseUrl: import.meta.url})).default

  console.log(MDXContent({}))
  ```

  …and we’d run it again, we’d get:

  ```text
  Error: Expected component `NoteIcon` to be defined: you likely forgot to import, pass, or provide it.
  It’s referenced in your code at `1:9-1:21` in `example.mdx`
  provide it.
      at _missingMdxReference (eval at run (…/@mdx-js/mdx/lib/run.js:18:10), <anonymous>:27:9)
      at _createMdxContent (eval at run (…/@mdx-js/mdx/lib/run.js:18:10), <anonymous>:15:20)
      at MDXContent (eval at run (…/@mdx-js/mdx/lib/run.js:18:10), <anonymous>:9:9)
      at main (…/example.js:11:15)
  ```

  </details>

* `elementAttributeNameCase` (`'html'` or `'react`, default: `'react'`)
  — casing to use for attribute names;
  HTML casing is for example `class`, `stroke-linecap`, `xml:lang`;
  React casing is for example `className`, `strokeLinecap`, `xmlLang`;
  for JSX components written in MDX, the author has to be aware of which
  framework they use and write code accordingly;
  for AST nodes generated by this project, this option configures it

* `format` (`'md'` or `'mdx'`, default: `'mdx'`)
  — format of the file;
  `'md'` means treat as markdown and `'mdx'` means treat as [MDX][mdx-syntax]

  <details><summary>Expand example</summary>

  ```tsx
  compile('…') // Seen as MDX.
  compile('…', {format: 'mdx'}) // Seen as MDX.
  compile('…', {format: 'md'}) // Seen as markdown.
  ```

  </details>

* `jsx` (`boolean`, default: `false`)
  — whether to keep JSX;
  the default is to compile JSX away so that the resulting file is
  immediately runnable.

  <details><summary>Expand example</summary>

  If `file` is the contents of `example.mdx` from [§ Use][use], then:

  ```tsx
  compile(file, {jsx: true})
  ```

  …yields this difference:

  ```diff
  -import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
  +/*@jsxRuntime automatic*/
  +/*@jsxImportSource react*/

  export function Thing() {
  -  return _jsx(_Fragment, {children: 'World'})
  +  return <>World!</>
  }

  function _createMdxContent(props) {
    const _components = {
      h1: 'h1',
      ...props.components
    }
  -  return _jsxs(_components.h1, {children: ['Hello ', _jsx(Thing, {})]})
  +  return <_components.h1>{"Hello "}<Thing /></_components.h1>
  }

  export default function MDXContent(props = {}) {
    const {wrapper: MDXLayout} = props.components || {}
    return MDXLayout
  -    ? _jsx(MDXLayout, {
  -        ...props,
  -        children: _jsx(_createMdxContent, props)
  -      })
  +    ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout>
      : _createMdxContent(props)
  }
  }
  ```

  </details>

* `jsxImportSource` (`string`, default: `'react'`)
  — place to import automatic JSX runtimes from;
  when in the `automatic` runtime, this is used to define an import for
  `Fragment`, `jsx`, `jsxDEV`, and `jsxs`

  <details><summary>Expand example</summary>

  If `file` is the contents of `example.mdx` from [§ Use][use], then:

  ```tsx
  compile(file, {jsxImportSource: 'preact'})
  ```

  …yields this difference:

  ```diff
  -import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
  +import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from 'preact/jsx-runtime'
  ```

  </details>

* `jsxRuntime` (`'automatic'` or `'classic'`, default: `'automatic'`)
  — JSX runtime to use;
  the automatic runtime compiles to `import _jsx from
  '$importSource/jsx-runtime'\n_jsx('p')`;
  the classic runtime compiles to calls such as `h('p')`

  > 👉 **Note**: support for the classic runtime is deprecated and will
  > likely be removed in the next major version.

  <details><summary>Expand example</summary>

  If `file` is the contents of `example.mdx` from [§ Use][use], then:

  ```tsx
  compile(file, {jsxRuntime: 'classic'})
  ```

  …yields this difference:

  ```diff
  -import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
  +import React from 'react'

  export function Thing() {
  -  return _jsx(_Fragment, {children: 'World'})
  +  return React.createElement(React.Fragment, null, 'World!')
  }
  …
  ```

  </details>

* `outputFormat` (`'function-body'` or `'program'`, default: `'program'`)
  — output format to generate;
  in most cases `'program'` should be used, it results in a whole program;
  internally [`evaluate`][api-evaluate] uses `'function-body'` to compile to
  code that can be passed to [`run`][api-run];
  in some cases, you might want what `evaluate` does in separate steps, such
  as when compiling on the server and running on the client.

  <details><summary>Expand example</summary>

  With a module `example.js`:

  ```tsx
  import {compile} from '@mdx-js/mdx'

  const code = 'export const no = 3.14\n\n# hi {no}'

  console.log(String(await compile(code, {outputFormat: 'program'}))) // Default.
  console.log(String(await compile(code, {outputFormat: 'function-body'})))
  ```

  …yields:

  ```tsx
  import {jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
  export const no = 3.14
  function _createMdxContent(props) { /* … */ }
  export default function MDXContent(props = {}) { /* … */ }
  ```

  ```tsx
  'use strict'
  const {Fragment: _Fragment, jsx: _jsx} = arguments[0]
  const no = 3.14
  function _createMdxContent(props) { /* … */ }
  function MDXContent(props = {}) { /* … */ }
  return {no, default: MDXContent}
  ```

  The `'program'` format will use import statements to import the runtime (and
  optionally provider) and use an export statement to yield the `MDXContent`
  component.

  The `'function-body'` format will get the runtime (and optionally provider)
  from `arguments[0]`, rewrite export statements, and use a return statement to
  yield what was exported.

  </details>

* `mdExtensions` (`Array<string>`, default: `['.md', '.markdown', '.mdown',
  '.mkdn', '.mkd', '.mdwn', '.mkdown', '.ron']`)
  — list of markdown extensions, with dot
  affects [§ Integrations][integrations]

* `mdxExtensions` (`Array<string>`, default: `['.mdx']`)
  — list of MDX extensions, with dot;
  affects [§ Integrations][integrations]

* `pragma` (`string`, default: `'React.createElement'`)
  — pragma for JSX, used in the classic runtime as an identifier for function
  calls: `<x />` to `React.createElement('x')`;
  when changing this, you should also define `pragmaFrag` and
  `pragmaImportSource` too

  > 👉 **Note**: support for the classic runtime is deprecated and will
  > likely be removed in the next major version.

  <details><summary>Expand example</summary>

  If `file` is the contents of `example.mdx` from [§ Use][use], then:

  ```tsx
  compile(file, {
    jsxRuntime: 'classic',
    pragma: 'preact.createElement',
    pragmaFrag: 'preact.Fragment',
    pragmaImportSource: 'preact/compat'
  })
  ```

  …yields this difference:

  ```diff
  -import React from 'react'
  +import preact from 'preact/compat'

  export function Thing() {
  -  return React.createElement(React.Fragment, null, 'World!')
  +  return preact.createElement(preact.Fragment, null, 'World!')
  }
  …
  ```

  </details>

* `pragmaFrag` (`string`, default: `'React.Fragment'`)
  — pragma for fragment symbol, used in the classic runtime as an identifier
  for unnamed calls: `<>` to `React.createElement(React.Fragment)`;
  when changing this, you should also define `pragma` and `pragmaImportSource`
  too

  > 👉 **Note**: support for the classic runtime is deprecated and will
  > likely be removed in the next major version.

* `pragmaImportSource` (`string`, default: `'react'`)
  — where to import the identifier of `pragma` from, used in the classic
  runtime;
  to illustrate, when `pragma` is `'a.b'` and `pragmaImportSource` is `'c'`
  the following will be generated: `import a from 'c'` and things such as
  `a.b('h1', {})`;
  when changing this, you should also define `pragma` and `pragmaFrag` too

  > 👉 **Note**: support for the classic runtime is deprecated and will
  > likely be removed in the next major version.

* `providerImportSource` (`string`, optional, example: `'@mdx-js/react'`)
  — place to import a provider from;
  normally it’s used for runtimes that support context (React, Preact), but
  it can be used to inject components into the compiled code;
  the module must export and identifier `useMDXComponents` which is called
  without arguments to get an object of components (see
  [`UseMdxComponents`][api-use-mdx-components])

  <details><summary>Expand example</summary>

  If `file` is the contents of `example.mdx` from [§ Use][use], then:

  ```tsx
  compile(file, {providerImportSource: '@mdx-js/react'})
  ```

  …yields this difference:

  ```diff
  import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
  +import {useMDXComponents as _provideComponents} from '@mdx-js/react'

  export function Thing() {
    return _jsx(_Fragment, {children: 'World'})
  }

  function _createMdxContent(props) {
    const _components = {
      h1: 'h1',
  +    ..._provideComponents(),
      ...props.components
    }
    return _jsxs(_components.h1, {children: ['Hello ', _jsx(Thing, {})]})
  }

  export default function MDXContent(props = {}) {
  -  const {wrapper: MDXLayout} = props.components || {}
  +  const {wrapper: MDXLayout} = {
  +    ..._provideComponents(),
  +    ...props.components
  +  }

    return MDXLayout
      ? _jsx(MDXLayout, {...props, children: _jsx(_createMdxContent, {})})
      : _createMdxContent()
  ```

  </details>

* `recmaPlugins` ([`PluggableList` from `unified`][unified-pluggable-list],
  optional)
  — list of [recma plugins][recma-plugins]

  <details><summary>Expand example</summary>

  ```tsx
  import recmaMdxIsMdxComponent from 'recma-mdx-is-mdx-component'

  await compile(file, {recmaPlugins: [recmaMdxIsMdxComponent]})
  ```

  </details>

* `rehypePlugins` ([`PluggableList` from `unified`][unified-pluggable-list],
  optional)
  — list of [rehype plugins][rehype-plugins]

  <details><summary>Expand example</summary>

  ```tsx
  import rehypeKatex from 'rehype-katex' // Render math with KaTeX.
  import remarkMath from 'remark-math' // Support math like `$so$`.

  await compile(file, {rehypePlugins: [rehypeKatex], remarkPlugins: [remarkMath]})

  await compile(file, {
    // A plugin with options:
    rehypePlugins: [[rehypeKatex, {strict: true, throwOnError: true}]],
    remarkPlugins: [remarkMath]
  })
  ```

  </details>

* `remarkPlugins` ([`PluggableList` from `unified`][unified-pluggable-list],
  optional)
  — list of [remark plugins][remark-plugins]

  <details><summary>Expand example</summary>

  ```tsx
  import remarkFrontmatter from 'remark-frontmatter' // YAML and such.
  import remarkGfm from 'remark-gfm' // Tables, footnotes, strikethrough, task lists, literal URLs.

  await compile(file, {remarkPlugins: [remarkGfm]}) // One plugin.
  await compile(file, {remarkPlugins: [[remarkFrontmatter, 'toml']]}) // A plugin with options.
  await compile(file, {remarkPlugins: [remarkGfm, remarkFrontmatter]}) // Two plugins.
  await compile(file, {remarkPlugins: [[remarkGfm, {singleTilde: false}], remarkFrontmatter]}) // Two plugins, first w/ options.
  ```

  </details>

* `remarkRehypeOptions` ([`Options` from
  `remark-rehype`][remark-rehype-options], optional)
  — options to pass through to `remark-rehype`;
  in particular, you might want to pass configuration for footnotes if your
  content is not in English;
  the option `allowDangerousHtml` will always be set to `true` and the MDX
  nodes (see [`nodeTypes`][api-node-types]) are passed through.

  <details><summary>Expand example</summary>

  ```tsx
  compile({value: '…'}, {remarkRehypeOptions: {clobberPrefix: 'comment-1'}})
  ```

  </details>

* `stylePropertyNameCase` (`'css'` or `'dom`, default: `'dom'`)
  — casing to use for property names in `style` objects;
  CSS casing is for example `background-color` and `-webkit-line-clamp`;
  DOM casing is for example `backgroundColor` and `WebkitLineClamp`;
  for JSX components written in MDX, the author has to be aware of which
  framework they use and write code accordingly;
  for AST nodes generated by this project, this option configures it

* `tableCellAlignToStyle` (`boolean`, default: `true`)
  — turn obsolete `align` properties on `td` and `th` into CSS `style`
  properties

### `RunOptions`

Configuration to run compiled code (TypeScript type).

`Fragment`, `jsx`, and `jsxs` are used when the code is compiled in production
mode (`development: false`).
`Fragment` and `jsxDEV` are used when compiled in development mode
(`development: true`).
`useMDXComponents` is used when the code is compiled with
`providerImportSource: '#'` (the exact value of this compile option doesn’t
matter).

###### Fields

* `Fragment` ([`Fragment`][api-fragment], **required**)
  — symbol to use for fragments
* `baseUrl` (`URL` or `string`, optional, example: `import.meta.url`)
  — use this URL as `import.meta.url` and resolve `import` and
  `export … from` relative to it;
  this option can also be given at compile time in `CompileOptions`;
  you should pass this (likely at runtime), as you might get runtime errors
  when using `import.meta.url` / `import` / `export … from ` otherwise
* `jsx` ([`Jsx`][api-jsx], optional)
  — function to generate an element with static children in production mode
* `jsxDEV` ([`JsxDev`][api-jsx-dev], optional)
  — function to generate an element in development mode
* `jsxs` ([`Jsx`][api-jsx], optional)
  — function to generate an element with dynamic children in production mode
* `useMDXComponents` ([`UseMdxComponents`][api-use-mdx-components], optional)
  — function to get components to use

###### Examples

A `/jsx-runtime` module will expose `Fragment`, `jsx`, and `jsxs`:

```tsx
import * as runtime from 'react/jsx-runtime'

const {default: Content} = await evaluate('# hi', {...runtime, baseUrl: import.meta.url, ...otherOptions})

```

A `/jsx-dev-runtime` module will expose `Fragment` and `jsxDEV`:

```tsx
import * as runtime from 'react/jsx-dev-runtime'

const {default: Content} = await evaluate('# hi', {development: true, baseUrl: import.meta.url, ...runtime, ...otherOptions})
```

Our providers will expose `useMDXComponents`:

```tsx
import * as provider from '@mdx-js/react'
import * as runtime from 'react/jsx-runtime'

const {default: Content} = await evaluate('# hi', {...provider, ...runtime, baseUrl: import.meta.url, ...otherOptions})
```

### `UseMdxComponents`

Get components (TypeScript type).

###### Parameters

There are no parameters.

###### Returns

Components ([`MDXComponents` from `mdx/types.js`][mdx-types-components]).

## Types

This package is fully typed with [TypeScript][].
It exports the additional types
[`CompileOptions`][api-compile-options],
[`EvaluateOptions`][api-evaluate-options],
[`Fragment`][api-fragment],
[`Jsx`][api-jsx],
[`JsxDev`][api-jsx-dev],
[`ProcessorOptions`][api-processor-options],
[`RunOptions`][api-run-options], and
[`UseMdxComponents`][api-use-mdx-components].

For types of evaluated MDX to work, make sure the TypeScript `JSX` namespace is
typed.
This is done by installing and using the types of your framework, such as
[`@types/react`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/HEAD/types/react).
See [§ Types][types] on our website for information.

## Architecture

To understand what this project does, it’s very important to first understand
what unified does: please read through the [`unifiedjs/unified`][unified] readme
(the part until you hit the API section is required reading).

`@mdx-js/mdx` is a unified pipeline — wrapped so that most folks don’t need to
know about unified.
The processor goes through these steps:

1. parse MDX (serialized markdown with embedded JSX, ESM, and expressions)
   to mdast (markdown syntax tree)
2. transform through remark (markdown ecosystem)
3. transform mdast to hast (HTML syntax tree)
4. transform through rehype (HTML ecosystem)
5. transform hast to esast (JS syntax tree)
6. do the work needed to get a component
7. transform through recma (JS ecosystem)
8. serialize esast as JavaScript

The *input* is MDX.
That’s serialized markdown with embedded JSX, ESM, and expressions.
In the case of JSX,
the tags are *intertwined* with markdown.
The markdown is parsed with [`micromark/micromark`][micromark] and the embedded
JS with one of its extensions
[`micromark/micromark-extension-mdxjs`][micromark-extension-mdxjs] (which in
turn uses [acorn][]).
Then [`syntax-tree/mdast-util-from-markdown`][mdast-util-from-markdown] and its
extension [`syntax-tree/mdast-util-mdx`][mdast-util-mdx] are used to turn the
results from the parser into a syntax tree: [mdast][].

Markdown is closest to the source format.
This is where [remark plugins][remark-plugins] come in.
Typically, there shouldn’t be much going on here.
But perhaps you want to support GFM (tables and such) or frontmatter?
Then you can add a plugin here: `remark-gfm` or `remark-frontmatter`,
respectively.

After markdown, we go to [hast][] (HTML).
This transformation is done by
[`syntax-tree/mdast-util-to-hast`][mdast-util-to-hast].
Wait, what, why is HTML needed?
Part of the reason is that we care about HTML semantics: we want to know that
something is an `<a>`, not whether it’s a link with a resource (`[text](url)`)
or a reference to a defined link definition (`[text][id]\n\n[id]: url`).
So an HTML AST is *closer* to where we want to go.
Another reason is that there are many things folks need when they go MDX -> JS,
markdown -> HTML, or even folks who only process their HTML -> HTML: use cases
other than MDX.
By having a single AST in these cases and writing a plugin that works on that
AST, that plugin can supports *all* these use cases (for example,
[`rehypejs/rehype-highlight`][rehype-highlight] for syntax highlighting or
[`rehypejs/rehype-katex`][rehype-katex] for math).
So, this is where [rehype plugins][rehype-plugins] come in: most of the plugins,
probably.

Then we go to JavaScript: [esast][] (JS; an
AST which is compatible with estree but looks a bit more like other unist ASTs).
This transformation is done by
[`rehype-recma`][rehype-recma].
This is a newer ecosystem.
There are some [recma plugins][recma-plugins] already.
It’s where `@mdx-js/mdx` does its thing: where it adds imports/exports,
where it compiles JSX away into `_jsx()` calls, and where it does the other cool
things that it provides.

Finally, The output is serialized JavaScript.
That final step is done by [astring][], a
small and fast JS generator.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `@mdx-js/mdx@^3`,
compatible with Node.js 16.

## Security

See [§ Security][security] on our website for information.

## Contribute

See [§ Contribute][contribute] on our website for ways to get started.
See [§ Support][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][] © Compositor and [Vercel][]

[acorn]: https://github.com/acornjs/acorn

[api-compile]: #compilefile-options

[api-compile-options]: #compileoptions

[api-compile-sync]: #compilesyncfile-options

[api-create-processor]: #createprocessoroptions

[api-evaluate]: #evaluatefile-options

[api-evaluate-options]: #evaluateoptions

[api-evaluate-sync]: #evaluatesyncfile-options

[api-fragment]: #fragment

[api-jsx]: #jsx

[api-jsx-dev]: #jsxdev

[api-node-types]: #nodetypes

[api-processor-options]: #processoroptions

[api-run]: #runcode-options

[api-run-options]: #runoptions

[api-run-sync]: #runsynccode-options

[api-use-mdx-components]: #usemdxcomponents

[astring]: https://github.com/davidbonnet/astring

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/mdx-js/mdx/actions

[build-badge]: https://github.com/mdx-js/mdx/workflows/main/badge.svg

[chat]: https://github.com/mdx-js/mdx/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[coc]: https://github.com/mdx-js/.github/blob/main/code-of-conduct.md

[collective]: https://opencollective.com/unified

[contribute]: https://mdxjs.com/community/contribute/

[coverage]: https://codecov.io/github/mdx-js/mdx

[coverage-badge]: https://img.shields.io/codecov/c/github/mdx-js/mdx/main.svg

[downloads]: https://www.npmjs.com/package/@mdx-js/mdx

[downloads-badge]: https://img.shields.io/npm/dm/@mdx-js/mdx.svg

[esast]: https://github.com/syntax-tree/esast

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[hast]: https://github.com/syntax-tree/hast

[integrations]: https://mdxjs.com/getting-started/#integrations

[mdast]: https://github.com/syntax-tree/mdast

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-mdx]: https://github.com/syntax-tree/mdast-util-mdx

[mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[mdx-syntax]: https://mdxjs.com/docs/what-is-mdx/#mdx-syntax

[mdx-types-components]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/HEAD/types/mdx/types.d.ts#L65

[mdx-types-module]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/HEAD/types/mdx/types.d.ts#L101

[micromark]: https://github.com/micromark/micromark

[micromark-extension-mdxjs]: https://github.com/micromark/micromark-extension-mdxjs

[mit]: https://github.com/mdx-js/mdx/blob/main/packages/mdx/license

[npm]: https://docs.npmjs.com/cli/install

[recma-plugins]: https://github.com/mdx-js/recma/blob/main/doc/plugins.md#list-of-plugins

[rehype-highlight]: https://github.com/rehypejs/rehype-highlight

[rehype-katex]: https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex

[rehype-plugins]: https://github.com/rehypejs/rehype/blob/main/doc/plugins.md#list-of-plugins

[rehype-recma]: https://github.com/mdx-js/recma/tree/main/packages/rehype-recma

[remark-plugins]: https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins

[remark-rehype-options]: https://github.com/remarkjs/remark-rehype#options

[security]: https://mdxjs.com/getting-started/#security

[size]: https://bundlejs.com/?q=@mdx-js/mdx

[size-badge]: https://img.shields.io/bundlejs/size/@mdx-js/mdx

[source-map]: https://github.com/mozilla/source-map

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[support]: https://mdxjs.com/community/support/

[types]: https://mdxjs.com/getting-started/#types

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[unified-pluggable-list]: https://github.com/unifiedjs/unified#pluggablelist

[unified-processor]: https://github.com/unifiedjs/unified#processor

[use]: #use

[using-mdx]: https://mdxjs.com/docs/using-mdx/

[vercel]: https://vercel.com

[vfile]: https://github.com/vfile/vfile

[vfile-compatible]: https://github.com/vfile/vfile#compatible
