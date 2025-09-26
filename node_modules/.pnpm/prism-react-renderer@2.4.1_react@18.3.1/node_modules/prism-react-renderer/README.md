<a href="https://commerce.nearform.com/open-source/" target="_blank">
  <img alt="Prism React Renderer" src="https://oss.nearform.com/api/banner.svg?text=prism+react+renderer" />
</a>

<p align="center" style="font-size: 1.2rem;">
  A lean <a href="https://github.com/PrismJS/prism">Prism</a> highlighter component for React
</p>

<p align="center">
  <a href="https://npmjs.com/package/prism-react-renderer"><img src="https://img.shields.io/npm/dm/prism-react-renderer.svg"></a>
  <a href="https://npmjs.com/package/prism-react-renderer"><img src="https://img.shields.io/npm/v/prism-react-renderer.svg"></a>
  <a href="https://github.com/FormidableLabs/prism-react-renderer#maintenance-status">
    <img alt="Maintenance Status" src="https://img.shields.io/badge/maintenance-active-green.svg" />
  </a>
</p>

<p align="center">
  Comes with everything to render Prismjs syntax highlighted code directly in React & React Native!
</p>

## Introduction

Prism React Renderer powers syntax highlighting in the amazing [Docusaurus](https://docusaurus.io/) framework and many others.

This library tokenises code using Prism and provides a small render-props-driven
component to quickly render it out into React. This is why it even works with
React Native! It's bundled with a modified version of Prism that won't pollute
the global namespace and comes with
[a couple of common language syntaxes](./packages/generate-prism-languages/index.ts#L9-L23).

_(There's also an [escape-hatch](https://github.com/FormidableLabs/prism-react-renderer#prism) to use your own Prism setup, just in case)_

It also comes with its own [VSCode-like theming format](#theming), which means by default
you can easily drop in different themes, use the ones this library ships with, or
create new ones programmatically on the fly.

_(If you just want to use your Prism CSS-file themes, that's also no problem)_

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
  - [Usage](#usage)
  - [Custom Language Support](#custom-language-support)
- [Basic Props](#basic-props)
  - [children](#children)
  - [language](#language)
  - [code](#code)
- [Advanced Props](#advanced-props)
  - [theme](#theme)
  - [prism](#prism)
- [Children Function](#children-function)
  - [state](#state)
  - [prop getters](#prop-getters)
    - [`getLineProps`](#getlineprops)
    - [`getTokenProps`](#gettokenprops)
- [Utility Functions](#utility-functions)
  - [`normalizeTokens`](#normalizetokens)
  - [`useTokenize`](#usetokenize)
- [Theming](#theming)
- [Upgrading from v1 to v2](#upgrade)
- [LICENSE](#license)
- [Maintenance Status](#maintenance-status)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

This module is distributed via npm which is bundled with node and
should be installed as one of your project's `dependencies`:

```sh
# npm
npm install --save prism-react-renderer
# yarn
yarn add prism-react-renderer
# pnpm
pnpm add prism-react-renderer
```

> Prism React Renderer has a peer dependency on `react`

### Usage
Prism React Renderer has a named export for the `<Highlight />` component along with `themes`. To see Prism React Render in action with base styling check out `packages/demo` or run `pnpm run start:demo` from the root of this repository.

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { Highlight, themes } from "prism-react-renderer"
import styles from 'styles.module.css'

const codeBlock = `
const GroceryItem: React.FC<GroceryItemProps> = ({ item }) => {
  return (
    <div>
      <h2>{item.name}</h2>
      <p>Price: {item.price}</p>
      <p>Quantity: {item.quantity}</p>
    </div>
  );
}
`

export const App = () => (
  <Highlight
    theme={themes.shadesOfPurple}
    code={codeBlock}
    language="tsx"
  >
    {({ className, style, tokens, getLineProps, getTokenProps }) => (
      <pre style={style}>
        {tokens.map((line, i) => (
          <div key={i} {...getLineProps({ line })}>
            <span>{i + 1}</span>
            {line.map((token, key) => (
              <span key={key} {...getTokenProps({ token })} />
            ))}
          </div>
        ))}
      </pre>
    )}
  </Highlight>
)

ReactDOM
  .createRoot(document.getElementById("root") as HTMLElement)
  .render(<App />)
```

### Custom Language Support

By default `prism-react-renderer` only includes a [base set of languages](https://github.com/FormidableLabs/prism-react-renderer/blob/c914fdea48625ba59c8022174bb3df1ed802ce4d/packages/generate-prism-languages/index.ts#L9-L23) that Prism supports. 

> _Note_: Some languages (such as Javascript) are part of the bundle of other languages

**Depending on your app's build system you may need to `await` the `import` or use `require` to ensure `window.Prism` exists before importing the custom languages.** You can add support for more by including their definitions from the main `prismjs` package:

```js
import { Highlight, Prism } from "prism-react-renderer";

(typeof global !== "undefined" ? global : window).Prism = Prism
await import("prismjs/components/prism-applescript")
/** or **/
require("prismjs/components/prism-applescript")
```


## Basic Props

This is the list of props that you should probably know about. There are some
[advanced props](#advanced-props) below as well.

Most of these [advanced props](#advanced-props) are included in the `defaultProps`.

### children

> `function({})` | _required_

This is called with an object. Read more about the properties of this object in
the section "[Children Function](#children-function)".

### language

> `string` | _required_

This is the language that your code will be highlighted as. You can see a list
of all languages that are supported out of the box [here](./packages/generate-prism-languages/index.ts#L9-L23). Not all languages are included and the list of languages that are currently is a little arbitrary. You can use the [escape-hatch](https://github.com/FormidableLabs/prism-react-renderer#prism) to use your own Prism setup, just in case, or [add more languages to the bundled Prism.](https://github.com/FormidableLabs/prism-react-renderer#faq)

### code

> `string` | _required_

This is the code that will be highlighted.

## Advanced Props

### theme

> `PrismTheme` | _optional; default is vsDark_

If a theme is passed, it is used to generate style props which can be retrieved
via the prop-getters which are described in "[Children Function](#children-function)".

Read more about how to theme `prism-react-renderer` in
the section "[Theming](#theming)".

### prism

> `prism` | _optional; default is the vendored version_

This is the [Prismjs](https://github.com/PrismJS/prism) library itself.
A vendored version of Prism is provided (and also exported) as part of this library.
This vendored version doesn't pollute the global namespace, is slimmed down,
and doesn't conflict with any installation of `prismjs` you might have.

If you're only using `Prism.highlight` you can choose to use `prism-react-renderer`'s
exported, vendored version of Prism instead.

But if you choose to use your own Prism setup, simply pass Prism as a prop:

```jsx
// Whichever way you're retrieving Prism here:
import Prism from 'prismjs/components/prism-core';

<Highlight prism={Prism} {/* ... */} />
```

## Children Function

This is where you render whatever you want to based on the output of `<Highlight />`.
You use it like so:

```js
const ui = (
  <Highlight>
    {highlight => (
      // use utilities and prop getters here, like highlight.className, highlight.getTokenProps, etc.
      <pre>{/* more jsx here */}</pre>
    )}
  </Highlight>
);
```

The properties of this `highlight` object can be split into two categories as indicated below:

### state

These properties are the flat output of `<Highlight />`. They're generally "state" and are what
you'd usually expect from a render-props-based API.

| property    | type        | description                                                                                                                  |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `tokens`    | `Token[][]` | This is a doubly nested array of tokens. The outer array is for separate lines, the inner for tokens, so the actual content. |
| `className` | `string`    | This is the class you should apply to your wrapping element, typically a `<pre>`                                             |

A "Token" is an object that represents a piece of content for Prism. It has a `types` property, which is an array
of types that indicate the purpose and styling of a piece of text, and a `content` property, which is the actual
text.

You'd typically iterate over `tokens`, rendering each line, and iterate over its items, rendering out each token, which is a piece of
this line.

### prop getters

> See
> [Kent C. Dodds' blog post about prop getters](https://blog.kentcdodds.com/how-to-give-rendering-control-to-users-with-prop-getters-549eaef76acf)

These functions are used to apply props to the elements that you render. This
gives you maximum flexibility to render what, when, and wherever you like.

You'd typically call these functions with some dictated input and add on all other
props that it should pass through. It'll correctly override and modify the props
that it returns to you, so passing props to it instead of adding them directly is
advisable.

| property        | type           | description                                                                                           |
| --------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| `getLineProps`  | `function({})` | returns the props you should apply to any list of tokens, i.e. the element that contains your tokens. |
| `getTokenProps` | `function({})` | returns the props you should apply to the elements displaying tokens that you render.                 |

#### `getLineProps`

You need to add a `line` property (type: `Token[]`) to the object you're passing to
`getLineProps`.

This getter will return you props to spread onto your line elements (typically `<div>s`).

It will typically return a `className` (if you pass one it'll be appended), `children`,
`style` (if you pass one it'll be merged). It also passes on all other props you pass
to the input.

The `className` will always contain `.token-line`.

#### `getTokenProps`

You need to add a `token` property (type: `Token`) to the object you're passing to
`getTokenProps`.

This getter will return you props to spread onto your token elements (typically `<span>s`).

It will typically return a `className` (if you pass one it'll be appended), `children`,
`style` (if you pass one it'll be merged). It also passes on all other props you pass
to the input.

The `className` will always contain `.token`. This also provides full compatibility with
your old Prism CSS-file themes.

## Utility Functions

### `useTokenize`

> `(options: TokenizeOptions) => Token[][]`

```ts
type TokenizeOptions = {
  prism: PrismLib
  code: string
  grammar?: PrismGrammar
  language: Language
}

```

This is a React hook that tokenizes code using Prism. It returns an array of tokens that can be rendered using the built-in `<Highlight />` component or your own custom component. It uses `normalizeTokens` internally to convert the tokens into a shape that can be rendered.

- `prism: PrismLib`: the Prism library to use for tokenization. This can be the vendored version of Prism that is included with `prism-react-renderer` or a custom version of Prism that you have configured.

- `code: string`: a string containing the code to tokenize.
- `grammar?: PrismGrammar`: a Prism grammar object to use for tokenization. If this is omitted, the tokens will just be normalized. A grammar can be obtained from `Prism.languages` or by importing a language from `prismjs/components/`.
- `language: Language`: the language to use for tokenization. This should be a language that Prism supports.

### `normalizeTokens`

> `(tokens: (PrismToken | string)[]) => Token[][]`

Takes an array of Prism’s tokens and groups them by line, converting strings into tokens. Tokens can become recursive in some cases which means that their types are concatenated. Plain-string tokens however are always of type `plain`.

- `PrismToken` is an internal alias for `Token` exported by `prismjs` and is defined [here](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/prismjs/index.d.ts#L347).

- `Token` is an internal object that represents a slice of tokenized content for Prism with three properties:
  - `types: string[]`: an array of types that indicate the purpose and styling of a piece of text
  - `content: string`: the content of the token
  - `empty: boolean`: a flag indicating whether the token is empty or not.

## Theming

The `defaultProps` you'd typically apply in a basic use-case, contain a default theme.
This theme is [vsDark](./packages/prism-react-renderer/src/themes/vsDark.ts).

While all `className`s are provided with `<Highlight />`, so that you could use your good
old Prism CSS-file themes, you can also choose to use `prism-react-renderer`'s themes like so:

```jsx
import { Highlight, themes } from 'prism-react-renderer';

<Highlight theme={themes.dracula} {/* ... */} />
```

These themes are JSON-based and are heavily inspired by VSCode's theme format.

Their syntax, expressed in Flow looks like the following:

```js
{
  plain: StyleObj,
  styles: Array<{
    types: string[],
    languages?: string[],
    style: StyleObj
  }>
}
```

The `plain` property provides a base style-object. This style object is directly used
in the `style` props that you'll receive from the prop getters, if a `theme` prop has
been passed to `<Highlight />`.

The `styles` property contains an array of definitions. Each definition contains a `style`
property, that is also just a style object. These styles are limited by the `types`
and `languages` properties.

The `types` properties is an array of token types that Prism outputs. The `languages`
property limits styles to highlighted languages.

When converting a Prism CSS theme it's mostly just necessary to use classes as
`types` and convert the declarations to object-style-syntax and put them on `style`.

## Upgrade

If you are migrating from v1.x to v2.x, follow these steps

### Change module imports

```diff
- import Highlight, { defaultProps } from "prism-react-renderer";
+ import { Highlight } from "prism-react-renderer"

const Content = (
-  <Highlight {...defaultProps} code={exampleCode} language="jsx">
+  <Highlight code={exampleCode} language="jsx">
```

### Change theme imports

```diff
- const theme = require('prism-react-renderer/themes/github')
+ const theme = require('prism-react-renderer').themes.github
```

### Check language support

> By default prism-react-renderer only includes a base set of languages that Prism supports. Depending on your app's build system you may need to await the import or use require to ensure window.Prism exists before importing the custom languages.

See: https://github.com/FormidableLabs/prism-react-renderer#custom-language-support

Install prismjs (if not available yet):

```
# npm
npm install --save prismjs
# yarn
yarn add prismjs
# pnpm
pnpm add prismjs
```

### Add language component

If the language is not already bundled in the above, you can add additional languages with the following code:

```
import { Highlight, Prism } from "prism-react-renderer";

(typeof global !== "undefined" ? global : window).Prism = Prism
await import("prismjs/components/prism-applescript")
/** or **/
require("prismjs/components/prism-applescript")
```

## LICENSE

MIT

## Maintenance Status

**Active:** Nearform is actively working on this project, and we expect to continue work for the foreseeable future. Bug reports, feature requests and pull requests are welcome.

[maintenance-image]: https://img.shields.io/badge/maintenance-active-green.svg
