# PostCSS Color Function Display P3 Linear [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-color-function-display-p3-linear --save-dev`

[PostCSS Color Function Display P3 Linear] lets you use the `display-p3-linear` color space in the `color` function in
CSS, following the [CSS Color] specification.

```css
.color {
	color: color(display-p3-linear 0.3081 0.014 0.0567);
}

:root {
	--a-color: color(display-p3-linear 0.3081 0.014 0.0567);
}

/* becomes */

.color {
	color: color(display-p3 0.59096 0.12316 0.26409);
}

:root {
	--a-color: color(display-p3 0.59096 0.12316 0.26409);
}
```

## Usage

Add [PostCSS Color Function Display P3 Linear] to your project:

```bash
npm install postcss @csstools/postcss-color-function-display-p3-linear --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssColorFunctionDisplayP3Linear = require('@csstools/postcss-color-function-display-p3-linear');

postcss([
	postcssColorFunctionDisplayP3Linear(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssColorFunctionDisplayP3Linear({ preserve: true })
```

```css
.color {
	color: color(display-p3-linear 0.3081 0.014 0.0567);
}

:root {
	--a-color: color(display-p3-linear 0.3081 0.014 0.0567);
}

/* becomes */

.color {
	color: color(display-p3 0.59096 0.12316 0.26409);
	color: color(display-p3-linear 0.3081 0.014 0.0567);
}

:root {
	--a-color: color(display-p3 0.59096 0.12316 0.26409);
}

@supports (color: color(display-p3-linear 0 0 0)) {
:root {
	--a-color: color(display-p3-linear 0.3081 0.014 0.0567);
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
postcssColorFunctionDisplayP3Linear({ enableProgressiveCustomProperties: false })
```

```css
.color {
	color: color(display-p3-linear 0.3081 0.014 0.0567);
}

:root {
	--a-color: color(display-p3-linear 0.3081 0.014 0.0567);
}

/* becomes */

.color {
	color: color(display-p3 0.59096 0.12316 0.26409);
	color: color(display-p3-linear 0.3081 0.014 0.0567);
}

:root {
	--a-color: color(display-p3 0.59096 0.12316 0.26409);
	--a-color: color(display-p3-linear 0.3081 0.014 0.0567);
}
```

_Custom properties do not fallback to the previous declaration_

## Copyright : color conversions

This software or document includes material copied from or derived from https://github.com/w3c/csswg-drafts/tree/main/css-color-4. Copyright © 2022 W3C® (MIT, ERCIM, Keio, Beihang).

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#color-function-display-p3-linear
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-color-function-display-p3-linear

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Color Function Display P3 Linear]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-color-function-display-p3-linear
[CSS Color]: https://drafts.csswg.org/css-color-4/#predefined-display-p3-linear
