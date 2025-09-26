# PostCSS Media Queries Aspect-Ratio Number Values [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-media-queries-aspect-ratio-number-values --save-dev`

[PostCSS Media Queries Aspect-Ratio Number Values] lets you use non-integer numbers and `calc()` in `aspect-ratio` feature queries following the [Media Queries 4 Specification].

```css
@media (min-aspect-ratio: 1.77) {}

/* becomes */

@media (min-aspect-ratio: 177/100) {}
```

## Usage

Add [PostCSS Media Queries Aspect-Ratio Number Values] to your project:

```bash
npm install postcss @csstools/postcss-media-queries-aspect-ratio-number-values --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssMediaQueriesAspectRatioNumberValues = require('@csstools/postcss-media-queries-aspect-ratio-number-values');

postcss([
	postcssMediaQueriesAspectRatioNumberValues(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssMediaQueriesAspectRatioNumberValues({ preserve: true })
```

```css
@media (min-aspect-ratio: 1.77) {}

/* becomes */

@media (min-aspect-ratio: 1.77),(min-aspect-ratio: 177/100) {}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#media-queries-aspect-ratio-number-values
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-media-queries-aspect-ratio-number-values

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Media Queries Aspect-Ratio Number Values]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-media-queries-aspect-ratio-number-values
[Media Queries 4 Specification]: https://www.w3.org/TR/mediaqueries-4/#aspect-ratio
