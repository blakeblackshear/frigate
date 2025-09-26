# PostCSS Initial [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-initial --save-dev`

[PostCSS Initial] fallback the `initial` keyword following the [CSS Cascade 4 Specification].

```css
.foo {
	border: initial;
}

/* becomes */

.foo {
	border: medium none currentcolor;
	border: initial;
}
```

_See prior work by [maximkoretskiy](https://github.com/maximkoretskiy) here [postcss-initial](https://github.com/maximkoretskiy/postcss-initial)
To ensure long term maintenance and to provide the needed features this plugin was recreated based on maximkoretskiy's work._

## Usage

Add [PostCSS Initial] to your project:

```bash
npm install postcss @csstools/postcss-initial --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssInitial = require('@csstools/postcss-initial');

postcss([
	postcssInitial(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssInitial({ preserve: false })
```

```css
.foo {
	border: initial;
}

/* becomes */

.foo {
	border: medium none currentcolor;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#all-property
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-initial

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Initial]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-initial
[CSS Cascade 4 Specification]: https://www.w3.org/TR/css-cascade-4/#initial
