# RTLCSS Changelog

## 4.3.0 - 27 Aug. 2024

- Return an error code when the parsed CSS `stdin` is invalid. **Thanks @lade-odoo**


## 4.2.0 - 24 Jul. 2024

- Add support for eight-value hex colors.

## 4.1.1 - 18 Sep. 2023

- Update mirroring `transform` to safeguard functions inside values.
- Internal code refactoring. **Thanks @XhmikosR**

## 4.1.0 - 11 Apr. 2023

- Update dependencies. **Thanks @XhmikosR**
- Update mirroring `transform-origin` to not flip `y-offset` when `x-offset` is `center`. **Thanks @skmanohar**
- Return an error code when the parssed CSS file is invalid. **Thanks @HANNICHE-Walid**

## 4.0.0 - 09 Aug. 2022

- Update dependencies, Internal code refactoring, cleanup and optimizations. **Thanks @XhmikosR**
- Support flipping `justify-content`, `justify-items` and `justify-self`. **Thanks @mbehzad**
- Support flipping length position without using `calc`.

## 3.5.0 - 02 Nov. 2021

- Update dependencies. **Thanks @XhmikosR**
- Internal code cleanup/formatting. **Thanks @XhmikosR**

## 3.4.0 - 18 Oct. 2021

- Support flipping `object-position`.
- Update devDependencies.

## 3.3.0 - 08 Jul. 2021

- Add `processEnv` option to support flipping agent-defined environment variables (`safe-area-inset-left`, `safe-area-inset-right`).

## 3.2.1 - 22 Jun. 2021

