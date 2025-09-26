# micromark-util-events-to-acorn

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][opencollective]
[![Backers][backers-badge]][opencollective]
[![Chat][chat-badge]][chat]

[micromark][] utility to try and parse events with acorn.

## Contents

* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`eventsToAcorn(events, options)`](#eventstoacornevents-options)
  * [`Options`](#options)
  * [`Result`](#result)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install micromark-util-events-to-acorn
```

In Deno with [`esm.sh`][esmsh]:

```js
import {eventsToAcorn} from 'https://esm.sh/micromark-util-events-to-acorn@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {eventsToAcorn} from 'https://esm.sh/micromark-util-events-to-acorn@2?bundle'
</script>
```

## Use

```js
import {eventsToAcorn} from 'micromark-util-events-to-acorn'

// A factory that uses the utility:
/** @type {Tokenizer} */
function factoryMdxExpression(effects, ok, nok) {
  return start

  // …

    // …

    // Gnostic mode: parse w/ acorn.
    const result = eventsToAcorn(this.events.slice(eventStart), {
      acorn,
      acornOptions,
      start: pointStart,
      expression: true,
      allowEmpty,
      prefix: spread ? '({' : '',
      suffix: spread ? '})' : ''
    })

    // …

  // …
}
```

## API

This module exports the identifier [`eventsToAcorn`][api-events-to-acorn].
There is no default export.

The export map supports the [`development` condition][development].
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition, production code is loaded.

### `eventsToAcorn(events, options)`

###### Parameters

* `events` (`Array<Event>`)
  — events
* `options` ([`Options`][api-options])
  — configuration (required)

###### Returns

Result ([`Result`][api-result]).

### `Options`

Configuration (TypeScript type).

###### Fields

* `acorn` ([`Acorn`][acorn], required)
  — typically `acorn`, object with `parse` and `parseExpressionAt` fields
* `tokenTypes` (`Array<TokenType>`], required)
  — names of (void) tokens to consider as data; `'lineEnding'` is always
  included
* `acornOptions` ([`AcornOptions`][acorn-options], optional)
  — configuration for `acorn`
* `start` (`Point`, optional, required if `allowEmpty`)
  — place where events start
* `prefix` (`string`, default: `''`)
  — text to place before events
* `suffix` (`string`, default: `''`)
  — text to place after events
* `expression` (`boolean`, default: `false`)
  — whether this is a program or expression
* `allowEmpty` (`boolean`, default: `false`)
  — whether an empty expression is allowed (programs are always allowed to be
  empty)

### `Result`

Result (TypeScript type).

###### Fields

* `estree` ([`Program`][program] or `undefined`)
  — Program
* `error` (`Error` or `undefined`)
  — error if unparseable
* `swallow` (`boolean`)
  — whether the error, if there is one, can be swallowed and more JavaScript
  could be valid

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`Acorn`][acorn],
[`AcornOptions`][acorn-options], [`Options`][api-options], and
[`Result`][api-result].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`micromark-util-events-to-acorn@^2`, compatible with Node.js 16.

This package works with `micromark` version `3` and later.

## Security

This package is safe.

## Contribute

See [`contributing.md`][contributing] in [`micromark/.github`][health] for ways
to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organisation, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[acorn]: https://github.com/acornjs/acorn

[acorn-options]: https://github.com/acornjs/acorn/blob/96c721dbf89d0ccc3a8c7f39e69ef2a6a3c04dfa/acorn/dist/acorn.d.ts#L16

[api-events-to-acorn]: #eventstoacornevents-options

[api-options]: #options

[api-result]: #result

[author]: https://wooorm.com

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/micromark/micromark-extension-mdx-expression/actions

[build-badge]: https://github.com/micromark/micromark-extension-mdx-expression/workflows/main/badge.svg

[chat]: https://github.com/micromark/micromark/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[coverage]: https://codecov.io/github/micromark/micromark-extension-mdx-expression

[coverage-badge]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-mdx-expression.svg

[development]: https://nodejs.org/api/packages.html#packages_resolving_user_conditions

[downloads]: https://www.npmjs.com/package/micromark-util-events-to-acorn

[downloads-badge]: https://img.shields.io/npm/dm/micromark-util-events-to-acorn.svg

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[health]: https://github.com/micromark/.github

[license]: https://github.com/micromark/micromark-extension-mdx-expression/blob/main/license

[micromark]: https://github.com/micromark/micromark

[npm]: https://docs.npmjs.com/cli/install

[opencollective]: https://opencollective.com/unified

[program]: https://github.com/estree/estree/blob/master/es2015.md#programs

[size]: https://bundlejs.com/?q=micromark-util-events-to-acorn

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=micromark-util-events-to-acorn

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[support]: https://github.com/micromark/.github/blob/main/support.md

[typescript]: https://www.typescriptlang.org
