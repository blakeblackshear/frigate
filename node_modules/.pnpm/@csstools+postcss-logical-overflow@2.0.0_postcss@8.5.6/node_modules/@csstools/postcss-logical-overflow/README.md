# PostCSS Logical Overflow [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-logical-overflow --save-dev`

[PostCSS Logical Overflow] lets you use `overflow-inline` and `overflow-block` properties following the [CSS Overflow Specification].

```pcss
.inline {
	overflow-inline: clip;
}

.block {
	overflow-block: scroll;
}

/* becomes */

.inline {
	overflow-x: clip;
}

.block {
	overflow-y: scroll;
}
```

## Usage

Add [PostCSS Logical Overflow] to your project:

```bash
npm install postcss @csstools/postcss-logical-overflow --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssLogicalOverflow = require('@csstools/postcss-logical-overflow');

postcss([
	postcssLogicalOverflow(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### inlineDirection

The `inlineDirection` option allows you to specify the direction of the inline axe. The default value is `left-to-right`, which would match any latin language.

**You should tweak this value so that it is specific to your language and writing mode.**

```js
postcssLogicalOverflow({
	inlineDirection: 'top-to-bottom'
})
```

```pcss
.inline {
	overflow-inline: clip;
}

.block {
	overflow-block: scroll;
}

/* becomes */

.inline {
	overflow-y: clip;
}

.block {
	overflow-x: scroll;
}
```

Each direction must be one of the following:

- `top-to-bottom`
- `bottom-to-top`
- `left-to-right`
- `right-to-left`

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#logical-overflow
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-logical-overflow

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Logical Overflow]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-logical-overflow
[CSS Overflow Specification]: https://www.w3.org/TR/css-overflow-3/#overflow-control
