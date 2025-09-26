# PostCSS Logical Float And Clear [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-logical-float-and-clear --save-dev`

[PostCSS Logical Float And Clear] lets you use logical, rather than physical, direction and dimension mappings in CSS, following the [CSS Logical Properties and Values] specification.

```pcss
.element {
	clear: inline-start;
	float: inline-end;
}

/* becomes */

.element {
	clear: left;
	float: right;
}
```

## Usage

Add [PostCSS Logical Float And Clear] to your project:

```bash
npm install postcss @csstools/postcss-logical-float-and-clear --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssLogicalFloatAndClear = require('@csstools/postcss-logical-float-and-clear');

postcss([
	postcssLogicalFloatAndClear(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### inlineDirection

The `inlineDirection` option allows you to specify the direction of the inline axe. The default value is `left-to-right`, which would match any latin language.

**You should tweak this value so that it is specific to your language and writing mode.**

```js
postcssLogicalFloatAndClear({
	inlineDirection: 'right-to-left'
})
```

```pcss
.element {
	clear: inline-start;
	float: inline-end;
}

/* becomes */

.element {
	clear: right;
	float: left;
}
```

Each direction must be one of the following:

- `top-to-bottom`
- `bottom-to-top`
- `left-to-right`
- `right-to-left`

Please do note that transformations won't run if `inlineDirection` becomes vertical.

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#float-clear-logical-values
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-logical-float-and-clear

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Logical Float And Clear]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-logical-float-and-clear
[CSS Logical Properties and Values]: https://www.w3.org/TR/css-logical-1/#float-clear
