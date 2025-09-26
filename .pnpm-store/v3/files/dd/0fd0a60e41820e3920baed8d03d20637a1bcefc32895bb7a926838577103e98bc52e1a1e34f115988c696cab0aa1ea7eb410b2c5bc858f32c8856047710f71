# PostCSS Overflow Shorthand [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install postcss-overflow-shorthand --save-dev`

[PostCSS Overflow Shorthand] lets you use the `overflow` shorthand in CSS,
following the [CSS Overflow] specification.

```pcss
html {
	overflow: hidden auto;
}

/* becomes */

html {
	overflow-x: hidden;
	overflow-y: auto;
	overflow: hidden auto;
}
```

## Usage

Add [PostCSS Overflow Shorthand] to your project:

```bash
npm install postcss postcss-overflow-shorthand --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssOverflowShorthand = require('postcss-overflow-shorthand');

postcss([
	postcssOverflowShorthand(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssOverflowShorthand({ preserve: false })
```

```pcss
html {
	overflow: hidden auto;
}

/* becomes */

html {
	overflow-x: hidden;
	overflow-y: auto;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#overflow-property
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/postcss-overflow-shorthand

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Overflow Shorthand]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-overflow-shorthand
[CSS Overflow]: https://drafts.csswg.org/css-overflow/#propdef-overflow
