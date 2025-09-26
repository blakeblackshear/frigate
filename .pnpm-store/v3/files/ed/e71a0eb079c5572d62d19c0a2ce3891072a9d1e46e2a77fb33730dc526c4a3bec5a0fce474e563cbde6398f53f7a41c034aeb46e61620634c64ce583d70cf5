# PostCSS Alpha Function [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-alpha-function --save-dev`

[PostCSS Alpha Function] lets you use the `alpha` function in
CSS, following the [CSS Color] specification.

```css
.color {
	color: alpha(from #dddd / calc(alpha / 2));
}

:root {
	--a-color: alpha(from rgb(2 1 0 / var(--a)) / calc(alpha / 2));
}

/* becomes */

.color {
	color: rgb(from #dddd r g b / calc(alpha / 2));
}

:root {
	--a-color: rgb(from rgb(2 1 0 / var(--a)) r g b / calc(alpha / 2));
}
```

## Usage

Add [PostCSS Alpha Function] to your project:

```bash
npm install postcss @csstools/postcss-alpha-function --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssAlphaFunction = require('@csstools/postcss-alpha-function');

postcss([
	postcssAlphaFunction(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssAlphaFunction({ preserve: true })
```

```css
.color {
	color: alpha(from #dddd / calc(alpha / 2));
}

:root {
	--a-color: alpha(from rgb(2 1 0 / var(--a)) / calc(alpha / 2));
}

/* becomes */

.color {
	color: rgb(from #dddd r g b / calc(alpha / 2));
	color: alpha(from #dddd / calc(alpha / 2));
}

:root {
	--a-color: rgb(from rgb(2 1 0 / var(--a)) r g b / calc(alpha / 2));
}

@supports (color: alpha(from red / 1)) and (color: rgb(0 0 0 / 0)) {
:root {
	--a-color: alpha(from rgb(2 1 0 / var(--a)) / calc(alpha / 2));
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
postcssAlphaFunction({ enableProgressiveCustomProperties: false })
```

```css
.color {
	color: alpha(from #dddd / calc(alpha / 2));
}

:root {
	--a-color: alpha(from rgb(2 1 0 / var(--a)) / calc(alpha / 2));
}

/* becomes */

.color {
	color: rgb(from #dddd r g b / calc(alpha / 2));
	color: alpha(from #dddd / calc(alpha / 2));
}

:root {
	--a-color: rgb(from rgb(2 1 0 / var(--a)) r g b / calc(alpha / 2));
	--a-color: alpha(from rgb(2 1 0 / var(--a)) / calc(alpha / 2));
}
```

_Custom properties do not fallback to the previous declaration_

## Copyright : color conversions

This software or document includes material copied from or derived from https://github.com/w3c/csswg-drafts/tree/main/css-color-4. Copyright © 2022 W3C® (MIT, ERCIM, Keio, Beihang).

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#alpha-function
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-alpha-function

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Alpha Function]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-alpha-function
[CSS Color]: https://drafts.csswg.org/css-color-5/#relative-alpha
