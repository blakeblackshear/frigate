# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [3.2.1](https://github.com/postcss-modules-local-by-default/compare/v3.2.0...v3.2.1)

### Chore

- update `postcss-selector-parser`

## [3.2.0](https://github.com/postcss-modules-local-by-default/compare/v3.1.2...v3.2.0) - 2024-04-03

### Features

- supports multiple composes, i.e. `.class { composes: a b, global(c), d e from "./path/file.css" }`

## [3.1.2](https://github.com/postcss-modules-local-by-default/compare/v3.1.1...v3.1.2) - 2024-04-03

### Fixes

- export a root and limit from the `@scope` at-rule

## [3.1.1](https://github.com/postcss-modules-local-by-default/compare/v3.1.0...v3.1.1) - 2024-01-18

### Fixes

- handle `@scope` at-rule
- fix CSS nesting logic

## [3.1.0](https://github.com/postcss-modules-local-by-default/compare/v3.0.0...v3.1.0) - 2023-12-21

### Fixes

- scoped class attribute

### Features

- pass a node to the `generateExportEntry` option

## [3.0.0](https://github.com/postcss-modules-local-by-default/compare/v3.0.0-rc.2...v3.0.0) - 2020-10-13

### Fixes

- compatibility with plugins other plugins
- handle animation short name
- perf

## [3.0.0-rc.2](https://github.com/postcss-modules-local-by-default/compare/v3.0.0-rc.1...v3.0.0-rc.2) - 2020-10-11

### BREAKING CHANGE

- minimum supported `postcss` version is `^8.1.0`

### Fixes

- minimum supported `Node.js` version is `^10 || ^12 || >= 14`
- compatibility with PostCSS 8

## [3.0.0-rc.1](https://github.com/postcss-modules-local-by-default/compare/v3.0.0-rc.0...v3.0.0-rc.1) - 2020-09-22

### BREAKING CHANGE

- do not handle invalid syntax

## [3.0.0-rc.0](https://github.com/postcss-modules-local-by-default/compare/v2.2.0...v3.0.0-rc.0) - 2020-09-21

### BREAKING CHANGE

- minimum supported `Node.js` version is `>= 10.13.0 || >= 12.13.0 || >= 14`
- minimum supported `postcss` version is `^8.0.3`
- `postcss` was moved to `peerDependencies`, you need to install `postcss` in your project before use the plugin

## 2.2.0 - 2020-03-19

- added the `exportGlobals` option to export global classes and ids

## 2.1.1 - 2019-03-05

### Fixed

- add additional space after the escape sequence (#17)

## [2.1.0] - 2019-03-05

### Fixed

- handles properly selector with escaping characters (like: `.\31 a2b3c { color: red }`)

### Feature

- `generateExportEntry` option (allow to setup key and value for `:export {}` rule)
