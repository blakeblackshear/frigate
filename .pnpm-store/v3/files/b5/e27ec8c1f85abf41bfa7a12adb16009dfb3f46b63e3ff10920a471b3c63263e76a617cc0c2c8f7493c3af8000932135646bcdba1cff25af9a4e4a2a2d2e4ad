# PostCSS Place Properties [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install postcss-place --save-dev`

[PostCSS Place Properties] lets you use `place-*` properties as shorthands for `align-*`
and `justify-*`, following the [CSS Box Alignment] specification.

```pcss
.example {
	place-self: center;
	place-content: space-between center;
}

/* becomes */

.example {
	align-self: center;
	justify-self: center;
	place-self: center;
	align-content: space-between;
	justify-content: center;
	place-content: space-between center;
}
```

## Usage

Add [PostCSS Place Properties] to your project:

```bash
npm install postcss postcss-place --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssPlace = require('postcss-place');

postcss([
	postcssPlace(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssPlace({ preserve: false })
```

```pcss
.example {
	place-self: center;
	place-content: space-between center;
}

/* becomes */

.example {
	align-self: center;
	justify-self: center;
	align-content: space-between;
	justify-content: center;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#place-properties
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/postcss-place

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Place Properties]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-place
[CSS Box Alignment]: https://www.w3.org/TR/css-align-3/#place-content
