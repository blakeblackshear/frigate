# [postcss][postcss]-zindex

> Reduce z-index values with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-zindex) do:

```
npm install postcss-zindex --save
```

## Example

Sometimes, you may introduce z-index values into your CSS that are larger than
necessary, in order to improve your understanding of how each stack relates to
the others. For example, you might have a modal overlay at `5000` and the dialog
for it at `5500` - so that modal classes occupy the `5xxx` space.

But in production, it is unnecessary to use such large values for z-index where
smaller values would suffice. This module will reduce all z-index declarations
whilst respecting your original intent; such that the overlay becomes `1` and
the dialog becomes `2`. For more examples, see the [tests](test/index.js).

### Input

```css
.modal {
    z-index: 5000
}

.modal-overlay {
    z-index: 5500
}
```

### Output

```css
.modal {
    z-index: 1
}

.modal-overlay {
    z-index: 2
}
```

Note that this module does not attempt to normalize relative z-index values,
such as `-1`; indeed, it will abort immediately when encountering these values
as it cannot be sure that rebasing mixed positive & negative values will keep
the stacking context intact. Be careful with using this module alongside
JavaScript injected CSS; ideally you should have already extracted all of your
stacking context into CSS.

## API

### zindex([options])

#### options

##### startIndex

Type: `number`
Default: `1`

Set this to any other positive integer if you want to override z-indices from
other sources outside your control. For example if a third party widget has a
maximum z-index of `99`, you can set this to `100` and not have to worry about
stacking conflicts.

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](http://beneb.info)

[postcss]: https://github.com/postcss/postcss
