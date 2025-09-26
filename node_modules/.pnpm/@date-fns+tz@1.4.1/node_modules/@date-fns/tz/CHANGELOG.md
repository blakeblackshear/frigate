# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning].

This change log follows the format documented in [Keep a CHANGELOG].

[semantic versioning]: http://semver.org/
[keep a changelog]: http://keepachangelog.com/

## v1.4.1 - 2025-08-12

### Fixed

- Fixed incorrect `package.json` published with `@date-fns/tz@1.4.0`.

## v1.4.0 - 2025-08-12

### Added

- [Added support for time zones with seconds offset](https://github.com/date-fns/tz/pull/47). It allows to handle dates before the implementation of the GMT system in 1883. Huge kudos to [@GianlucaWassermeyer](https://github.com/GianlucaWassermeyer)!

## v1.3.1 - 2025-08-01

### Fixed

- Fixed TypeScript definitions missing in `@date-fns@1.3.0`.

## v1.3.0 - 2025-08-01

### Fixed

- Fixed Format.JS support when running in Hermes engine (React Native). Ensured compatibility with JavaScriptCore engine (Safari).

- Fixed TypeScript `node16` module resolution [#59](https://github.com/date-fns/tz/pull/59). Thanks to [@samchungy](https://github.com/samchungy).

### Added

- Added `tzName` function that formats time zone name in given date time and format. It supports `"short"`, `"long"`, `"shortGeneric"`, and `"longGeneric"` formats, corresponding to TR35 tokens `z..zzz`, `zzzz`, `v`, and `vvvv` respectively. See [README](./README.md) for more details.

## v1.2.0 - 2024-10-31

### Fixed

- Fixed issue with `setTime` not syncing the value to the internal date resulting in incorrect behavior [#16](https://github.com/date-fns/tz/issues/16), [#24](https://github.com/date-fns/tz/issues/24).

## v1.1.2 - 2024-09-24

### Fixed

- Improved compatibility with FormatJS Intl polifyll [#8](https://github.com/date-fns/tz/issues/8). Thanks to [@kevin-abiera](https://github.com/kevin-abiera).

## v1.1.1 - 2024-09-23

### Fixed

- Reworked DST handling to fix various bugs and edge cases. There might still be some issues, but I'm actively working on improving test coverage.

## v1.1.0 - 2024-09-22

This is yet another critical bug-fix release. Thank you to all the people who sent PRs and reported their issues. Special thanks to [@huextrat](https://github.com/huextrat), [@allohamora](https://github.com/allohamora) and [@lhermann](https://github.com/lhermann).

### Fixed

- [Fixed negative fractional time zones like `America/St_Johns`](https://github.com/date-fns/tz/pull/7) [@allohamora](https://github.com/allohamora).

- Fixed the DST bug when creating a date in the DST transition hour.

### Added

- Added support for `±HH:MM/±HHMM/±HH` time zone formats for Node.js below v22 (and other environments that has this problem) [#3](https://github.com/date-fns/tz/issues/3)

## v1.0.2 - 2024-09-14

This release fixes a couple of critical bugs in the previous release.

### Fixed

- Fixed UTC setters functions generation.

- Create `Invalid Date` instead of throwing an error on invalid arguments.

- Make all the number getters return `NaN` when the date or time zone is invalid.

- Make `tzOffset` return `NaN` when the date or the time zone is invalid.

## v1.0.1 - 2024-09-13

Initial version

```

```
