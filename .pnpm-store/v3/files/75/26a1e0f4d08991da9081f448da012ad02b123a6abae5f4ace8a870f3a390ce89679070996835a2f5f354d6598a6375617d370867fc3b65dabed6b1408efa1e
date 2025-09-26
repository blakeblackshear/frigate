# PostCSS Content Alt Text [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install @csstools/postcss-content-alt-text --save-dev`

[PostCSS Content Alt Text] generates fallback values for `content` with alt text following the [CSS Generated Content Module].

```css
.foo {
	content: url(tree.jpg) / "A beautiful tree in a dark forest";
}

.bar {
	content: ">" / "";
}

/* becomes */

.foo {
	content: url(tree.jpg)  "A beautiful tree in a dark forest";
	content: url(tree.jpg) / "A beautiful tree in a dark forest";
}

.bar {
	content: ">" ;
	content: ">" / "";
}
```

## Usage

Add [PostCSS Content Alt Text] to your project:

```bash
npm install postcss @csstools/postcss-content-alt-text --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssContentAltText = require('@csstools/postcss-content-alt-text');

postcss([
	postcssContentAltText(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### preserve

The `preserve` option determines whether the original notation
is preserved. By default, it is preserved.

```js
postcssContentAltText({ preserve: false })
```

```css
.foo {
	content: url(tree.jpg) / "A beautiful tree in a dark forest";
}

.bar {
	content: ">" / "";
}

/* becomes */

.foo {
	content: url(tree.jpg)  "A beautiful tree in a dark forest";
}

.bar {
	content: ">" ;
}
```

### stripAltText

The `stripAltText` option determines whether the alt text is removed from the value.  
By default, it is not removed.  
Instead it is added to the `content` value itself to ensure content is accessible.

Only set this to `true` if you are sure the alt text is not needed.

```js
postcssContentAltText({ stripAltText: true })
```

```css
.foo {
	content: url(tree.jpg) / "A beautiful tree in a dark forest";
}

.bar {
	content: ">" / "";
}

/* becomes */

.foo {
	content: url(tree.jpg) ;
	content: url(tree.jpg) / "A beautiful tree in a dark forest";
}

.bar {
	content: ">" ;
	content: ">" / "";
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#content-alt-text
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/@csstools/postcss-content-alt-text

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Content Alt Text]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-content-alt-text
[CSS Generated Content Module]: https://drafts.csswg.org/css-content/#content-property
