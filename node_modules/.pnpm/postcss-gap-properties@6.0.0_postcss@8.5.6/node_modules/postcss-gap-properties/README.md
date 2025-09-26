# PostCSS Gap Properties [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install postcss-gap-properties --save-dev`

[PostCSS Gap Properties] lets you use the `gap`, `column-gap`, and `row-gap`
shorthand properties in CSS, following the [CSS Grid Layout] specification.

```pcss
.standard-grid {
	display: grid;
	gap: 20px;
}

.spaced-grid {
	display: grid;
	column-gap: 40px;
	row-gap: 20px;
}

/* becomes */

.standard-grid {
	display: grid;
	grid-gap: 20px;
	gap: 20px;
}

.spaced-grid {
	display: grid;
	grid-column-gap: 40px;
	column-gap: 40px;
	grid-row-gap: 20px;
	row-gap: 20px;
}
```

## Usage

Add [PostCSS Gap Properties] to your project:

```bash
npm install postcss postcss-gap-properties --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssGapProperties = require('postcss-gap-properties');

postcss([
	postcssGapProperties(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssGapProperties({ preserve: false })
```

```pcss
.standard-grid {
	display: grid;
	gap: 20px;
}

.spaced-grid {
	display: grid;
	column-gap: 40px;
	row-gap: 20px;
}

/* becomes */

.standard-grid {
	display: grid;
	grid-gap: 20px;
}

.spaced-grid {
	display: grid;
	grid-column-gap: 40px;
	grid-row-gap: 20px;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#gap-properties
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/postcss-gap-properties

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Gap Properties]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-gap-properties
[CSS Grid Layout]: https://www.w3.org/TR/css-grid-1/#gutters
