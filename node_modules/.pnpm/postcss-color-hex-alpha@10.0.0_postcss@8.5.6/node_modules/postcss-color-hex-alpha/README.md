# PostCSS Color Hex Alpha [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install postcss-color-hex-alpha --save-dev`

[PostCSS Color Hex Alpha] lets you use 4 & 8 character hex color notation in
CSS, following the [CSS Color Module] specification.

```pcss
body {
	background: #9d9c;
}

/* becomes */

body {
	background: rgba(153,221,153,0.8);
}
```

## Usage

Add [PostCSS Color Hex Alpha] to your project:

```bash
npm install postcss postcss-color-hex-alpha --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssColorHexAlpha = require('postcss-color-hex-alpha');

postcss([
	postcssColorHexAlpha(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssColorHexAlpha({ preserve: true })
```

```pcss
body {
	background: #9d9c;
}

/* becomes */

body {
	background: rgba(153,221,153,0.8);
	background: #9d9c;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#hexadecimal-alpha-notation
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/postcss-color-hex-alpha

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Color Hex Alpha]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-color-hex-alpha
[CSS Color Module]: https://www.w3.org/TR/css-color-4/#hex-notation
