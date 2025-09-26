<img src="https://raw.githubusercontent.com/tailwindlabs/prettier-plugin-tailwindcss/main/.github/banner.jpg" alt="prettier-plugin-tailwindcss" />

A [Prettier v3+](https://prettier.io/) plugin for Tailwind CSS v3.0+ that automatically sorts classes based on [our recommended class order](https://tailwindcss.com/blog/automatic-class-sorting-with-prettier#how-classes-are-sorted).

## Installation

To get started, install `prettier-plugin-tailwindcss` as a dev-dependency:

```sh
npm install -D prettier prettier-plugin-tailwindcss
```

Then add the plugin to your [Prettier configuration](https://prettier.io/docs/en/configuration.html):

```json5
// .prettierrc
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

## Upgrading to v0.5.x

As of v0.5.x, this plugin now requires Prettier v3 and is ESM-only. This means it cannot be loaded via `require()`. For more information see our [upgrade guide](https://github.com/tailwindlabs/prettier-plugin-tailwindcss/issues/207#issuecomment-1698071122).

## Options

### Specifying your Tailwind stylesheet path (Tailwind CSS v4+)

When using Tailwind CSS v4 you must specify your CSS file entry point, which includes your theme, custom utilities, and other Tailwind configuration options. To do this, use the `tailwindStylesheet` option in your Prettier configuration.

Note that paths are resolved relative to the Prettier configuration file.

```json5
// .prettierrc
{
  "tailwindStylesheet": "./resources/css/app.css"
}
```

### Specifying your Tailwind JavaScript config path (Tailwind CSS v3)

To ensure that the class sorting takes into consideration any of your project's Tailwind customizations, it needs access to your [Tailwind configuration file](https://tailwindcss.com/docs/configuration) (`tailwind.config.js`).

By default the plugin will look for this file in the same directory as your Prettier configuration file. However, if your Tailwind configuration is somewhere else, you can specify this using the `tailwindConfig` option in your Prettier configuration.

Note that paths are resolved relative to the Prettier configuration file.

```json5
// .prettierrc
{
  "tailwindConfig": "./styles/tailwind.config.js"
}
```

If a local configuration file cannot be found the plugin will fallback to the default Tailwind configuration.

## Sorting non-standard attributes

By default this plugin sorts classes in the `class` attribute, any framework-specific equivalents like `className`, `:class`, `[ngClass]`, and any Tailwind `@apply` directives.

You can sort additional attributes using the `tailwindAttributes` option, which takes an array of attribute names:

```json5
// .prettierrc
{
  "tailwindAttributes": ["myClassList"]
}
```

With this configuration, any classes found in the `myClassList` attribute will be sorted:

```jsx
function MyButton({ children }) {
  return (
    <button myClassList="rounded bg-blue-500 px-4 py-2 text-base text-white">
      {children}
    </button>
  );
}
```

## Sorting classes in function calls

In addition to sorting classes in attributes, you can also sort classes in strings provided to function calls. This is useful when working with libraries like [clsx](https://github.com/lukeed/clsx) or [cva](https://cva.style/).

You can sort classes in function calls using the `tailwindFunctions` option, which takes a list of function names:

```json5
// .prettierrc
{
  "tailwindFunctions": ["clsx"]
}
```

With this configuration, any classes in `clsx()` function calls will be sorted:

```jsx
import clsx from 'clsx'

function MyButton({ isHovering, children }) {
  let classes = clsx(
    'rounded bg-blue-500 px-4 py-2 text-base text-white',
    {
      'bg-blue-700 text-gray-100': isHovering,
    },
  )

  return (
    <button className={classes}>
      {children}
    </button>
  )
}
```

## Sorting classes in template literals

This plugin also enables sorting of classes in tagged template literals.

You can sort classes in template literals using the `tailwindFunctions` option, which takes a list of function names:

```json5
// .prettierrc
{
  "tailwindFunctions": ["tw"],
}
```

With this configuration, any classes in template literals tagged with `tw` will automatically be sorted:

```jsx
import { View, Text } from 'react-native'
import tw from 'twrnc'

function MyScreen() {
  return (
    <View style={tw`bg-white p-4 dark:bg-black`}>
      <Text style={tw`text-md text-black dark:text-white`}>Hello World</Text>
    </View>
  )
}
```

This feature can be used with third-party libraries like `twrnc` or you can create your own tagged template by defining this "identity" function:

```js
const tw = (strings, ...values) => String.raw({ raw: strings }, ...values)
```

Once added, tag your strings with the function and the plugin will sort them:

```js
const mySortedClasses = tw`bg-white p-4 dark:bg-black`
```

## Preserving whitespace

This plugin automatically removes unnecessary whitespace between classes to ensure consistent formatting. If you prefer to preserve whitespace, you can use the `tailwindPreserveWhitespace` option:

```json5
// .prettierrc
{
  "tailwindPreserveWhitespace": true,
}
```

With this configuration, any whitespace surrounding classes will be preserved:

```jsx
import clsx from 'clsx'

function MyButton({ isHovering, children }) {
  return (
    <button className=" rounded  bg-blue-500 px-4  py-2     text-base text-white ">
      {children}
    </button>
  )
}
```

## Preserving duplicate classes

This plugin automatically removes duplicate classes from your class lists. However, this can cause issues in some templating languages, like Fluid or Blade, where we can't distinguish between classes and the templating syntax.

If removing duplicate classes is causing issues in your project, you can use the `tailwindPreserveDuplicates` option to disable this behavior:

```json5
// .prettierrc
{
  "tailwindPreserveDuplicates": true,
}
```

With this configuration, anything we perceive as duplicate classes will be preserved:

```html
<div
  class="
    {f:if(condition: isCompact, then: 'grid-cols-3', else: 'grid-cols-5')}
    {f:if(condition: isDark, then: 'bg-black/50', else: 'bg-white/50')}
    grid gap-4 p-4
  "
>
</div>
```

## Compatibility with other Prettier plugins

This plugin uses Prettier APIs that can only be used by one plugin at a time, making it incompatible with other Prettier plugins implemented the same way. To solve this we've added explicit per-plugin workarounds that enable compatibility with the following Prettier plugins:

- `@ianvs/prettier-plugin-sort-imports`
- `@prettier/plugin-pug`
- `@shopify/prettier-plugin-liquid`
- `@trivago/prettier-plugin-sort-imports`
- `prettier-plugin-astro`
- `prettier-plugin-css-order`
- `prettier-plugin-import-sort`
- `prettier-plugin-jsdoc`
- `prettier-plugin-multiline-arrays`
- `prettier-plugin-organize-attributes`
- `prettier-plugin-organize-imports`
- `prettier-plugin-style-order`
- `prettier-plugin-svelte`
- `prettier-plugin-sort-imports`

One limitation with this approach is that `prettier-plugin-tailwindcss` *must* be loaded last.

```json5
// .prettierrc
{
  // ..
  "plugins": [
    "prettier-plugin-svelte",
    "prettier-plugin-organize-imports",
    "prettier-plugin-tailwindcss" // MUST come last
  ]
}
```
