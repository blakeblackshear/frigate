# PostCSS Nesting [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

`npm install postcss-nesting --save-dev`

[PostCSS Nesting] lets you nest style rules inside each other, following the [CSS Nesting specification].

If you want nested rules the same way [Sass] works
you might want to use [PostCSS Nested] instead.

```css
.foo {
	color: red;

	&:hover {
		color: green;
	}

	> .bar {
		color: blue;
	}

	@media (prefers-color-scheme: dark) {
		color: cyan;
	}

	color: pink;
}

/* becomes */

.foo {
	color: red;
}
.foo:hover {
		color: green;
	}
.foo  > .bar {
		color: blue;
	}
@media (prefers-color-scheme: dark) {
	.foo {
		color: cyan;
}
	}
.foo {

	color: pink;
}
```

## Usage

Add [PostCSS Nesting] to your project:

```bash
npm install postcss postcss-nesting --save-dev
```

Use it as a [PostCSS] plugin:

```js
const postcss = require('postcss');
const postcssNesting = require('postcss-nesting');

postcss([
	postcssNesting(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */);
```



## Options

### edition

The CSS nesting feature has gone through several iterations and what is currently implemented in browsers is not the same as what was originally proposed. This plugin dates back to the original proposal and you might have written your CSS expecting this older behavior.

You can pick the older behavior by setting the `edition` option.  
The `edition` values correspond with rough dates when of a particular version of the specification:
- `2024-02` (default)
- `2021`

> [!TIP]
> If you wrote nested rules with `@nest` you definitely want to set the `edition` to `2021`.  
> If you are unsure than you should try to omit the `edition` option and use the default.

Eventually we will remove support for the older edition, and this plugin option, so it is strongly advised to update your CSS to the latest edition.


```js
postcssNesting({
	edition: '2024-02'
})
```

#### `2024-02` (default)

- usage of `:is()` pseudo-class in the generated CSS is no longer optional. However you can add [`postcss-is-pseudo-class`](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-is-pseudo-class) to transpile further
- at rules are not combined with the `and` keyword
- `@nest` is removed from the specification
- declarations and nested rules/at-rules are no longer re-ordered

#### `2021`

This version is a continuation of what existed before CSS nesting was implemented in browsers.  
It made a few non-invasive changes to keep up with implementations but it is falling behind.

```css
.foo {
	color: red;

	&:hover {
		color: green;
	}

	> .bar {
		color: blue;
	}

	@media (prefers-color-scheme: dark) {
		color: cyan;
	}

	color: pink;
}

/* becomes */

.foo {
	color: red;

	color: pink;
}
.foo:hover {
		color: green;
	}
.foo > .bar {
		color: blue;
	}
@media (prefers-color-scheme: dark) {
	.foo {
		color: cyan;
}
	}
```

### noIsPseudoSelector (edition: `2021`)

#### Specificity

Before :

```css
#alpha,
.beta {
	&:hover {
		order: 1;
	}
}
```

After **without** the option :

```js
postcssNesting()
```

```css
:is(#alpha,.beta):hover {
	order: 1;
}
```

_`.beta:hover` has specificity as if `.beta` where an id selector, matching the specification._

[specificity: 1, 1, 0](https://polypane.app/css-specificity-calculator/#selector=%3Ais(%23alpha%2C.beta)%3Ahover)

After **with** the option :

```js
postcssNesting({
	noIsPseudoSelector: true
})
```

```css
#alpha:hover, .beta:hover {
	order: 1;
}
```

_`.beta:hover` has specificity as if `.beta` where a class selector, conflicting with the specification._

[specificity: 0, 2, 0](https://polypane.app/css-specificity-calculator/#selector=.beta%3Ahover)


#### Complex selectors

Before :

```css
.alpha > .beta {
	& + & {
		order: 2;
	}
}
```

After **without** the option :

```js
postcssNesting()
```

```css
:is(.alpha > .beta) + :is(.alpha > .beta) {
	order: 2;
}
```

After **with** the option :

```js
postcssNesting({
	noIsPseudoSelector: true
})
```

```css
.alpha > .beta + .alpha > .beta {
	order: 2;
}
```

_this is a different selector than expected as `.beta + .alpha` matches `.beta` followed by `.alpha`._<br>
_avoid these cases when you disable `:is()`_<br>
_writing the selector without nesting is advised here_

```css
/* without nesting */
.alpha > .beta + .beta {
	order: 2;
}
```

[cli-url]: https://github.com/csstools/postcss-plugins/actions/workflows/test.yml?query=workflow/test
[css-url]: https://cssdb.org/#nesting-rules
[discord]: https://discord.gg/bUadyRwkJS
[npm-url]: https://www.npmjs.com/package/postcss-nesting

[PostCSS]: https://github.com/postcss/postcss
[PostCSS Nesting]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting
[PostCSS Nested]: https://github.com/postcss/postcss-nested
[Sass]: https://sass-lang.com/
[CSS Nesting specification]: https://www.w3.org/TR/css-nesting-1/
