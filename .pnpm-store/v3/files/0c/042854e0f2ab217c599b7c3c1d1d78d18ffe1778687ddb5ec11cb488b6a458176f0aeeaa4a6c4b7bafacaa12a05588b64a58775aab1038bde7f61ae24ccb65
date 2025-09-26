remark-emoji
============
[![CI][ci-badge]][ci]
[![npm][npm-badge]][npm]

[remark-emoji][npm] is a [remark](https://github.com/remarkjs/remark) plugin to replace `:emoji:` to real UTF-8
emojis in text. Accessibility support and Emoticon support are optionally available.

## Demo

You can find a demo in the following [Codesandbox](https://codesandbox.io/s/remark-emoji-example-osvyi).

## Usage

```
remark().use(emoji [, options]);
```

```javascript
import {remark} from 'remark';
import emoji from 'remark-emoji';

const doc = 'Emojis in this text will be replaced: :dog: :+1:';
const processor = remark().use(emoji);
const file = await processor.process(doc);

console.log(String(file));
// => Emojis in this text will be replaced: 🐶 👍
```

Note that this package is [ESM only][esm-only] from v3.0.0 since remark packages migrated to ESM.

## Options

### `options.accessible`

Setting to `true` makes the converted emoji text accessible with `role` and `aria-label` attributes. Each emoji
text is wrapped with `<span>` element. Note that `role` attribute is not allowed by default. Please add it to
the sanitization schema used by remark's HTML transformer.

For example,

```javascript
import {remark} from 'remark';
import toHtml from 'remark-html';
import {defaultSchema} from 'hast-util-sanitize'
import emoji from 'remark-emoji';

// Allow using `role` attribute in transformed HTML document
const schema = structuredClone(defaultSchema);
if ('span' in schema.attributes) {
    schema.attributes.span.push('role');
} else {
    schema.attributes.span = ['role'];
}

const processor = remark()
    .use(emoji, { accessible: true })
    .use(toHtml, { sanitize: schema });
const file = await processor.process('Hello :dog:!');
console.log(String(file));
```

yields

```html
Hello <span role="img" aria-label="dog emoji">🐶</span>!
```

Default value is `false`.

### `options.padSpaceAfter`

Setting to `true` means that an extra whitespace is added after emoji.
This is useful when browser handle emojis with half character length and following character is hidden.
Default value is `false`.

### `options.emoticon`

Setting to `true` means that [emoticon](https://www.npmjs.com/package/emoticon) shortcodes are supported (e.g. :-)
will be replaced by 😃). Default value is `false`.

## TypeScript support

remark-emoji package contains [TypeScript](https://www.typescriptlang.org/) type definitions. The package is ready
for use with TypeScript.

Note that the legacy `node` (or `node10`) resolution at [`moduleResolution`](https://www.typescriptlang.org/tsconfig#moduleResolution)
is not available since it enforces CommonJS module resolution and this package is ESM only. Please use `node16`,
`bundler`, or `nodenext` to enable ESM module resolution.

## License

Distributed under [the MIT License](LICENSE).



[ci-badge]: https://github.com/rhysd/remark-emoji/workflows/CI/badge.svg?branch=master&event=push
[ci]: https://github.com/rhysd/remark-emoji/actions?query=workflow%3ACI
[npm-badge]: https://badge.fury.io/js/remark-emoji.svg
[npm]: https://www.npmjs.com/package/remark-emoji
[esm-only]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
