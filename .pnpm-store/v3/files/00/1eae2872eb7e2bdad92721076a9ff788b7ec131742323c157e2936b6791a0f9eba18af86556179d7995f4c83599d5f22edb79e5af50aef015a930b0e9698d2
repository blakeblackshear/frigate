# PostCSS Relative Color Syntax [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-relative-color-syntax --save-dev`

[PostCSS Relative Color Syntax] lets you use the relative color syntax in CSS color functions following [CSS Color Module 5].

```css
.example {
	background: oklab(from oklab(54.3% -22.5% -5%) calc(1.0 - l) calc(a * 0.8) b);
}

/* becomes */

.example {
	background: rgb(12, 100, 100);
}
```

> [!NOTE]
> We can not dynamically resolve `var()` arguments in relative color syntax, only static values will work.

## Usage

Add [PostCSS Relative Color Syntax] to your project:

```bash
npm install postcss @csstools/postcss-relative-color-syntax --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssRelativeColorSyntax = require('@csstools/postcss-relative-color-syntax');

postcss([
	postcssRelativeColorSyntax(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssRelativeColorSyntax({ preserve: true })
```

```css
.example {
	background: oklab(from oklab(54.3% -22.5% -5%) calc(1.0 - l) calc(a * 0.8) b);
}

/* becomes */

.example {
	background: rgb(12, 100, 100);
	background: oklab(from oklab(54.3% -22.5% -5%) calc(1.0 - l) calc(a * 0.8) b);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#relative-color-syntax
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-relative-color-syntax

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Relative Color Syntax]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-relative-color-syntax
[CSS Color Module 5]: https://www.w3.org/TR/css-color-5/#relative-colors
