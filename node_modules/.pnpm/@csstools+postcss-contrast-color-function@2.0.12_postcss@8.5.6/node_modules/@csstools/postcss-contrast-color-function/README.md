# PostCSS Contrast Color Function [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-contrast-color-function --save-dev`

[PostCSS Contrast Color Function] lets you dynamically specify a text color with adequate contrast following the [CSS Color 5 Specification].

```css
.color {
	color: contrast-color(oklch(82% 0.2 330));
}

/* becomes */

.color {
	color: rgb(0, 0, 0);
	color: contrast-color(oklch(82% 0.2 330));
}
```

## Usage

Add [PostCSS Contrast Color Function] to your project:

```bash
npm install postcss @csstools/postcss-contrast-color-function --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssContrastColorFunction = require('@csstools/postcss-contrast-color-function');

postcss([
	postcssContrastColorFunction(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssContrastColorFunction({ preserve: false })
```

```css
.color {
	color: contrast-color(oklch(82% 0.2 330));
}

/* becomes */

.color {
	color: rgb(0, 0, 0);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#contrast-color-function
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-contrast-color-function

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Contrast Color Function]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-contrast-color-function
[CSS Color 5 Specification]: https://drafts.csswg.org/css-color-5/#contrast-color
