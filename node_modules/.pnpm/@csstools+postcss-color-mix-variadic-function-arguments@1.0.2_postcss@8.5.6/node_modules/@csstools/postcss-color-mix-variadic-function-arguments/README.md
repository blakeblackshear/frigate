# PostCSS Color Mix Variadic Function Arguments [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-color-mix-variadic-function-arguments --save-dev`

[PostCSS Color Mix Variadic Function Arguments] lets you use the `color-mix()` function with any number of arguments following the [CSS Color 5 Specification].

```css
.red {
	color: color-mix(in srgb, red);
}

.grey {
	color: color-mix(in srgb, red, lime, blue);
}

/* becomes */

.red {
	color: rgb(255, 0, 0);
}

.grey {
	color: rgb(85, 85, 85);
}
```

> [!NOTE]
> We can not dynamically resolve `var()` arguments in `color-mix()`, only static values will work.

## Usage

Add [PostCSS Color Mix Variadic Function Arguments] to your project:

```bash
npm install postcss @csstools/postcss-color-mix-variadic-function-arguments --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssColorMixVariadicFunctionArguments = require('@csstools/postcss-color-mix-variadic-function-arguments');

postcss([
	postcssColorMixVariadicFunctionArguments(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssColorMixVariadicFunctionArguments({ preserve: true })
```

```css
.red {
	color: color-mix(in srgb, red);
}

.grey {
	color: color-mix(in srgb, red, lime, blue);
}

/* becomes */

.red {
	color: rgb(255, 0, 0);
	color: color-mix(in srgb, red);
}

.grey {
	color: rgb(85, 85, 85);
	color: color-mix(in srgb, red, lime, blue);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#color-mix-variadic-function-arguments
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-color-mix-variadic-function-arguments

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Color Mix Variadic Function Arguments]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-color-mix-variadic-function-arguments
[CSS Color 5 Specification]: https://www.w3.org/TR/css-color-5/#color-mix
