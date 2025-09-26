# PostCSS Gamut Mapping [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-gamut-mapping --save-dev`

[PostCSS Gamut Mapping] lets you use wide gamut colors with gamut mapping for specific displays following the [CSS Color 4 Specification].

When out of gamut colors are naively clipped the result can be radically different.  
A saturated and bright color will be much darker after clipping.

To correctly adjust colors for a narrow gamut display, the colors must be mapped.  
This is done by lowering the `chroma` in `oklch` until the color is in gamut.  

Using the `@media (color-gamut)` media feature makes it possible to only use the wide gamut colors on displays that support them.

```css
p {
	background-color: oklch(80% 0.05 0.39 / 0.5);
	color: oklch(20% 0.234 0.39 / 0.5);
	border-color: color(display-p3 0 1 0);
}

/* becomes */

p {
	background-color: oklch(80% 0.05 0.39 / 0.5);
	color: rgba(48, 0, 20, 0.5);
	border-color: rgb(0, 247, 79);
}

@media (color-gamut: rec2020) {
p {
	color: oklch(20% 0.234 0.39 / 0.5);
}
}

@media (color-gamut: p3) {
p {
	border-color: color(display-p3 0 1 0);
}
}
```

## Usage

Add [PostCSS Gamut Mapping] to your project:

```bash
npm install postcss @csstools/postcss-gamut-mapping --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssGamutMapping = require('@csstools/postcss-gamut-mapping');

postcss([
	postcssGamutMapping(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#gamut-mapping
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-gamut-mapping

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Gamut Mapping]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-gamut-mapping
[CSS Color 4 Specification]: https://www.w3.org/TR/css-color-4/#gamut-mapping
