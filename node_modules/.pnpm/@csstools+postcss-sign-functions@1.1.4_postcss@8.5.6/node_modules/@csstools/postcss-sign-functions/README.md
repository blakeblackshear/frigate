# PostCSS Sign Functions [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-sign-functions --save-dev`

[PostCSS Sign Functions] lets you use the `sign` and `abs` functions, following the [CSS Values 4] specification.

```css
.sign {
	z-index: sign(-10px);
}

.sign {
	z-index: sign(0);
}

.sign {
	z-index: sign(10px);
}

.abs {
	z-index: abs(-10px);
}

.abs {
	z-index: abs(0);
}

.abs {
	z-index: abs(10px);
}

.abs {
	z-index: abs(10%);
}

/* becomes */

.sign {
	z-index: -1;
}

.sign {
	z-index: 0;
}

.sign {
	z-index: 1;
}

.abs {
	z-index: 10px;
}

.abs {
	z-index: 0;
}

.abs {
	z-index: 10px;
}

.abs {
	z-index: max((10%), -1 * (10%));
}
```

> [!NOTE]
> The utility of static fallbacks for `sign` and `abs` is limited.
> The most interesting values are variables and dynamic values (e.g. those containing `%`).
> It is impossible to generate static fallbacks in a build process for values that are dynamic on the client.

## Usage

Add [PostCSS Sign Functions] to your project:

```bash
npm install postcss @csstools/postcss-sign-functions --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssSignFunctions = require('@csstools/postcss-sign-functions');

postcss([
	postcssSignFunctions(/* pluginOptions */)
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
postcssSignFunctions({ preserve: true })
```

```css
.sign {
	z-index: sign(-10px);
}

.sign {
	z-index: sign(0);
}

.sign {
	z-index: sign(10px);
}

.abs {
	z-index: abs(-10px);
}

.abs {
	z-index: abs(0);
}

.abs {
	z-index: abs(10px);
}

.abs {
	z-index: abs(10%);
}

/* becomes */

.sign {
	z-index: -1;
	z-index: sign(-10px);
}

.sign {
	z-index: 0;
	z-index: sign(0);
}

.sign {
	z-index: 1;
	z-index: sign(10px);
}

.abs {
	z-index: 10px;
	z-index: abs(-10px);
}

.abs {
	z-index: 0;
	z-index: abs(0);
}

.abs {
	z-index: 10px;
	z-index: abs(10px);
}

.abs {
	z-index: max((10%), -1 * (10%));
	z-index: abs(10%);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#sign-functions
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-sign-functions

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Sign Functions]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-sign-functions
[CSS Values 4]: https://drafts.csswg.org/css-values-4/#sign-funcs
