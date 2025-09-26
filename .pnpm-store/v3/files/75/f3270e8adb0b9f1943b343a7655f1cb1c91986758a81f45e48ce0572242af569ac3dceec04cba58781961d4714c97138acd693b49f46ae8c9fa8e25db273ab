# PostCSS Logical Viewport Units [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-logical-viewport-units --save-dev`

[PostCSS Logical Viewport Units] lets you easily use `vb` and `vi` length units following the [CSS-Values-4 Specification].

```css
.foo {
	margin: 10vi 20vb;
}

/* becomes */

.foo {
	margin: 10vw 20vh;
	margin: 10vi 20vb;
}
```

## Usage

Add [PostCSS Logical Viewport Units] to your project:

```bash
npm install postcss @csstools/postcss-logical-viewport-units --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssLogicalViewportUnits = require('@csstools/postcss-logical-viewport-units');

postcss([
	postcssLogicalViewportUnits(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### inlineDirection

The `inlineDirection` option allows you to specify the direction of the inline axe. The default value is `left-to-right`, which would match any latin language.

**You should tweak this value so that it is specific to your language and writing mode.**

```js
postcssLogicalViewportUnits({
	inlineDirection: 'top-to-bottom'
})
```

```css
.foo {
	margin: 10vi 20vb;
}

/* becomes */

.foo {
	margin: 10vh 20vw;
	margin: 10vi 20vb;
}
```

Each direction must be one of the following:

- `top-to-bottom`
- `bottom-to-top`
- `left-to-right`
- `right-to-left`

Please do note that transformations won't do anything particular for `right-to-left` or `bottom-to-top`.

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssLogicalViewportUnits({ preserve: false })
```

```css
.foo {
	margin: 10vi 20vb;
}

/* becomes */

.foo {
	margin: 10vw 20vh;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#logical-viewport-units
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-logical-viewport-units

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Logical Viewport Units]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-logical-viewport-units
[CSS-Values-4 Specification]: https://www.w3.org/TR/css-values-4/#viewport-relative-units
