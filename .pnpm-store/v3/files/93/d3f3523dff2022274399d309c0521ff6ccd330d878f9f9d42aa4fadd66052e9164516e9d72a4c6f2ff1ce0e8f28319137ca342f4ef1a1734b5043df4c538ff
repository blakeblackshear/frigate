# [postcss][postcss]-discard-unused

> Discard unused counter styles, keyframes and fonts.


## Install

With [npm](https://npmjs.org/package/postcss-discard-unused) do:

```
npm install postcss-discard-unused --save
```


## Example

This module will discard unused at rules in your CSS file, if it cannot find
any selectors that make use of them. It works on `@counter-style`, `@keyframes`
and `@font-face`.

### Input

```css
@counter-style custom {
    system: extends decimal;
    suffix: "> "
}

@counter-style custom2 {
    system: extends decimal;
    suffix: "| "
}

a {
    list-style: custom
}
```

### Output

```css
@counter-style custom {
    system: extends decimal;
    suffix: "> "
}

a {
    list-style: custom
}
```

Note that this plugin is not responsible for normalising font families, as it
makes the assumption that you will write your font names consistently, such that
it considers these two declarations differently:

```css
h1 {
    font-family: "Helvetica Neue"
}

h2 {
    font-family: Helvetica Neue
}
```

However, you can mitigate this by including [postcss-minify-font-values][mfv]
*before* this plugin, which will take care of normalising quotes, and
deduplicating. For more examples, see the [tests](src/__tests__/index.js).


## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.


## API

### discardUnused([options])

#### options

##### fontFace

Type: `boolean`  
Default: `true`

Pass `false` to disable discarding unused font face rules.

##### counterStyle

Type: `boolean`  
Default: `true`

Pass `false` to disable discarding unused counter style rules.

##### keyframes

Type: `boolean`  
Default: `true`

Pass `false` to disable discarding unused keyframe rules.

##### namespace

Type: `boolean`  
Default: `true`

Pass `false` to disable discarding unused namespace rules.


## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](http://beneb.info)


[postcss]: https://github.com/postcss/postcss
[mfv]:     https://github.com/trysound/postcss-minify-font-values
