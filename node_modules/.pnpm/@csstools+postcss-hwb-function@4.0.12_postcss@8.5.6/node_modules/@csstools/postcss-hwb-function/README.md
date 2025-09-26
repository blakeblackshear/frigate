# PostCSS HWB Function [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-hwb-function --save-dev`

[PostCSS HWB Function] lets you use the `hwb()` color function in CSS, following [CSS Color Module 4].

```css
a {
	color: hwb(194 0% 0%);
}

b {
	color: hwb(194 0% 0% / .5);
}

/* becomes */

a {
	color: rgb(0, 196, 255);
}

b {
	color: rgba(0, 196, 255, 0.5);
}
```

## Usage

Add [PostCSS HWB Function] to your project:

```bash
npm install postcss @csstools/postcss-hwb-function --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssHWBFunction = require('@csstools/postcss-hwb-function');

postcss([
	postcssHWBFunction(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssHWBFunction({ preserve: true })
```

```css
a {
	color: hwb(194 0% 0%);
}

b {
	color: hwb(194 0% 0% / .5);
}

/* becomes */

a {
	color: rgb(0, 196, 255);
	color: hwb(194 0% 0%);
}

b {
	color: rgba(0, 196, 255, 0.5);
	color: hwb(194 0% 0% / .5);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#hwb-function
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-hwb-function

[PostCSS]: https://github.com/postcss/postcss
[PostCSS HWB Function]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-hwb-function
[CSS Color Module 4]: https://www.w3.org/TR/css-color-4/#the-hwb-notation