- Bump [glob-parent](https://github.com/gulpjs/glob-parent) from 5.1.1 to 5.1.2.

## 3.2.0 - 23 May. 2021

- Add `aliases` option to support processing Custom Properties (CSS Variables). **Thanks @elchininet**

## 3.1.2 - 04 Feb. 2021

- Update `README.md`.

## 3.1.1 - 02 Feb. 2021

- Fixes `TypeError` when placing value directive before `!important`. [#218](https://github.com/MohammadYounes/rtlcss/issues/218)

## 3.1.0 - 30 Jan. 2021

- Use `strict` mode across all files. **Thanks @XhmikosR**
- Decrease package size by around 6%. **Thanks @XhmikosR**
- Add guards against prototype pollution. **Thanks @XhmikosR**
- Allow value directives to be placed any where inside the declaration value.
- Handle value directives placed after `!important`.
- Fix reading config file sources ([#209](https://github.com/MohammadYounes/rtlcss/issues/209)).

## 3.0.0 - 10 Dec. 2020

- Upgrade to [postcss] 8.
- Dropped **Node.js 6.x, 8.x, 11.x, and 13.x** versions.

## 2.6.2 - 01 Dec. 2020

- Set input source to same file in raw directive ([#180](https://github.com/MohammadYounes/rtlcss/issues/180)).

## 2.6.1 - 15 Oct. 2020

- Remove colors dependency from findup ([#177](https://github.com/MohammadYounes/rtlcss/pull/177)).

## 2.6.0 - 15 Aug. 2020

- Support flipping `perspective-origin` ([#167](https://github.com/MohammadYounes/rtlcss/pull/167)).
- CLI: Fix empty output when `--silent` and `--stdin` flags are used together (Fixes [#169](https://github.com/MohammadYounes/rtlcss/issues/169)).
- Enable flipping `rotateY`.
- Fix flipping `rotate3d`.

## 2.5.0 - 08 Feb. 2020

- `useCalc` to flip unit based `transform-origin`.
- CLI: use `console.log` instead of the [deprecated](https://nodejs.org/docs/latest-v10.x/api/util.html#util_util_print_strings) `util.print`(issue #156).

## 2.4.1 - 28 Nov. 2019

- Ignore white spaces before directives prefix.

## 2.4.0 - 20 Jun. 2018

- New Option:
  - `useCalc` (default: `false`) to flip unit based `background-position` using `calc`. **Thanks @zoreet**

## 2.3.0 - 9 Jun. 2018

- Skip processing CSS variables. **Thanks @danfooo**

## 2.2.1 - 9 Nov. 2017

- Fixes a bug in flipping `background-position` having keywords only (Fixes [#107](https://github.com/MohammadYounes/rtlcss/issues/107)).

## 2.2.0 - 7 Jun. 2017

- Support for pre/post hooks.
- Upgrade to [postcss] v6.x

## 2.1.2 - 31 Dec. 2016

- Internal code update.

## 2.1.1 - 28 Dec. 2016

- Fixes a bug in self-closing ignore directive (Fixes [#88](https://github.com/MohammadYounes/rtlcss/issues/88)).

## 2.1.0 - 30 Nov. 2016

- Support CSS `background-position` edge offsets.

## 2.0.7 - 16 Nov. 2016

- Fixes a bug in flipping backgrounds having URL placed first (Fixes [#84](https://github.com/MohammadYounes/rtlcss/issues/84)).
- Update `node.value` so changes will be picked up by other processors (Closes [#85](https://github.com/MohammadYounes/rtlcss/issues/85)).

## 2.0.6 - 12 Jul. 2016

- README updates.

## 2.0.5 - 17 May. 2016

- Fixes a bug in complementing `calc` values (Fixes [#71](https://github.com/MohammadYounes/rtlcss/issues/71)).

## 2.0.4 - 25 Apr. 2016

- Fixes a bug in flipping cursor value (Fixes [#68](https://github.com/MohammadYounes/rtlcss/issues/68)).

## 2.0.3 - 23 Mar. 2016

- Guard against flipping tokens, e.g: [shadows starting with a color function](https://github.com/MohammadYounes/rtlcss/blob/master/test/data/special.js#L2-L7).

## 2.0.2 - 05 Mar. 2016

- Fixes a bug in flipping background with a hex color value (Fixes [#60](https://github.com/MohammadYounes/rtlcss/issues/60)).

## 2.0.1 - 23 Feb. 2016

- Fixes a bug when having `decl` nodes inside `atrule`s and `autoRename` enabled.
- Fixes a bug in flipping multi-valued transforms.

## 2.0.0 - 18 Feb. 2016

- Support for control directive blocks, e.g. `/*rtl:begin:ignore*/ ... /*rtl:end:ignore*/`.
- Support for strict auto renaming, which ensures `autoRename` is applied only when a pair exists.
- New directives:
  - `config`
  - `options`
  - `raw`
  - `remove`
- Support for [Plugins](docs/writing-a-plugin.md).

### Upgrading from version 1.0

Options and config settings have changed. However, you need not to worry about your CSS files as all directives are backward-compatible. This is a summary of what's changed:

- New Options:

  - `autoRenameStrict` (default: `false`) to apply auto rename only when a pair exists.
  - `blacklist` to prevent execution of certain directives.
  - `clean` (default: `true`), to remove directives from output CSS.
  - `processUrls` (default: `false`) to control URL updates. You can also target specific node types using an object literal. e.g. `{'atrule': true, 'decl': false}`.

- Updated Options:

  - `autoRename` new default is `false`.
  - `stringMap`:
    - added `priority` attribute to control maps execution order.
    - added `exclusive` attribute, which determines if a map execution should stop iterating over other maps.
    - dropped `'west-east'` map from the default map collection.

- Removed Options:

  - `enableLogging`, still warnings and errors are reported directly to postcss.
  - `minify`, it wasn't actual minification after all!
  - `swapLeftRightInUrl`, `swapLtrRtlInUrl` and `swapWestEastInUrl` in favor of `processUrls` option.
  - `preserveComments`, comments inside declaration values will always be preserved.
  - `preserveDirectives`, in favor of `clean` option.

- Constructor arguments `rules`, `declarations` and `properties` are now replaced with `plugins`.

## v1.7.4 - 23 Feb. 2016

- Fixes a bug in flipping multiple transforms.

## v1.7.3 - 30 Jan. 2016

- Fixes a bug in flipping N-Values containing comments.

## 1.7.2 - 30 Jan. 2016

- Fixes a bug in flipping N-Values containing comments.

## 1.7.2 - 04 Dec. 2015

- Fixes a compatibility issue with postcss-js (Fixes [#48](https://github.com/MohammadYounes/rtlcss/issues/48)).

## 1.7.1 - 10 Nov. 2015

- Fixed a bug in flipping backgrounds having functions (Issue [#45](https://github.com/MohammadYounes/rtlcss/issues/45)).

## 1.7.0 - 19 Sep. 2015

- Add `calc` support.
- Mark rule as flipped when values are updated by decl. directives.
- Allow further processing for rules that uses `rename` directive.

## 1.6.3 - 28 Aug. 2015

- CLI: fix source map option (issue #40).
- Upgrade to [postcss] v5.0.x

## 1.6.2 - 21 Jul. 2015

- CLI: fix loading custom configuration file manually via the --config flag. **Thanks @KeyKaKiTO**

## 1.6.1 - 17 Mar. 2015

- Fixed flipping units having more than 1 digit before the decimal point.

## 1.6.0 - 15 Mar. 2015

- Support flipping `matrix3d` transform.

## 1.5.2 - 28 Feb. 2015

- Fix flipping string maps containing regular expressions special characters (Fixes [#24](https://github.com/MohammadYounes/rtlcss/issues/24)).

## 1.5.1 - 14 Feb. 2015

- Fix flipping multiple shadows when a hex color was used. **Thanks @ocean90**

## 1.5.0 - 30 Jan. 2015

- CLI: New option `-e,--ext` to set output files extension when processing a directory.

## 1.4.3 - 24 Jan. 2015

- Upgrade to [postcss] v4.0.x **Thanks @necolas**

## 1.4.2 - 24 Oct. 2014

- CLI: Switch to Unix line endings (Fixes [#14](https://github.com/MohammadYounes/rtlcss/issues/14))

## 1.4.1 - 24 Oct. 2014

- CLI: Print processing errors.

## 1.4.0 - 10 Oct. 2014

- CLI: Support processing a directory. See [CLI documentation](https://github.com/MohammadYounes/rtlcss/blob/master/docs/CLI.md).

## 1.3.1 - 29 Sep. 2014

- Update README.md (typos).

## 1.3.0 - 28 Sep. 2014

- New feature - String Maps. Add your own set of swappable strings, for example (prev/next).
- Preserves lowercase, UPPERCASE and Capitalization when swapping **_left_**, **_right_**, **_ltr_**, **_rtl_**, **_west_** and **_east_**.

## 1.2.0 - 26 Sep. 2014

- Support !important comments for directives (enables flipping minified stylesheets).

## 1.1.0 - 26 Sep. 2014

- Upgrade to [postcss] v2.2.5
- Support flipping `border-color`, `border-style` and `background-position-x`

## 1.0.0 - 24 Aug. 2014

- Upgrade to [postcss] v2.2.1
- Support flipping urls in `@import` rule.
- Fix JSON parse error when configuration file is UTF-8 encoded.
- Better minification.

## 0.9.0 - 10 Aug. 2014

- New configuration loader.
- CLI configuration can be set using one of the following methods:
  - Specify the configuration file manually via the --config flag.
  - Put your config into your projects package.json file under the `rtlcssConfig` property
  - Use a special file `.rtlcssrc` or `.rtlcssrc.json`

## 0.8.0 - 8 Aug. 2014

- Fix source map generation.

## 0.7.0 - 4 Jul. 2014

- Fix flipping linear-gradient.

## 0.6.0 - 4 Jul. 2014

- Allow additional comments inside `ignore`/`rename` rule level directives.

## 0.5.0 - 11 Jun. 2014

- Add CLI support.

## 0.4.0 - 5 Apr. 2014

- Fix flipping transform-origin.
- Update `autoRename` to search for all swappable words.

## 0.3.0 - 5 Apr. 2014

- Support flipping `rotateZ`.
- Fix flipping `rotate3d`.
- Fix flipping `skew`, `skewX` and `skewY`.
- Fix flipping `cursor` value.
- Fix flipping `translate3d`.
- Update flipping background horizontal position to treat `0` as `0%`

## 0.2.1 - 20 Mar. 2014

- Upgrade to [postcss] v0.3.4

## 0.2.0 - 20 Mar. 2014

- Support combining with other processors.
- Support rad, grad & turn angle units when flipping linear-gradient
- Fix typo in config.js

## 0.1.3 - 7 Mar. 2014

- Fix missing include in rules.js

## 0.1.2 - 5 Mar. 2014

- New option: minify output CSS.
- Updated README.md

## 0.1.1 - 4 Mar. 2014

- Initial commit.

[postcss]: https://postcss.org/
