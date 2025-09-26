[![Build Status][ci-img]][ci] [![codecov][codecov-img]][codecov] [![npm][npm-img]][npm]

# CSS Modules: Local by Default

Transformation examples:

Selectors (mode `local`, by default)::

<!-- prettier-ignore-start -->
```css
.foo { ... } /* => */ :local(.foo) { ... }

.foo .bar { ... } /* => */ :local(.foo) :local(.bar) { ... }

/* Shorthand global selector */

:global .foo .bar { ... } /* => */ .foo .bar { ... }

.foo :global .bar { ... } /* => */ :local(.foo) .bar { ... }

/* Targeted global selector */

:global(.foo) .bar { ... } /* => */ .foo :local(.bar) { ... }

.foo:global(.bar) { ... } /* => */ :local(.foo).bar { ... }

.foo :global(.bar) .baz { ... } /* => */ :local(.foo) .bar :local(.baz) { ... }

.foo:global(.bar) .baz { ... } /* => */ :local(.foo).bar :local(.baz) { ... }
```
<!-- prettier-ignore-end -->

Declarations (mode `local`, by default):

<!-- prettier-ignore-start -->
```css
.foo {
  animation-name: fadeInOut, global(moveLeft300px), local(bounce);
}

.bar {
  animation: rotate 1s, global(spin) 3s, local(fly) 6s;
}

/* => */ 

:local(.foo) {
  animation-name: :local(fadeInOut), moveLeft300px, :local(bounce);
}

:local(.bar) {
  animation: :local(rotate) 1s, spin 3s, :local(fly) 6s;
}
```
<!-- prettier-ignore-end -->

## Pure Mode

In pure mode, all selectors must contain at least one local class or id
selector

To ignore this rule for a specific selector, add the a `/* cssmodules-pure-ignore */` comment in front
of the selector:

```css
/* cssmodules-pure-ignore */
:global(#modal-backdrop) {
  ...;
}
```

or by adding a `/* cssmodules-pure-no-check */` comment at the top of a file to disable this check for the whole file:

```css
/* cssmodules-pure-no-check */

:global(#modal-backdrop) {
  ...;
}

:global(#my-id) {
  ...;
}
```

## Building

```bash
$ npm install
$ npm test
```

- Build: [![Build Status][ci-img]][ci]
- Lines: [![coveralls][coveralls-img]][coveralls]
- Statements: [![codecov][codecov-img]][codecov]

## Development

```bash
$ yarn test:watch
```

## License

MIT

## With thanks

- [Tobias Koppers](https://github.com/sokra)
- [Glen Maddern](https://github.com/geelen)

---

Mark Dalgleish, 2015.

[ci-img]: https://github.com/css-modules/postcss-modules-local-by-default/actions/workflows/nodejs.yml/badge.svg
[ci]: https://github.com/css-modules/postcss-modules-local-by-default/actions/workflows/nodejs.yml
[npm-img]: https://img.shields.io/npm/v/postcss-modules-local-by-default.svg?style=flat-square
[npm]: https://www.npmjs.com/package/postcss-modules-local-by-default
[coveralls-img]: https://img.shields.io/coveralls/css-modules/postcss-modules-local-by-default/master.svg?style=flat-square
[coveralls]: https://coveralls.io/r/css-modules/postcss-modules-local-by-default?branch=master
[codecov-img]: https://img.shields.io/codecov/c/github/css-modules/postcss-modules-local-by-default/master.svg?style=flat-square
[codecov]: https://codecov.io/github/css-modules/postcss-modules-local-by-default?branch=master
