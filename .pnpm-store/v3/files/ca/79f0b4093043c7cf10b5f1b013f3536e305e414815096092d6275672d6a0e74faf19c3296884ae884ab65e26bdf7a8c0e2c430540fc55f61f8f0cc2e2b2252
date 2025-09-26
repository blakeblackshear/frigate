# PostCSS Color Mix Function [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-color-mix-function --save-dev`

[PostCSS Color Mix Function] lets you use the `color-mix()` function following the [CSS Color 5 Specification].

```css
.purple_plum {
	color: color-mix(in lch, purple 50%, plum 50%);
}

/* becomes */

.purple_plum {
	color: rgb(175, 92, 174);
}
```

> [!NOTE]
> We can not dynamically resolve `var()` arguments in `color-mix()`, only static values will work.

## Usage

Add [PostCSS Color Mix Function] to your project:

```bash
npm install postcss @csstools/postcss-color-mix-function --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssColorMixFunction = require('@csstools/postcss-color-mix-function');

postcss([
	postcssColorMixFunction(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssColorMixFunction({ preserve: true })
```

```css
.purple_plum {
	color: color-mix(in lch, purple 50%, plum 50%);
}

/* becomes */

.purple_plum {
	color: rgb(175, 92, 174);
	color: color-mix(in lch, purple 50%, plum 50%);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#color-mix
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-color-mix-function

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Color Mix Function]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-color-mix-function
[CSS Color 5 Specification]: https://www.w3.org/TR/css-color-5/#color-mix
