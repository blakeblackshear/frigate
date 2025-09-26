# PostCSS Gradients Interpolation Method [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-gradients-interpolation-method --save-dev`

[PostCSS Gradients Interpolation Method] lets you use different interpolation methods in CSS gradient functions following [CSS Images Module 4].

```css
.example {
	background-image: linear-gradient(in oklch, hsl(0deg 85% 75%) 0%, hsl(180deg 80% 65%) 100%);
}

:root {
	--background-image: linear-gradient(in oklab, hsl(96, 42%, 24%) 0%, hsl(302, 67%, 25%) 100%);
}

/* becomes */

.example {
	background-image: linear-gradient(rgb(245, 137, 137) 0%, rgb(248, 146, 114), rgb(244, 158, 94), rgb(235, 171, 82), rgb(220, 185, 81), rgb(201, 199, 95), rgb(177, 211, 118), rgb(151, 221, 146), rgb(125, 229, 177), rgb(103, 235, 208), rgb(94, 237, 237) 100%);
	background-image: linear-gradient(in oklch, hsl(0deg 85% 75%) 0%, hsl(180deg 80% 65%) 100%);
}

:root {
	--background-image: linear-gradient(rgb(56, 87, 35) 0%, rgb(64, 83, 46), rgb(70, 79, 54), rgb(76, 74, 62), rgb(82, 69, 68), rgb(86, 64, 75), rgb(91, 58, 81), rgb(95, 51, 87), rgb(99, 44, 93), rgb(103, 34, 98), rgb(106, 21, 104) 100%);
}

@supports (background: linear-gradient(in oklch, red 0%, red 0% 1%, red 2%)) {
:root {
	--background-image: linear-gradient(in oklab, hsl(96, 42%, 24%) 0%, hsl(302, 67%, 25%) 100%);
}
}
```

## Shortcomings

> [!CAUTION]
> Color stops with only a color or only an interpolation hint are not supported.

For best results you should always provide at least the color and position for each color stop.
Double position color stops are supported.

```css
.foo {
	/* Only a color: can't transform */
	background-image: linear-gradient(in oklch, black 0%, green, blue 100%);

	/* Only an interpolation hint: can't transform */
	background-image: linear-gradient(in oklch, black 0%, 25%, blue 100%);
}
```

> [!CAUTION]
> Variable colors are not supported.
> We can not mix colors when the color is a variable.

```css
.foo {
	--red: red;
	/* Color stop variable : can't transform */
	background-image: linear-gradient(in oklch, black 0%, var(--red), blue 100%);
}
```

## Usage

Add [PostCSS Gradients Interpolation Method] to your project:

```bash
npm install postcss @csstools/postcss-gradients-interpolation-method --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssGradientsInterpolationMethod = require('@csstools/postcss-gradients-interpolation-method');

postcss([
	postcssGradientsInterpolationMethod(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssGradientsInterpolationMethod({ preserve: false })
```

```css
.example {
	background-image: linear-gradient(in oklch, hsl(0deg 85% 75%) 0%, hsl(180deg 80% 65%) 100%);
}

:root {
	--background-image: linear-gradient(in oklab, hsl(96, 42%, 24%) 0%, hsl(302, 67%, 25%) 100%);
}

/* becomes */

.example {
	background-image: linear-gradient(rgb(245, 137, 137) 0%, rgb(248, 146, 114), rgb(244, 158, 94), rgb(235, 171, 82), rgb(220, 185, 81), rgb(201, 199, 95), rgb(177, 211, 118), rgb(151, 221, 146), rgb(125, 229, 177), rgb(103, 235, 208), rgb(94, 237, 237) 100%);
}

:root {
	--background-image: linear-gradient(rgb(56, 87, 35) 0%, rgb(64, 83, 46), rgb(70, 79, 54), rgb(76, 74, 62), rgb(82, 69, 68), rgb(86, 64, 75), rgb(91, 58, 81), rgb(95, 51, 87), rgb(99, 44, 93), rgb(103, 34, 98), rgb(106, 21, 104) 100%);
}
```

### enableProgressiveCustomProperties

The `enableProgressiveCustomProperties` option determines whether the original notation
is wrapped with `@supports` when used in Custom Properties. By default, it is enabled.

> [!NOTE]
> We only recommend disabling this when you set `preserve` to `false` or if you bring your own fix for Custom Properties.  
> See what the plugin does in its [README](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-progressive-custom-properties#readme).

```js
postcssGradientsInterpolationMethod({ enableProgressiveCustomProperties: false })
```

```css
.example {
	background-image: linear-gradient(in oklch, hsl(0deg 85% 75%) 0%, hsl(180deg 80% 65%) 100%);
}

:root {
	--background-image: linear-gradient(in oklab, hsl(96, 42%, 24%) 0%, hsl(302, 67%, 25%) 100%);
}

/* becomes */

.example {
	background-image: linear-gradient(rgb(245, 137, 137) 0%, rgb(248, 146, 114), rgb(244, 158, 94), rgb(235, 171, 82), rgb(220, 185, 81), rgb(201, 199, 95), rgb(177, 211, 118), rgb(151, 221, 146), rgb(125, 229, 177), rgb(103, 235, 208), rgb(94, 237, 237) 100%);
	background-image: linear-gradient(in oklch, hsl(0deg 85% 75%) 0%, hsl(180deg 80% 65%) 100%);
}

:root {
	--background-image: linear-gradient(rgb(56, 87, 35) 0%, rgb(64, 83, 46), rgb(70, 79, 54), rgb(76, 74, 62), rgb(82, 69, 68), rgb(86, 64, 75), rgb(91, 58, 81), rgb(95, 51, 87), rgb(99, 44, 93), rgb(103, 34, 98), rgb(106, 21, 104) 100%);
	--background-image: linear-gradient(in oklab, hsl(96, 42%, 24%) 0%, hsl(302, 67%, 25%) 100%);
}
```

_Custom properties do not fallback to the previous declaration_

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#gradients-interpolation-method
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-gradients-interpolation-method

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Gradients Interpolation Method]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-gradients-interpolation-method
[CSS Images Module 4]: https://drafts.csswg.org/css-images-4/#linear-gradients
