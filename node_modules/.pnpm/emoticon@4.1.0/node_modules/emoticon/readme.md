# emoticon

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]

List of emoticons.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`emoticon`](#emoticon-1)
* [List of emoticons](#list-of-emoticons)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package contains info on ASCII emoticons.
:p

## When should I use this?

You can use this package for several reasons, typically in a build script,
for example to figure out which text emoticons map to what emoji.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 14.14+), install with [npm][npm-install]:

```sh
npm install emoticon
```

In Deno with [`esm.sh`][esm-sh]:

```js
import {emoticon} from 'https://esm.sh/emoticon@4'
```

In browsers with [`esm.sh`][esm-sh]:

```html
<script type="module">
  import {emoticon} from 'https://esm.sh/emoticon@4?bundle'
</script>
```

## Use

```js
import {emoticon} from 'emoticon'

console.log(emoticon.slice(0, 3))
```

Yields:

```js
[
  {
    description: 'angry face',
    emoji: '😠',
    emoticons: [
      '>:(',  '>:[',
      '>:-(', '>:-[',
      '>=(',  '>=[',
      '>=-(', '>=-['
    ],
    name: 'angry',
    tags: [ 'mad', 'annoyed' ]
  },
  {
    description: 'smiling face with smiling eyes',
    emoji: '😊',
    emoticons: [
      ':")',  ':"]',  ':"D',
      ':-")', ':-"]', ':-"D',
      '=")',  '="]',  '="D',
      '=-")', '=-"]', '=-"D'
    ],
    name: 'blush',
    tags: [ 'proud' ]
  },
  {
    description: 'broken heart',
    emoji: '💔',
    emoticons: [ '<\\3', '</3' ],
    name: 'broken_heart',
    tags: []
  }
]
```

## API

This package exports the identifier `emoticon`.
There is no default export.

### `emoticon`

List of emoticons (`Array<Emoticon>`), where each entry has the following
fields:

* `description` (`string`)
  — associated description (from [`wooorm/gemoji`][github-gemoji])
* `emoji` (`string`)
  — corresponding emoji
* `emoticons` (`Array<string>`)
  — ASCII emoticons
* `name` (`string`)
  — name of an emoticon (preferred name from [`wooorm/gemoji`][github-gemoji])
* `tags` (`Array<string>`)
  — associated tags (from [`wooorm/gemoji`][github-gemoji])

## List of emoticons

See [`support.md`][file-support].

## Types

This package is fully typed with [TypeScript][].
It exports an additional type `Emoticon`.

## Compatibility

This package is at least compatible with all maintained versions of Node.js.
As of now, that is Node.js 14.14+.
It also works in Deno and modern browsers.

## Security

This package is safe.

## Related

* [`wooorm/gemoji`][github-gemoji]
  — info on gemoji (GitHub emoji)
* [`words/emoji-emotion`](https://github.com/words/emoji-emotion)
  — list of emoji rated for valence
* [`wooorm/emoticon`](https://github.com/wooorm/emoticon)
  — info on ASCII emoticons
* [`wooorm/strip-skin-tone`](https://github.com/wooorm/strip-skin-tone)
  — strip skin-tones from emoji
* [`wooorm.com/checkmoji`](https://wooorm.com/checkmoji/)
  — check emoji across platforms

## Contribute

Yes please!
See [How to Contribute to Open Source][open-source-guide-contribute].

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[badge-build-image]: https://github.com/wooorm/emoticon/workflows/main/badge.svg

[badge-build-url]: https://github.com/wooorm/emoticon/actions

[badge-coverage-image]: https://img.shields.io/codecov/c/github/wooorm/emoticon.svg

[badge-coverage-url]: https://codecov.io/github/wooorm/emoticon

[badge-downloads-image]: https://img.shields.io/npm/dm/emoticon.svg

[badge-downloads-url]: https://www.npmjs.com/package/emoticon

[badge-size-image]: https://img.shields.io/bundlejs/size/emoticon

[badge-size-url]: https://bundlejs.com/?q=emoticon

[esm-sh]: https://esm.sh

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[file-license]: license

[file-support]: support.md

[npm-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com

[github-gemoji]: https://github.com/wooorm/gemoji

[open-source-guide-contribute]: https://opensource.guide/how-to-contribute/
