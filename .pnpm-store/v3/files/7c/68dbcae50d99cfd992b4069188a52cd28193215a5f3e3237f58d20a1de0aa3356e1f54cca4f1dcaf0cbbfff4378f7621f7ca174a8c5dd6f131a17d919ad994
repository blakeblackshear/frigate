# PostCSS Text Decoration Shorthand [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-text-decoration-shorthand --save-dev`

[PostCSS Text Decoration Shorthand] lets you use `text-decoration` as a shorthand following the [Text Decoration Specification].

```css
.example {
	text-decoration: wavy underline purple 25%;
}

/* becomes */

.example {
	text-decoration: underline;
	text-decoration: underline wavy purple;
	text-decoration-thickness: calc(0.01em * 25);
	text-decoration: wavy underline purple 25%;
}
```

## Usage

Add [PostCSS Text Decoration Shorthand] to your project:

```bash
npm install postcss @csstools/postcss-text-decoration-shorthand --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssTextDecorationShorthand = require('@csstools/postcss-text-decoration-shorthand');

postcss([
	postcssTextDecorationShorthand(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssTextDecorationShorthand({ preserve: false })
```

```css
.example {
	text-decoration: wavy underline purple 25%;
}

/* becomes */

.example {
	text-decoration: underline;
	text-decoration: underline wavy purple;
	text-decoration-thickness: calc(0.01em * 25);
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#text-decoration-shorthand
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-text-decoration-shorthand

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Text Decoration Shorthand]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-text-decoration-shorthand
[Text Decoration Specification]: https://drafts.csswg.org/css-text-decor-4/#text-decoration-property
