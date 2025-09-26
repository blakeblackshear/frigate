# sort-css-media-queries

![types](https://img.shields.io/badge/types-TypeScript-blue)
![npm](https://img.shields.io/badge/node-6.3.0-yellow.svg)
![license](https://img.shields.io/badge/License-MIT-orange.svg)
![Test](https://github.com/dutchenkoOleg/sort-css-media-queries/workflows/Test/badge.svg)
[![Build Status](https://travis-ci.org/dutchenkoOleg/sort-css-media-queries.svg?branch=master)](https://travis-ci.org/dutchenkoOleg/sort-css-media-queries)

> The custom `sort` method (mobile-first / desktop-first) for [`css-mqpacker`](https://www.npmjs.com/package/css-mqpacker) or [`pleeease`](https://www.npmjs.com/package/pleeease) (which uses css-mqpacker) or, perhaps, something else ))

[![image](https://raw.githubusercontent.com/WezomCompany/code-style/main/assets/code-style-badge-white.svg)](https://github.com/WezomCompany/code-style)


| Statements                                                            | Branches                                                                    | Functions                                                            | Lines                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/statements-95.68%25-brightgreen.svg) | ![Branches](https://img.shields.io/badge/branches-96.48%25-brightgreen.svg) | ![Functions](https://img.shields.io/badge/functions-100%25-brightgreen.svg) | ![Lines](https://img.shields.io/badge/lines-95.68%25-brightgreen.svg) |

---

##  Table of Contents

🇬🇧 English
|
[🇺🇦 Українська](https://github.com/dutchenkoOleg/sort-css-media-queries/blob/master/README-UK.md)

- [Alternative to `mqpacker`](#alternative-to-mqpacker)
- [Available in CSS-in-JS](#available-in-css-in-js-)
- [Installing](#installing)
- [Usage](#usage)
	- [mobile-first](#mobile-first)
	- [desktop-first](#desktop-first)
- [Sort configuration](#sort-configuration)
	- [Configuration options](#configuration-options)
- [Project info](#project-info)

## Alternative to `mqpacker`

https://github.com/hail2u/node-css-mqpacker is deprecated.  
One of the alternative plugins may be - [postcss-sort-media-queries](https://github.com/solversgroup/postcss-sort-media-queries)

## Available in CSS-in-JS 🚀

This package now is a part of the [jss-plugin-sort-css-media-queries](https://www.npmjs.com/package/jss-plugin-sort-css-media-queries)

## Installing

```shell
npm install --save sort-css-media-queries
# or using yarn cli
yarn add sort-css-media-queries
```

## Usage

See the original docs at first https://www.npmjs.com/package/css-mqpacker#sort;

```js

const sortCSSmq = require('sort-css-media-queries');

// your cool code
// ...

postcss([
  mqpacker({
    sort: sortCSSmq
  })
]).process(css);

```

### mobile-first

The plugin will sort your media-queries according to the mobile-first methodology. The sequence of media requests:

1. `min-width` and `min-height`  from smallest to largest,
1. `max-width` and `max-height` from largest to smallest,
1. `min-device-width` and `min-device-height`  from smallest to largest,
1. `max-device-width` and `max-device-height` from largest to smallest
1. media queries without dimension values, for example `print, tv, ...`,
1. at the end:
	- `print`
	- `print and (orientation: landscape)`
	- `print and (orientation: portrait)`

Example

Media-queries list:

```js
// min-width/-height -> from smallest to largest
'screen and (min-width: 320px) and (max-width: 767px)',
'screen and (min-height: 480px)',
'screen and (min-height: 480px) and (min-width: 320px)',
'screen and (min-width: 640px)',
'screen and (min-width: 1024px)',
'screen and (min-width: 1280px)',

// device
'screen and (min-device-width: 320px) and (max-device-width: 767px)',

// max-width/-height <- from largest to smallest
'screen and (max-width: 1023px)',
'screen and (max-height: 767px) and (min-height: 320px)',
'screen and (max-width: 767px) and (min-width: 320px)',
'screen and (max-width: 639px)',

// no units
'screen and (orientation: landscape)',
'screen and (orientation: portrait)',
'print',
'tv'
```

Sort result:

```js
'screen and (min-width: 320px) and (max-width: 767px)',
'screen and (min-height: 480px)',
'screen and (min-height: 480px) and (min-width: 320px)',
'screen and (min-width: 640px)',
'screen and (min-width: 1024px)',
'screen and (min-width: 1280px)',
'screen and (min-device-width: 320px) and (max-device-width: 767px)',
'screen and (max-width: 1023px)',
'screen and (max-height: 767px) and (min-height: 320px)',
'screen and (max-width: 767px) and (min-width: 320px)',
'screen and (max-width: 639px)',
'print',
'screen and (orientation: landscape)',
'screen and (orientation: portrait)',
'tv'
```

### desktop-first

```js
const sortCSSmq = require('sort-css-media-queries');

// your cool code
// ...

postcss([
  mqpacker({
    sort: sortCSSmq.desktopFirst
  })
]).process(css);

```

The plugin will sort your media-queries according to the desktop-first methodology. The sequence of media requests:

1. `max-width` and `max-height` from largest to smallest,
1. `max-device-width` and `max-device-height` from largest to smallest
1. `min-width` and `min-height`  from smallest to largest,
1. `min-device-width` and `min-device-height`  from smallest to largest,
1. media queries without dimension values, `tv, ...`,
1. at the end:
	- `print`
	- `print and (orientation: landscape)`
	- `print and (orientation: portrait)`

---

## Sort configuration

You can import a separate sorting helper from a package
and create your own sorting method with config as needed:

```js
const createSort = require("sort-css-media-queries/lib/create-sort");
const sortCSSmq = createSort({ ...configuration });
```

Or alternatively create a `sort-css-mq.config.json` file in the root of your project.
Or add property `sortCssMQ: {}` in your `package.json`.

By this configuration you can control sorting behaviour.

### Configuration options

#### `unitlessMqAlwaysFirst`

- type: `boolean | undefined`
- default value: `undefined`

---

## Project Info

* [Release notes](https://github.com/dutchenkoOleg/sort-css-media-queries/releases)
* [Contributor Covenant Code of Conduct](https://github.com/dutchenkoOleg/sort-css-media-queries/blob/master/CODE_OF_CONDUCT.md)
* [License MIT](https://github.com/dutchenkoOleg/sort-css-media-queries/blob/master/LICENSE)

