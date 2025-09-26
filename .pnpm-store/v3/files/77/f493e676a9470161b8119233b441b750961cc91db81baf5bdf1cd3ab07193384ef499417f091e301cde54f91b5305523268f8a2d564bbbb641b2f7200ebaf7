# PostCSS Light Dark Function [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-light-dark-function --save-dev`

[PostCSS Light Dark Function] lets you use the `light-dark` color function in
CSS, following the [CSS Color 5 Specification].

Read more about this feature on mdn:
- define the colors for light and dark with [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)
- define which elements support light and/or dark with [`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)

With both features combined you can mix and match color schemes in a single document, while also respecting the user's preferences.

```css
.foo {
	color: light-dark(pink, magenta);
}

.bar {
	--bar: light-dark(cyan, deepskyblue);
}

/* becomes */

.foo {
	--csstools-light-dark-toggle--0: var(--csstools-color-scheme--light) magenta;
	color: var(--csstools-light-dark-toggle--0, pink);
	color: light-dark(pink, magenta);
}

.bar {
	--csstools-light-dark-toggle--1: var(--csstools-color-scheme--light) deepskyblue;
	--bar: var(--csstools-light-dark-toggle--1, cyan);
	@supports not (color: light-dark(tan, tan)) {

		& * {
	--csstools-light-dark-toggle--1: var(--csstools-color-scheme--light) deepskyblue;
	--bar: var(--csstools-light-dark-toggle--1, cyan);
		}
	}
}

@supports (color: light-dark(red, red)) {
.bar {
	--bar: light-dark(cyan, deepskyblue);
}
}
```

Declare that your document supports both light and dark mode:

```css
:root {
	color-scheme: light dark;
}

/* becomes */

:root {
	--csstools-color-scheme--light: initial;
	color-scheme: light dark;
}@media (prefers-color-scheme: dark) {:root {
	--csstools-color-scheme--light:  ;
}
}
```

Dynamically alter the supported color scheme for some elements:

```css
:root {
	/* Root only supports light mode */
	color-scheme: light;
}

.foo {
	/* This element and its children only support dark mode */
	color-scheme: dark;
}

/* becomes */

:root {
	/* Root only supports light mode */
	--csstools-color-scheme--light: initial;
	color-scheme: light;
}

.foo {
	/* This element and its children only support dark mode */
	--csstools-color-scheme--light:  ;
	color-scheme: dark;
}
```

## Usage

Add [PostCSS Light Dark Function] to your project:

```bash
npm install postcss @csstools/postcss-light-dark-function --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssLightDarkFunction = require('@csstools/postcss-light-dark-function');

postcss([
	postcssLightDarkFunction(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssLightDarkFunction({ preserve: false })
```

```css
.foo {
	color: light-dark(pink, magenta);
}

.bar {
	--bar: light-dark(cyan, deepskyblue);
}

/* becomes */

.foo {
	--csstools-light-dark-toggle--0: var(--csstools-color-scheme--light) magenta;
	color: var(--csstools-light-dark-toggle--0, pink);
}

.bar {
	--csstools-light-dark-toggle--1: var(--csstools-color-scheme--light) deepskyblue;
	--bar: var(--csstools-light-dark-toggle--1, cyan);
	& * {
	--csstools-light-dark-toggle--1: var(--csstools-color-scheme--light) deepskyblue;
	--bar: var(--csstools-light-dark-toggle--1, cyan);
	}
}
```

### enableProgressiveCustomProperties

The `enableProgressiveCustomProperties` option determines whether the original notation
is wrapped with `@supports` when used in Custom Properties. By default, it is enabled.

> [!NOTE]
> We only recommend disabling this when you set `preserve` to `false` or if you bring your own fix for Custom Properties.  
> See what the plugin does in its [README](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-progressive-custom-properties#readme).

```js
postcssLightDarkFunction({ enableProgressiveCustomProperties: false })
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#light-dark-function
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-light-dark-function

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Light Dark Function]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-light-dark-function
[CSS Color 5 Specification]: https://drafts.csswg.org/css-color-5/#light-dark
