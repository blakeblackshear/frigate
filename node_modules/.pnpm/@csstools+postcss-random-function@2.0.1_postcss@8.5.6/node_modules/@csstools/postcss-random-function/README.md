# PostCSS Random Function [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-random-function --save-dev`

[PostCSS Random Function] lets you use the `random` function, following the [CSS Values 5] specification.

```css
div {
	color: oklch(0.7 0.2 random(120deg, 240deg));
}

div {
	color: oklch(0.7 0.2 random(120deg, 240deg, 7deg));
}

div {
	margin: random(10px, 100px) random(10px, 100px);
	padding: random(--padding, 10px, 100px) random(--padding, 10px, 100px);
}

/* becomes */

div {
	color: oklch(0.7 0.2 177.17235deg);
}

div {
	color: oklch(0.7 0.2 176deg);
}

div {
	margin: 41.7525px 70.01679px;
	padding: 44.03856px 44.03856px;
}
```

> [!NOTE]
> Generated values are deterministic pseudo random numbers.
> Generating values twice with the same input will give the same result.
> The input length of the CSS source file is used as a random seed.

## Usage

Add [PostCSS Random Function] to your project:

```bash
npm install postcss @csstools/postcss-random-function --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssRandomFunction = require('@csstools/postcss-random-function');

postcss([
	postcssRandomFunction(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## ⚠️ About custom properties

Given the dynamic nature of custom properties it's impossible to know what the variable value is, which means the plugin can't compute a final value for the stylesheet. 

Because of that, any usage that contains a `var` is skipped.

## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssRandomFunction({ preserve: true })
```

```css
div {
	color: oklch(0.7 0.2 random(120deg, 240deg));
}

div {
	color: oklch(0.7 0.2 random(120deg, 240deg, 7deg));
}

div {
	margin: random(10px, 100px) random(10px, 100px);
	padding: random(--padding, 10px, 100px) random(--padding, 10px, 100px);
}

/* becomes */

div {
	color: oklch(0.7 0.2 177.17235deg);
	color: oklch(0.7 0.2 random(120deg, 240deg));
}

div {
	color: oklch(0.7 0.2 176deg);
	color: oklch(0.7 0.2 random(120deg, 240deg, 7deg));
}

div {
	margin: 41.7525px 70.01679px;
	margin: random(10px, 100px) random(10px, 100px);
	padding: 44.03856px 44.03856px;
	padding: random(--padding, 10px, 100px) random(--padding, 10px, 100px);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#random-function
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-random-function

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Random Function]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-random-function
[CSS Values 5]: https://drafts.csswg.org/css-values-5/#random
