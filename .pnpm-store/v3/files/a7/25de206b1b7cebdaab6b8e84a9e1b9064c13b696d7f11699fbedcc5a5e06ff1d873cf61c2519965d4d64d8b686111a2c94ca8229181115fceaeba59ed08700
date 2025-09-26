# [postcss][postcss]-reduce-idents

> Reduce [custom identifiers][idents] with PostCSS.


## Install

With [npm](https://npmjs.org/package/postcss-reduce-idents) do:

```
npm install postcss-reduce-idents --save
```


## Example

### Input

This module will rename custom identifiers in your CSS files; it does so by
converting each name to a index, which is then encoded into a legal identifier.
A legal custom identifier in CSS is case sensitive and must start with a
letter, but can contain digits, hyphens and underscores. There are over 3,000
possible two character identifiers, and 51 possible single character identifiers
that will be generated.

```css
@keyframes whiteToBlack {
    0% {
        color: #fff
    }
    to {
        color: #000
    }
}

.one {
    animation-name: whiteToBlack
}
```

### Output

```css
@keyframes a {
    0% {
        color: #fff
    }
    to {
        color: #000
    }
}

.one {
    animation-name: a
}
```

Note that this module does not handle identifiers that are not linked together.
The following example will not be transformed in any way:

```css
@keyframes fadeOut {
    0% { opacity: 1 }
    to { opacity: 0 }
}

.fadeIn {
    animation-name: fadeIn;
}
```

It works for `@keyframes`, `@counter-style`, custom `counter` values and grid area definitions. See the
[documentation][idents] for more information, or the [tests](src/__tests__) for more
examples.


## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.


## API

### reduceIdents([options])

#### options

##### counter

Type: `boolean`  
Default: `true`

Pass `false` to disable reducing `content`, `counter-reset` and `counter-increment` declarations.

##### keyframes

Type: `boolean`  
Default: `true`

Pass `false` to disable reducing `keyframes` rules and `animation` declarations.

##### counterStyle

Type: `boolean`  
Default: `true`

Pass `false` to disable reducing `counter-style` rules and `list-style` and `system` declarations.

##### gridTemplate

Type: `boolean`  
Default: `true`

Pass `false` to disable reducing `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations.

##### encoder

Type: `function`  
Default: [`lib/encode.js`](https://github.com/cssnano/postcss-reduce-idents/blob/master/src/lib/encode.js)

Pass a custom function to encode the identifier with (e.g.: as a way of prefixing them automatically).

It receives two parameters:
  - A `String` with the node value.
  - A `Number` identifying the index of the occurrence.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).


## License

MIT © [Ben Briggs](http://beneb.info)

[idents]:  https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident

[postcss]: https://github.com/postcss/postcss
