# PostCSS Pseudo Class Any Link [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install postcss-pseudo-class-any-link --save-dev`

[PostCSS Pseudo Class Any Link] lets you `:any-link` pseudo-class in CSS,
following the [Selectors] specification.

```pcss
nav :any-link > span {
	background-color: yellow;
}

/* becomes */

nav :link > span, nav :visited > span {
	background-color: yellow;
}
nav :any-link > span {
	background-color: yellow;
}
```

## Usage

Add [PostCSS Pseudo Class Any Link] to your project:

```bash
npm install postcss postcss-pseudo-class-any-link --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssPseudoClassAnyLink = require('postcss-pseudo-class-any-link');

postcss([
	postcssPseudoClassAnyLink(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssPseudoClassAnyLink({ preserve: false })
```

```pcss
nav :any-link > span {
	background-color: yellow;
}

/* becomes */

nav :link > span, nav :visited > span {
	background-color: yellow;
}
```

### subFeatures

#### areaHrefNeedsFixing

The `subFeatures.areaHrefNeedsFixing` option determines if `<area href>` elements should match `:any-link` pseudo-class.<br>
In IE and Edge these do not match `:link` or `:visited`.

_This increased CSS bundle size and is disabled by default._

```js
postcssPseudoClassAnyLink({
	subFeatures: {
		areaHrefNeedsFixing: true
	}
})
```

```pcss
nav :any-link > span {
	background-color: yellow;
}

/* becomes */

nav :link > span, nav :visited > span, nav area[href] > span {
	background-color: yellow;
}
nav :any-link > span {
	background-color: yellow;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#any-link-pseudo-class
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/postcss-pseudo-class-any-link

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Pseudo Class Any Link]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-pseudo-class-any-link
[Selectors]: https://www.w3.org/TR/selectors-4/#the-any-link-pseudo
