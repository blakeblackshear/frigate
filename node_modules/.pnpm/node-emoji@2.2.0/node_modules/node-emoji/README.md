<h1 align="center">node-emoji</h1>

<p align="center">Friendly emoji lookups and parsing utilities for Node.js. 💖</p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
  <a href="#contributors" target="_blank"><img alt="All Contributors: 32 👪" src="https://img.shields.io/badge/all_contributors-32_👪-21bb42.svg" /></a>
  <!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://codecov.io/gh/JoshuaKGoldberg/node-emoji" target="_blank"><img alt="Codecov Test Coverage" src="https://codecov.io/gh/JoshuaKGoldberg/node-emoji/branch/main/graph/badge.svg"/></a>
	<a href="https://github.com/JoshuaKGoldberg/node-emoji/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="Contributor Covenant" src="https://img.shields.io/badge/code_of_conduct-enforced-21bb42" /></a>
	<a href="https://github.com/JoshuaKGoldberg/node-emoji/blob/main/LICENSE.md" target="_blank"><img alt="License: MIT" src="https://img.shields.io/github/license/JoshuaKGoldberg/node-emoji?color=21bb42"></a>
	<a href="https://github.com/sponsors/omnidan" target="_blank"><img alt="Sponsor: On GitHub" src="https://img.shields.io/badge/sponsor-on_github-21bb42.svg" /></a>
	<img alt="Style: Prettier" src="https://img.shields.io/badge/style-prettier-21bb42.svg" />
	<img alt="TypeScript: Strict" src="https://img.shields.io/badge/typescript-strict-21bb42.svg" />
	<img alt="npm package version" src="https://img.shields.io/npm/v/node-emoji?color=21bb42" />
	<img alt="Contributor Covenant" src="https://img.shields.io/badge/code_of_conduct-enforced-21bb42" />
</p>

`node-emoji` provides a fun, straightforward interface on top of the following excellent libraries:

