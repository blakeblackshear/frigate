# PostCSS Scope Pseudo Class [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-scope-pseudo-class --save-dev`

[PostCSS Scope Pseudo Class] lets you use the `:scope` Pseudo-class following the [Selectors 4 specification].

```pcss
:scope {
	color: green;
}

/* becomes */

:root {
	color: green;
}
```

## Usage

Add [PostCSS Scope Pseudo Class] to your project:

```bash
npm install postcss @csstools/postcss-scope-pseudo-class --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssScopePseudoClass = require('@csstools/postcss-scope-pseudo-class');

postcss([
	postcssScopePseudoClass(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is not preserved.

```js
postcssScopePseudoClass({ preserve: true })
```

```pcss
:scope {
	color: green;
}

/* becomes */

:root {
	color: green;
}
:scope {
	color: green;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#scope-pseudo-class
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-scope-pseudo-class

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Scope Pseudo Class]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-scope-pseudo-class
[Selectors 4 specification]: https://www.w3.org/TR/selectors-4/#the-scope-pseudo