- [`emojilib`](https://npmjs.org/package/emojilib): provides a list of emojis and keyword search on top of it
- [`skin-tone`](https://npmjs.org/package/skin-tone): parses out base emojis from skin tones

## Install

```sh
npm install node-emoji
```

### 2.0 Release 🚀

This is the new 2.0 release of node-emoji, supporting ESM, new emoji and a new API.

If you want to use the old version, please check out the [legacy branch](https://github.com/omnidan/node-emoji/tree/legacy).

## Usage

```js
import * as emoji from 'node-emoji'

emoji.emojify('I :heart: :coffee:!') // 'I ❤️ ☕️!'

emoji.find('heart') // { emoji: '❤', name: 'heart' }
emoji.find('❤️') // { emoji: '❤', name: 'heart' }

emoji.get('unicorn') // 🦄
emoji.get(':unicorn:') // 🦄

emoji.has(':pizza:') // true
emoji.has('🍕') // true
emoji.has('unknown') // false

emoji.random() // { name: 'house', emoji: '🏠' }

emoji.replace('I ❤️ coffee!', 'love', { preserveSpaces: true }) // 'I love coffee!'

emoji.search(':uni:') // [ { emoji: '🦄', name: 'unicorn' }, ... ]

emoji.strip('I ❤️ coffee!') // 'I coffee!'

emoji.unemojify('🍕 for 💃') // ':pizza: for :dancer:'

emoji.which('🦄') // 'unicorn'
```

## API

### emoji.emojify(input, options?)

Parse all markdown-encoded emojis in a string.

Parameters:

1. **`input`** (`string`): The input string containing the markdown-encoding emojis.
1. **`options`** _(optional)_:
   - **`fallback`** (`string`; default: `""`): The string to fallback to if an emoji was not found.
   - **`format`** (`() => (emoji: string, part: string, string: string) => string`; default: `value => value`): Add a middleware layer to modify each matched emoji after parsing.

```js
import * as emoji from 'node-emoji'

console.log(emoji.emojify('The :unicorn: is a fictitious animal.'))
// 'The 🦄 is a fictitious animal.'
```

### emoji.find(emoji)

Get the name and character of an emoji.

Parameters:

1. **`emoji`** (`string`): The emoji to get the data of.

```js
import * as emoji from 'node-emoji'

console.log(emoji.find('🦄'))
// { name: 'unicorn', emoji: '🦄' }
```

### emoji.get(name)

Get an emoji from an emoji name.

Parameters:

1. **`name`** (`string`): The name of the emoji to get.

```js
import * as emoji from 'node-emoji'

console.log(emoji.get('unicorn'))
// '🦄'
```

### emoji.has(emoji)

Check if this library supports a specific emoji.

Parameters:

1. **`emoji`** (`string`): The emoji to check.

```js
import * as emoji from 'node-emoji'

console.log(emoji.has('🦄'))
// true
```

### emoji.random()

Get a random emoji.

```js
import * as emoji from 'node-emoji'

console.log(emoji.random())
// { name: 'unicorn', emoji: '🦄' }
```

### emoji.replace(input, replacement)

Replace the emojis in a string.

Parameters:

- **`input`** (`string`): The input string.
- **`replacement`** (`string | (emoji: string, index: number, string: string) => string`): The character to replace the emoji with.
  Can be either a string or a callback that returns a string.

```js
import * as emoji from 'node-emoji'

console.log(emoji.replace('The 🦄 is a fictitious animal.', 'unicorn'))
// 'The unicorn is a fictitious animal.'
```

### emoji.search(keyword)

Search for emojis containing the provided name in their name.

Parameters:

1. **`keyword`** (`string`): The keyword to search for.

```js
import * as emoji from 'node-emoji'

console.log(emoji.search('honey'))
// [ { name: 'honeybee', emoji: '🐝' }, { name: 'honey_pot', emoji: '🍯' } ]
```

### emoji.strip(input, options?)

Remove all of the emojis from a string.

Parameters:

1. **`input`** (`string`): The input string to strip the emojis from.
1. **`options`** _(optional)_:

   - **`preserveSpaces`** (`boolean`): Whether to keep the extra space after a stripped emoji.

```js
import * as emoji from 'node-emoji'

console.log(emoji.strip('🦄 The unicorn is a fictitious animal.'))
// 'The unicorn is a fictitious animal.'

console.log(
  emoji.strip('🦄 The unicorn is a fictitious animal.', {
    preserveSpaces: true,
  }),
)
// ' The unicorn is a fictitious animal.'
```

### emoji.unemojify(input)

Convert all emojis in a string to their markdown-encoded counterparts.

Parameters:

1. **`input`** (`string`): The input string containing the emojis.

```js
import * as emoji from 'node-emoji'

console.log(emoji.unemojify('The 🦄 is a fictitious animal.'))
// 'The :unicorn: is a fictitious animal.'
```

### emoji.which(emoji, options?)

Get an emoji name from an emoji.

Parameters:

1. **`emoji`** (`string`): The emoji to get the name of.
1. **`options`** _(optional)_:
   - **`markdown`** (`boolean`; default: `false`): Whether to return a `":emoji:"` string instead of `"emoji"`

```js
import * as emoji from 'node-emoji'

console.log(emoji.which('🦄'))
// 'unicorn'
```

## Development

See _[`.github/Development.md`](./github/Development.md)_.

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fomnidan%2Fnode-emoji.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fomnidan%2Fnode-emoji?ref=badge_large)

### Special Thanks

...to Anand Chowdhary (@AnandChowdhary) and his company [Pabio](https://github.com/pabio) for sponsoring this project via [GitHub Sponsors](https://github.com/sponsors/omnidan)!

## Contributors

<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/cagataycali/"><img src="https://avatars.githubusercontent.com/u/9213230?v=4?s=100" width="100px;" alt="./c²"/><br /><sub><b>./c²</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=cagataycali" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/askoufis"><img src="https://avatars.githubusercontent.com/u/5663042?v=4?s=100" width="100px;" alt="Adam Skoufis"/><br /><sub><b>Adam Skoufis</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=askoufis" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://adriancarolli.surge.sh/"><img src="https://avatars.githubusercontent.com/u/3059371?v=4?s=100" width="100px;" alt="Adrian Carolli"/><br /><sub><b>Adrian Carolli</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=watadarkstar" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alexlitel"><img src="https://avatars.githubusercontent.com/u/12000084?v=4?s=100" width="100px;" alt="Alex Litel"/><br /><sub><b>Alex Litel</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=alexlitel" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://alex-rudenko.com/"><img src="https://avatars.githubusercontent.com/u/399150?v=4?s=100" width="100px;" alt="Alex Rudenko"/><br /><sub><b>Alex Rudenko</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=OrKoN" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ahanriat"><img src="https://avatars.githubusercontent.com/u/1374161?v=4?s=100" width="100px;" alt="Antoine Hanriat"/><br /><sub><b>Antoine Hanriat</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=ahanriat" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://omnidan.net/"><img src="https://avatars.githubusercontent.com/u/668674?v=4?s=100" width="100px;" alt="Daniel Bugl"/><br /><sub><b>Daniel Bugl</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/issues?q=author%3Aomnidan" title="Bug reports">🐛</a> <a href="https://github.com/omnidan/node-emoji/commits?author=omnidan" title="Code">💻</a> <a href="#fundingFinding-omnidan" title="Funding Finding">🔍</a> <a href="#ideas-omnidan" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-omnidan" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#tool-omnidan" title="Tools">🔧</a> <a href="#maintenance-omnidan" title="Maintenance">🚧</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DanielHilton"><img src="https://avatars.githubusercontent.com/u/28859662?v=4?s=100" width="100px;" alt="Daniel Hilton"/><br /><sub><b>Daniel Hilton</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=DanielHilton" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/emctackett"><img src="https://avatars.githubusercontent.com/u/19399698?v=4?s=100" width="100px;" alt="Elizabeth"/><br /><sub><b>Elizabeth</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=emctackett" title="Code">💻</a> <a href="#maintenance-emctackett" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.gabrielcsapo.com/"><img src="https://avatars.githubusercontent.com/u/1854811?v=4?s=100" width="100px;" alt="Gabriel Csapo"/><br /><sub><b>Gabriel Csapo</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=gabrielcsapo" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://greenkeeper.io/"><img src="https://avatars.githubusercontent.com/u/14790466?v=4?s=100" width="100px;" alt="Greenkeeper"/><br /><sub><b>Greenkeeper</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=greenkeeperio-bot" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.joshuakgoldberg.com/"><img src="https://avatars.githubusercontent.com/u/3335181?v=4?s=100" width="100px;" alt="Josh Goldberg ✨"/><br /><sub><b>Josh Goldberg ✨</b></sub></a><br /><a href="#tool-JoshuaKGoldberg" title="Tools">🔧</a> <a href="https://github.com/omnidan/node-emoji/commits?author=JoshuaKGoldberg" title="Code">💻</a> <a href="#infra-JoshuaKGoldberg" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-JoshuaKGoldberg" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://cooperka.com/"><img src="https://avatars.githubusercontent.com/u/2047062?v=4?s=100" width="100px;" alt="Kevin Cooper"/><br /><sub><b>Kevin Cooper</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=cooperka" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/merceyz"><img src="https://avatars.githubusercontent.com/u/3842800?v=4?s=100" width="100px;" alt="Kristoffer K."/><br /><sub><b>Kristoffer K.</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=merceyz" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ludorenzetti"><img src="https://avatars.githubusercontent.com/u/8739517?v=4?s=100" width="100px;" alt="Ludo Renzetti"/><br /><sub><b>Ludo Renzetti</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=ludorenzetti" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://charpeni.com/"><img src="https://avatars.githubusercontent.com/u/7189823?v=4?s=100" width="100px;" alt="Nicolas Charpentier"/><br /><sub><b>Nicolas Charpentier</b></sub></a><br /><a href="#maintenance-charpeni" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://ngryman.sh/"><img src="https://avatars.githubusercontent.com/u/892048?v=4?s=100" width="100px;" alt="Nicolas Gryman"/><br /><sub><b>Nicolas Gryman</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=ngryman" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/HistoireDeBabar"><img src="https://avatars.githubusercontent.com/u/6544057?v=4?s=100" width="100px;" alt="Paul Barber"/><br /><sub><b>Paul Barber</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=HistoireDeBabar" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://richienb.github.io/"><img src="https://avatars.githubusercontent.com/u/29491356?v=4?s=100" width="100px;" alt="Richie Bendall"/><br /><sub><b>Richie Bendall</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=Richienb" title="Code">💻</a> <a href="#maintenance-Richienb" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://thetechinfinite.com/"><img src="https://avatars.githubusercontent.com/u/47841501?v=4?s=100" width="100px;" alt="Ritik Banger"/><br /><sub><b>Ritik Banger</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=ritikbanger" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://roopakv.com/"><img src="https://avatars.githubusercontent.com/u/678239?v=4?s=100" width="100px;" alt="Roopak Venkatakrishnan"/><br /><sub><b>Roopak Venkatakrishnan</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=roopakv" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://shivkanth.com/"><img src="https://avatars.githubusercontent.com/u/3232159?v=4?s=100" width="100px;" alt="Shivkanth Bagavathy"/><br /><sub><b>Shivkanth Bagavathy</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=shivkanthb" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://siddharthbatra.com/"><img src="https://avatars.githubusercontent.com/u/622674?v=4?s=100" width="100px;" alt="Siddharth Batra"/><br /><sub><b>Siddharth Batra</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=sidbatra" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/smeijer"><img src="https://avatars.githubusercontent.com/u/1196524?v=4?s=100" width="100px;" alt="Stephan Meijer"/><br /><sub><b>Stephan Meijer</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=smeijer" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Thomas101"><img src="https://avatars.githubusercontent.com/u/103586?v=4?s=100" width="100px;" alt="Thomas Beverley"/><br /><sub><b>Thomas Beverley</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/issues?q=author%3AThomas101" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://timr.co/"><img src="https://avatars.githubusercontent.com/u/249800?v=4?s=100" width="100px;" alt="Tim Ruffles"/><br /><sub><b>Tim Ruffles</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=timruffles" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://toddmazierski.com/"><img src="https://avatars.githubusercontent.com/u/544541?v=4?s=100" width="100px;" alt="Todd Mazierski"/><br /><sub><b>Todd Mazierski</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/issues?q=author%3Atoddmazierski" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://fossa.com/"><img src="https://avatars.githubusercontent.com/u/29791463?v=4?s=100" width="100px;" alt="fossabot"/><br /><sub><b>fossabot</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=fossabot" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/goodjun"><img src="https://avatars.githubusercontent.com/u/18377597?v=4?s=100" width="100px;" alt="goodjun"/><br /><sub><b>goodjun</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/issues?q=author%3Agoodjun" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://jackieluo.com/"><img src="https://avatars.githubusercontent.com/u/8452682?v=4?s=100" width="100px;" alt="jackie luo"/><br /><sub><b>jackie luo</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=jackiehluo" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tgbtyty"><img src="https://avatars.githubusercontent.com/u/10119245?v=4?s=100" width="100px;" alt="tgbtyty"/><br /><sub><b>tgbtyty</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=tgbtyty" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wtgtybhertgeghgtwtg"><img src="https://avatars.githubusercontent.com/u/18507762?v=4?s=100" width="100px;" alt="wtgtybhertgeghgtwtg"/><br /><sub><b>wtgtybhertgeghgtwtg</b></sub></a><br /><a href="https://github.com/omnidan/node-emoji/commits?author=wtgtybhertgeghgtwtg" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->
